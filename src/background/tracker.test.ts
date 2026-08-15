import { formatDateISO } from '@/utils/time';
import { describe, expect, it } from 'vitest';
import { TimeTracker, getRemainingTimer } from './tracker';

class FakeStorage {
  data: Record<string, unknown> = {};

  async get<T>(keys: string | string[]): Promise<T> {
    const keyList = Array.isArray(keys) ? keys : [keys];
    const result: Record<string, unknown> = {};
    for (const key of keyList) {
      if (key in this.data) {
        result[key] = this.data[key];
      }
    }
    return result as T;
  }

  async set(values: Record<string, unknown>): Promise<void> {
    Object.assign(this.data, values);
  }
}

function createTracker(initialRemaining: number) {
  const storage = new FakeStorage();
  let clock = 1_000_000_000_000;
  const tracker = new TimeTracker(storage, () => clock);
  tracker.setRemaining(initialRemaining);
  return {
    tracker,
    storage,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

function createGlobalTracker(limit: number, seededRemaining?: number) {
  const storage = new FakeStorage();
  let clock = 1_000_000_000_000;
  const tracker = new TimeTracker(storage, () => clock);
  tracker.setLimit(limit);
  tracker.setRemaining(seededRemaining ?? limit);
  return {
    tracker,
    storage,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('getRemainingTimer', () => {
  it('returns max on a new day', () => {
    expect(getRemainingTimer(0, 3600, true)).toBe(3600);
  });

  it('returns min(remaining, max) on the same day', () => {
    expect(getRemainingTimer(1200, 3600, false)).toBe(1200);
    expect(getRemainingTimer(7200, 3600, false)).toBe(3600);
  });
});

describe('TimeTracker', () => {
  it('tracks elapsed wall-clock time and decrements remaining', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    tracker.startSession('youtube.com');
    advance(10_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(3590);
    expect(storage.data.remainingTime).toBe(3590);
    expect(storage.data['youtube.com']).toBe(10);
  });

  it('clamps remaining at zero', async () => {
    const { tracker, advance } = createTracker(5);
    tracker.startSession('youtube.com');
    advance(10_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(0);
  });

  it('does not tick when no session is active', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    advance(60_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(3600);
    expect(storage.data).toEqual({});
  });

  it('records usage only for the current site', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    tracker.startSession('youtube.com');
    advance(10_000);
    await tracker.tick();
    tracker.startSession('reddit.com');
    advance(5_000);
    await tracker.tick();

    expect(storage.data['youtube.com']).toBe(10);
    expect(storage.data['reddit.com']).toBe(5);
    expect(storage.data.remainingTime).toBe(3585);
  });

  it('settles elapsed time with the site still set when the session ends (no lost time)', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    tracker.startSession('youtube.com');
    advance(10_000);
    tracker.endSession();

    await tracker.flushPendingWrites();
    expect(storage.data['youtube.com']).toBe(10);
    expect(storage.data.remainingTime).toBe(3590);
    expect(tracker.active).toBe(false);
  });

  it('resets the session and site', async () => {
    const { tracker, advance } = createTracker(3600);
    tracker.startSession('youtube.com');
    advance(5_000);
    tracker.markBlocked();
    tracker.reset();

    expect(tracker.active).toBe(false);
    expect(tracker.currentSite).toBeNull();
    expect(tracker.blocked).toBe(false);
  });

  it('isLimitReached reports zero remaining', async () => {
    const { tracker, advance } = createTracker(0);
    expect(tracker.isLimitReached).toBe(true);
    tracker.setRemaining(60);
    expect(tracker.isLimitReached).toBe(false);
    tracker.startSession('youtube.com');
    advance(60_000);
    await tracker.tick();
    expect(tracker.isLimitReached).toBe(true);
  });

  it('clamps setRemaining at zero', () => {
    const { tracker } = createTracker(0);
    tracker.setRemaining(-100);
    expect(tracker.remainingSeconds).toBe(0);
  });

  it('treats clock going backwards as zero elapsed', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    tracker.startSession('youtube.com');
    advance(-30_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(3600);
    expect(storage.data['youtube.com']).toBeUndefined();
  });

  it('serializes rapid usage writes without lost updates', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    tracker.startSession('youtube.com');

    advance(10_000);
    await tracker.tick();

    advance(10_000);
    await tracker.tick();

    await tracker.flushPendingWrites();
    expect(storage.data['youtube.com']).toBe(20);
    expect(storage.data.remainingTime).toBe(3580);
  });

  it('records usage under the daily key for the session start day', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    tracker.startSession('youtube.com');
    advance(15_000);
    await tracker.tick();

    const startTsDay = formatDateISO(new Date(1_000_000_000_000));
    expect(storage.data[`youtube.com_${startTsDay}`]).toBe(15);
  });

  it('detects a new day during a tick, fires the handler and resets the timer', async () => {
    const storage = new FakeStorage();
    let clock = 1_000_000_000_000;
    let day = '2026-08-13';
    const tracker = new TimeTracker(
      storage,
      () => clock,
      () => day,
    );
    tracker.setLimit(3600);
    tracker.setRemaining(0);
    tracker.setLastDay('2026-08-13');

    let handlerCalled = false;
    tracker.onDayChanged(async () => {
      handlerCalled = true;
      await storage.set({ today: day, disabled: false });
    });

    tracker.startSession('youtube.com');
    clock += 30_000;
    day = '2026-08-14';
    const remaining = await tracker.tick();

    expect(handlerCalled).toBe(true);
    expect(remaining).toBe(3600);
    expect(storage.data.disabled).toBe(false);
    expect(storage.data.today).toBe('2026-08-14');
  });

  it('attributes pre-midnight elapsed time to the previous day on rollover', async () => {
    const storage = new FakeStorage();
    let clock = 1_000_000_000_000;
    let day = '2026-08-13';
    const tracker = new TimeTracker(
      storage,
      () => clock,
      () => day,
    );
    tracker.setLimit(3600);
    tracker.setRemaining(3600);
    tracker.setLastDay('2026-08-13');
    tracker.onDayChanged(() => {});

    tracker.startSession('youtube.com');
    clock += 30_000;
    day = '2026-08-14';
    await tracker.tick();

    const oldDay = formatDateISO(new Date(1_000_000_000_000));
    expect(storage.data[`youtube.com_${oldDay}`]).toBe(30);
  });

  it('does not fire the day change handler on the same day', async () => {
    const storage = new FakeStorage();
    let clock = 1_000_000_000_000;
    const tracker = new TimeTracker(
      storage,
      () => clock,
      () => '2026-08-13',
    );
    tracker.setLimit(3600);
    tracker.setRemaining(3600);
    tracker.setLastDay('2026-08-13');

    let handlerCalled = false;
    tracker.onDayChanged(() => {
      handlerCalled = true;
    });

    tracker.startSession('youtube.com');
    clock += 30_000;
    await tracker.tick();

    expect(handlerCalled).toBe(false);
    expect(tracker.remainingSeconds).toBe(3570);
  });

  it('persists the active session and restores it', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    tracker.startSession('youtube.com');
    advance(10_000);
    await tracker.tick();
    await tracker.flushPendingWrites();

    expect(storage.data.activeSite).toBe('youtube.com');
    expect(storage.data.activeSinceTs).toBeTypeOf('number');

    const restored = await tracker.restoreSession();
    expect(restored.site).toBe('youtube.com');
    expect(restored.activeSinceTs).toBeTypeOf('number');
  });

  it('clears the persisted session on endSession', async () => {
    const { tracker, storage } = createTracker(3600);
    tracker.startSession('youtube.com');
    tracker.endSession();
    await tracker.flushPendingWrites();

    expect(storage.data.activeSite).toBeNull();
    expect(storage.data.activeSinceTs).toBeNull();
  });

  it('restores a session with an explicit timestamp and counts the gap', async () => {
    const { tracker, storage, advance } = createTracker(3600);
    const sinceTs = 1_000_000_000_000;
    advance(10_000);
    tracker.startSession('youtube.com', sinceTs);
    await tracker.tick();

    expect(tracker.remainingSeconds).toBe(3590);
    expect(storage.data['youtube.com']).toBe(10);
  });

  it('does not restore a session that was never persisted', async () => {
    const { tracker } = createTracker(3600);
    const restored = await tracker.restoreSession();
    expect(restored).toEqual({ site: null, activeSinceTs: null });
  });
});

