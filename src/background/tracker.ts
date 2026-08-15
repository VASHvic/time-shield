import { CONSTANTS } from '@/utils/constants';
import type { StorageService } from '@/utils/storage';
import { getUsageKeys } from '@/utils/storage';
import { formatDateISO, getCurrentDate, getElapsedSeconds } from '@/utils/time';

type TrackerStorage = Pick<StorageService, 'get' | 'set'>;

export type DayChangeHandler = () => void | Promise<void>;

export interface PersistedSession {
  site: string | null;
  activeSinceTs: number | null;
}

export function getRemainingTimer(remaining: number, max: number, dayChanged: boolean): number {
  return dayChanged ? max : Math.min(remaining, max);
}

/**
 * Time tracking engine: a single shared daily budget + wall-clock accounting,
 * storage-backed. Chrome-API free, fully testable.
 *
 * All restricted sites draw from one daily limit. Elapsed wall-clock time on
 * any restricted site decrements the shared remaining amount, which resets to
 * the limit at midnight.
 */
export class TimeTracker {
  private readonly storage: TrackerStorage;
  private readonly now: () => number;
  private readonly date: () => string;
  private usageWriteChain: Promise<void> = Promise.resolve();

  private isActive = false;
  private currentRestrictedWebsite: string | null = null;
  private isBlocked = false;
  private activeSinceTs: number | null = null;
  private lastDay: string | null = null;
  private dayChangedHandler: DayChangeHandler = () => {};

  private dailyLimit = 0;
  private remaining = 0;
  private pausedUntil: number | null = null;

  constructor(
    storage: TrackerStorage,
    now: () => number = Date.now,
    date: () => string = getCurrentDate,
  ) {
    this.storage = storage;
    this.now = now;
    this.date = date;
  }

  get active(): boolean {
    return this.isActive;
  }

  get blocked(): boolean {
    return this.isBlocked;
  }

  get currentSite(): string | null {
    return this.currentRestrictedWebsite;
  }

  get isLimitReached(): boolean {
    return this.remainingSeconds <= 0;
  }

  get paused(): boolean {
    return this.pausedUntil !== null && this.now() < this.pausedUntil;
  }

  /** Effective remaining seconds for today (shared across all restricted sites). */
  get remainingSeconds(): number {
    return this.remaining;
  }

  /** Configures the daily limit in seconds. */
  setLimit(maxSeconds: number): void {
    this.dailyLimit = Math.floor(maxSeconds);
  }

  /** Sets the remaining seconds for today. */
  setRemaining(seconds: number): void {
    this.remaining = Math.max(0, seconds);
  }

  setPausedUntil(timestamp: number | null): void {
    this.pausedUntil = timestamp;
  }

  /** Adds extra time to today's remaining (e.g. block-screen grace). */
  async addGrace(seconds: number): Promise<void> {
    this.remaining = Math.max(0, this.remaining + seconds);
    await this.saveRemaining();
  }

  startSession(site: string, activeSinceTs?: number): void {
    this.currentRestrictedWebsite = site;
    if (!this.isActive) {
      this.isActive = true;
      this.activeSinceTs = activeSinceTs ?? this.now();
      void this.recordSession(site, this.activeSinceTs);
    }
  }

  endSession(): void {
    if (this.isActive) {
      const elapsedSeconds = this.settleElapsedTime();
      this.applyElapsed(elapsedSeconds);
    }
    this.isActive = false;
    this.activeSinceTs = null;
    void this.recordSession(null, null);
    void this.saveRemaining();
  }

  reset(): void {
    this.endSession();
    this.currentRestrictedWebsite = null;
    this.isBlocked = false;
  }

  markBlocked(): void {
    this.isBlocked = true;
  }

  unblock(): void {
    this.isBlocked = false;
  }

  /** Settles elapsed time, decrements the shared remaining, persists. Returns remaining. */
  async tick(): Promise<number> {
    await this.handleDayRollover();
    if (this.paused) return this.remainingSeconds;
    if (this.isActive && this.currentRestrictedWebsite) {
      const elapsedSeconds = this.settleElapsedTime();
      this.applyElapsed(elapsedSeconds);
      if (elapsedSeconds > 0) {
        await this.usageWriteChain;
        await this.saveRemaining();
      }
    }
    return this.remainingSeconds;
  }