describe('TimeTracker global limit', () => {
  it('decrements the shared remaining for the active site', async () => {
    const { tracker, storage, advance } = createGlobalTracker(1800);

    tracker.startSession('youtube.com');
    advance(10_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(1790);
    expect(tracker.remainingSeconds).toBe(1790);
    expect(storage.data.remainingTime).toBe(1790);
  });

  it('switching sites draws from the same shared remaining', async () => {
    const { tracker, advance } = createGlobalTracker(1800);

    tracker.startSession('youtube.com');
    advance(10_000);
    await tracker.tick();

    tracker.startSession('reddit.com');
    advance(5_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(1785);
  });

  it('restarts an exhausted timer to the full limit after midnight', async () => {
    const storage = new FakeStorage();
    let clock = 1_000_000_000_000;
    let day = '2026-08-13';
    const tracker = new TimeTracker(
      storage,
      () => clock,
      () => day,
    );
    tracker.setLimit(3600);
    tracker.setRemaining(3600);
    tracker.setLastDay('2026-08-13');

    let handlerCalled = false;
    tracker.onDayChanged(async () => {
      handlerCalled = true;
      await storage.set({ disabled: false });
    });

    // Exhaust the budget before midnight
    tracker.startSession('youtube.com');
    clock += 3600_000;
    await tracker.tick();
    expect(tracker.isLimitReached).toBe(true);
    expect(tracker.remainingSeconds).toBe(0);

    // Cross midnight while the session is still active
    clock += 1000;
    day = '2026-08-14';
    const remaining = await tracker.tick();
    await tracker.flushPendingWrites();

    expect(handlerCalled).toBe(true);
    expect(remaining).toBe(3600);
    expect(tracker.isLimitReached).toBe(false);
    expect(tracker.remainingSeconds).toBe(3600);
    expect(storage.data.remainingTime).toBe(3600);
    expect(storage.data.disabled).toBe(false);
  });

  it('addGrace adds extra time to the shared remaining', async () => {
    const { tracker, storage, advance } = createGlobalTracker(600);
    tracker.startSession('youtube.com');
    advance(600_000);
    await tracker.tick();
    expect(tracker.isLimitReached).toBe(true);

    await tracker.addGrace(300);

    expect(tracker.remainingSeconds).toBe(300);
    expect(tracker.isLimitReached).toBe(false);
    expect(storage.data.remainingTime).toBe(300);
  });
});

describe('TimeTracker pause', () => {
  it('does not decrement while paused', async () => {
    const { tracker, advance } = createGlobalTracker(600);
    tracker.setPausedUntil(1_000_000_000_000 + 60_000);

    tracker.startSession('youtube.com');
    advance(10_000);
    const remaining = await tracker.tick();

    expect(tracker.paused).toBe(true);
    expect(remaining).toBe(600);
  });

  it('is not paused after the pause expires', () => {
    const { tracker, advance } = createGlobalTracker(600);
    tracker.setPausedUntil(1_000_000_000_000 + 60_000);
    expect(tracker.paused).toBe(true);

    advance(60_000);
    expect(tracker.paused).toBe(false);
  });

  it('tracks normally once the pause has expired', async () => {
    const { tracker, advance } = createGlobalTracker(600);

    tracker.startSession('youtube.com');
    advance(10_000);
    await tracker.tick();

    // pause engages: session is settled up to the pause moment
    tracker.setPausedUntil(1_000_000_000_000 + 70_000);
    tracker.endSession();
    await tracker.flushPendingWrites();
    expect(tracker.paused).toBe(true);
    expect(tracker.remainingSeconds).toBe(590);

    // pause expires
    advance(70_000);
    expect(tracker.paused).toBe(false);

    // tracking resumes on the site
    tracker.startSession('youtube.com');
    advance(10_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(580);
  });

  it('clearing the pause has no remaining effect on tracking', async () => {
    const { tracker, advance } = createGlobalTracker(600);
    tracker.setPausedUntil(null);

    tracker.startSession('youtube.com');
    advance(10_000);
    const remaining = await tracker.tick();

    expect(remaining).toBe(590);
  });
});