  /** Registers the date the tracker last saw (used for midnight rollover detection). */
  setLastDay(date: string | null): void {
    this.lastDay = date;
  }

  /** Registers a handler invoked when a new day is detected during a tick. */
  onDayChanged(handler: DayChangeHandler): void {
    this.dayChangedHandler = handler;
  }

  /** Settles elapsed time and persists without awaiting. */
  flush(): void {
    this.settleElapsedTime();
    void this.saveRemaining();
  }

  /** Reads the last persisted session state (for restoring across SW restarts). */
  async restoreSession(): Promise<PersistedSession> {
    const data = await this.storage.get<Record<string, string | number | undefined>>([
      CONSTANTS.STORAGE_KEYS.ACTIVE_SITE,
      CONSTANTS.STORAGE_KEYS.ACTIVE_SINCE_TS,
    ]);
    const siteValue = data[CONSTANTS.STORAGE_KEYS.ACTIVE_SITE];
    const sinceValue = data[CONSTANTS.STORAGE_KEYS.ACTIVE_SINCE_TS];
    return {
      site: typeof siteValue === 'string' && siteValue.length > 0 ? siteValue : null,
      activeSinceTs: typeof sinceValue === 'number' ? sinceValue : null,
    };
  }

  /** Resolves when all pending usage writes have completed. */
  flushPendingWrites(): Promise<void> {
    return this.usageWriteChain;
  }

  private async handleDayRollover(): Promise<void> {
    const today = this.date();
    if (this.lastDay === null || this.lastDay === today) return;
    this.lastDay = today;

    // Flush any in-progress session before resetting so usage lands on the previous day
    if (this.isActive) {
      this.settleElapsedTime();
    }
    await this.flushPendingWrites();
    this.resetForNewDay();
    await this.dayChangedHandler();
  }

  private resetForNewDay(): void {
    this.remaining = this.dailyLimit;
    void this.saveRemaining();
  }

  private applyElapsed(elapsedSeconds: number): void {
    if (elapsedSeconds <= 0 || !this.currentRestrictedWebsite) return;
    this.remaining = Math.max(0, this.remaining - elapsedSeconds);
  }

  private settleElapsedTime(): number {
    const site = this.currentRestrictedWebsite;
    const startTs = this.activeSinceTs;
    const nowTs = this.now();
    this.activeSinceTs = nowTs;
    void this.recordSession(site, nowTs);

    if (!site || startTs === null) return 0;

    const elapsedSeconds = getElapsedSeconds(startTs, nowTs);
    if (elapsedSeconds > 0) {
      // Attribute usage to the day the session started (correct across midnight)
      const usageDate = formatDateISO(new Date(startTs));
      void this.recordUsage(site, elapsedSeconds, usageDate);
    }
    return elapsedSeconds;
  }

  private recordSession(site: string | null, activeSinceTs: number | null): Promise<void> {
    this.usageWriteChain = this.usageWriteChain
      .catch(() => {})
      .then(() =>
        this.storage.set({
          [CONSTANTS.STORAGE_KEYS.ACTIVE_SITE]: site,
          [CONSTANTS.STORAGE_KEYS.ACTIVE_SINCE_TS]: activeSinceTs,
        }),
      );
    return this.usageWriteChain;
  }

  private recordUsage(site: string, seconds: number, date: string): Promise<void> {
    this.usageWriteChain = this.usageWriteChain
      .catch(() => {})
      .then(() => this.writeUsage(site, seconds, date));
    return this.usageWriteChain;
  }

  private async writeUsage(site: string, seconds: number, date: string): Promise<void> {
    const { totalKey, dailyKey } = getUsageKeys(site, date);
    const [siteObj, siteTodayObj] = await Promise.all([
      this.storage.get<Record<string, number>>(totalKey),
      this.storage.get<Record<string, number>>(dailyKey),
    ]);
    const currentTotalSeconds = Number.parseInt(String(siteObj[totalKey]), 10) || 0;
    const todaySeconds = Number.parseInt(String(siteTodayObj[dailyKey]), 10) || 0;
    await this.storage.set({
      [totalKey]: currentTotalSeconds + seconds,
      [dailyKey]: todaySeconds + seconds,
    });
  }

  async saveRemaining(): Promise<void> {
    await this.storage.set({
      remainingTime: this.remaining,
    });
  }
}
