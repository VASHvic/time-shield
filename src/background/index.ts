import contentScriptPath from '@/content/content.ts?script';
import {
  ContentMessages,
  type WorkerMessage,
  WorkerMessages,
  notifyBackgroundError,
  sendContentMessage,
} from '@/messages';
import type { StorageData } from '@/types';
import { CONSTANTS, Colors } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { extractHostname, matchRestrictedSite } from '@/utils/matching';
import { chromeStorageService } from '@/utils/storage';
import { getCurrentDate, isNewDay } from '@/utils/time';
import { setBadgeColor, updateBadge } from './badge';
import { TimeTracker } from './tracker';

const TIMER_ALARM = 'timeShieldTimer';
const SESSION_RESTORE_MAX_AGE_MS = 5 * 60 * 1000;
const GRACE_SECONDS = 5 * 60;

const tracker = new TimeTracker(chromeStorageService);
let readingTabName = false;
let isAppRunning = false;

// Midnight rollover while the service worker stays alive: the alarm tick detects
// the day change and resets the budgets + unlocks.
tracker.onDayChanged(async () => {
  logger.info('New day detected on tick! Resetting timers and unlocking.');
  await resetForNewDay();
});

function handleError(error: unknown, context: string): void {
  notifyBackgroundError(error, context);
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  try {
    logger.info('Time Shield installed/updated');
    runBackground();
    chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 10 / 60 });
  } catch (error) {
    handleError(error, 'onInstalled');
  }
});

// Ensure alarm is created on startup
chrome.runtime.onStartup.addListener(() => {
  try {
    logger.info('Time Shield startup');
    runBackground();
    chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 10 / 60 });
  } catch (error) {
    handleError(error, 'onStartup');
  }
});

// Message handling
chrome.runtime.onMessage.addListener((request: { message: WorkerMessage }) => {
  try {
    switch (request.message) {
      case WorkerMessages.updateTimer:
        logger.debug('Timer update requested');
        updateCurrentTimer();
        break;
      case WorkerMessages.start:
        logger.debug('Start requested');
        start();
        break;
      case WorkerMessages.grace:
        logger.info('Grace requested, granting 5 extra minutes');
        grantGrace();
        break;
      default:
        logger.debug('Unknown message:', request.message);
    }
  } catch (error) {
    handleError(error, 'onMessage');
  }
});

// Alarm listener for timer updates
chrome.alarms.onAlarm.addListener((alarm) => {
  try {
    if (alarm.name === TIMER_ALARM) {
      handleTimerUpdate();
    }
  } catch (error) {
    handleError(error, 'onAlarm');
  }
});

// Window focus changed listener
chrome.windows.onFocusChanged.addListener((windowId) => {
  try {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      logger.debug('Lost focus');
      tracker.endSession();
    } else {
      logger.debug('Window', windowId, 'gained focus');
      readTabName();
    }
  } catch (error) {
    handleError(error, 'onFocusChanged');
  }
});

// Tab listeners
chrome.tabs.onActivated.addListener(readTabName);
chrome.tabs.onCreated.addListener(readTabName);
chrome.tabs.onUpdated.addListener(readTabName);

// React to config/pause changes made from the popup
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  try {
    const keys = CONSTANTS.STORAGE_KEYS;

    if (changes[keys.PAUSED_UNTIL]) {
      const pausedChange = changes[keys.PAUSED_UNTIL];
      const pausedUntil = (pausedChange?.newValue as number | null) ?? null;
      tracker.setPausedUntil(pausedUntil);
      if (pausedUntil) {
        logger.info('Paused');
        tracker.endSession();
        updateBadge(tracker.remainingSeconds);
      } else {
        logger.info('Resumed');
        readTabName();
      }
    }

    if (
      changes[keys.RESTRICTED_SITES] ||
      changes[keys.MAX_ALLOWED_TIME] ||
      changes[keys.REMAINING_TIME]
    ) {
      reloadBudgets();
    }
  } catch (error) {
    handleError(error, 'onStorageChanged');
  }
});

// Runtime on suspend listener
chrome.runtime.onSuspend.addListener(() => {
  try {
    tracker.flush();
  } catch (error) {
    handleError(error, 'onSuspend');
  }
});

// Core functions

/** Seeds tracker state from storage. Returns whether the day changed. */
async function applyBudgets(data: Partial<StorageData>): Promise<boolean> {
  const dayChanged = isNewDay(data.today);
  const globalLimit = data.maxAllowedTime ?? 0;

  tracker.setLimit(globalLimit);
  tracker.setRemaining(dayChanged ? globalLimit : (data.remainingTime ?? globalLimit));
  tracker.setPausedUntil(data.pausedUntil ?? null);
  tracker.setLastDay(dayChanged ? getCurrentDate() : (data.today ?? getCurrentDate()));

  return dayChanged;
}

async function runBackground(): Promise<void> {
  try {
    const data = await chromeStorageService.get<Partial<StorageData>>([
      CONSTANTS.STORAGE_KEYS.MAX_ALLOWED_TIME,
      CONSTANTS.STORAGE_KEYS.TODAY,
      CONSTANTS.STORAGE_KEYS.REMAINING_TIME,
      CONSTANTS.STORAGE_KEYS.RESTRICTED_SITES,
      CONSTANTS.STORAGE_KEYS.DISABLED,
      CONSTANTS.STORAGE_KEYS.PAUSED_UNTIL,
    ]);

    if (!data.maxAllowedTime || !data.restrictedSites || data.restrictedSites.length === 0) {
      logger.debug('Extension not configured yet');
      return;
    }

    const dayChanged = await applyBudgets(data);

    if (dayChanged) {
      logger.info('New day detected! Resetting timers and unlocking.');
      await resetForNewDay();
    }

    await restoreSessionState();
  } catch (error) {
    handleError(error, 'runBackground');
  }
}

/** Persists new-day metadata. Budget reset is handled by the tracker on rollover. */
async function resetForNewDay(): Promise<void> {
  const currentDate = getCurrentDate();
  await chromeStorageService.set({
    today: currentDate,
    isNewDay: true,
    disabled: false, // Auto-unlock on new day
  });
  tracker.setLastDay(currentDate);
}

async function reloadBudgets(): Promise<void> {
  const data = await chromeStorageService.get<Partial<StorageData>>([
    CONSTANTS.STORAGE_KEYS.MAX_ALLOWED_TIME,
    CONSTANTS.STORAGE_KEYS.TODAY,
    CONSTANTS.STORAGE_KEYS.REMAINING_TIME,
    CONSTANTS.STORAGE_KEYS.RESTRICTED_SITES,
  ]);
  await applyBudgets(data);
  await readTabName();
}

async function restoreSessionState(): Promise<void> {
  try {
    if (tracker.paused) {
      logger.debug('Paused, skipping session restore');
      return;
    }

    const session = await tracker.restoreSession();
    if (!session.site || session.activeSinceTs === null) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const hostname = tab?.url ? extractHostname(tab.url) : null;

    if (!matchRestrictedSite(hostname, session.site)) {
      logger.debug('Restored session no longer on restricted site, resetting');
      tracker.reset();
      return;
    }

    if (Date.now() - session.activeSinceTs > SESSION_RESTORE_MAX_AGE_MS) {
      logger.debug('Restored session is stale, starting fresh');
      tracker.reset();
      return;
    }

    tracker.startSession(session.site, session.activeSinceTs);
    logger.debug('Restored active session for', session.site);
  } catch (error) {
    handleError(error, 'restoreSessionState');
  }
}

async function blockCurrentPage(): Promise<void> {
  try {
    if (tracker.blocked) return; // Already blocked

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    logger.debug('Blocking page - time limit reached');

    // Inject the content script to block the page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [contentScriptPath],
    });

    tracker.markBlocked();
    setBadgeColor(Colors.red);
  } catch (error) {
    handleError(error, 'blockCurrentPage');
  }
}

async function readTabName(): Promise<void> {
  try {
    if (readingTabName) return;
    readingTabName = true;

    if (tracker.paused) {
      logger.debug('Paused - not tracking');
      tracker.reset();
      readingTabName = false;
      return;
    }

    const data = await chromeStorageService.get<Partial<StorageData>>(['restrictedSites']);
    const restrictedSites = data.restrictedSites ?? [];

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const hostname = tab?.url ? extractHostname(tab.url) : null;
    const restrictedSite = restrictedSites.find((w) => matchRestrictedSite(hostname, w)) ?? null;

    if (restrictedSite) {
      logger.debug('Current restricted website:', restrictedSite);
      tracker.startSession(restrictedSite);

      if (tracker.isLimitReached) {
        logger.debug('Time expired on navigation, blocking immediately');
        tracker.unblock(); // Force block
        blockCurrentPage();
      } else {
        tracker.unblock(); // Reset blocked state if time remains
      }
    } else {
      logger.debug('The website is not restricted');
      tracker.reset();
    }

    readingTabName = false;
  } catch (error) {
    readingTabName = false; // Reset flag on error
    handleError(error, 'readTabName');
  }
}

async function handleTimerUpdate(): Promise<void> {
  try {
    if (tracker.paused) {
      // Detect pause expiry so time resumes counting
      const data = await chromeStorageService.get<Partial<StorageData>>([
        CONSTANTS.STORAGE_KEYS.PAUSED_UNTIL,
      ]);
      if (data.pausedUntil && Date.now() >= data.pausedUntil) {
        logger.info('Pause expired, resuming');
        tracker.setPausedUntil(null);
        await chromeStorageService.set({ [CONSTANTS.STORAGE_KEYS.PAUSED_UNTIL]: null });
        // The storage listener restarts tracking for the current tab.
      }
      updateBadge(tracker.remainingSeconds);
      return;
    }

    const remaining = await tracker.tick();
    logger.debug('Remaining seconds:', remaining);
    updateBadge(remaining);

    if (tracker.active && tracker.isLimitReached) {
      blockCurrentPage();
    }
  } catch (error) {
    handleError(error, 'handleTimerUpdate');
  }
}

async function updateCurrentTimer(): Promise<void> {
  try {
    const data = await chromeStorageService.get<Partial<StorageData>>([
      CONSTANTS.STORAGE_KEYS.MAX_ALLOWED_TIME,
      CONSTANTS.STORAGE_KEYS.TODAY,
      CONSTANTS.STORAGE_KEYS.REMAINING_TIME,
      CONSTANTS.STORAGE_KEYS.RESTRICTED_SITES,
    ]);
    if (data.maxAllowedTime) {
      await applyBudgets(data);
      await readTabName();
    }
  } catch (error) {
    handleError(error, 'updateCurrentTimer');
  }
}

function start(): void {
  try {
    if (!isAppRunning) {
      runBackground();
      isAppRunning = true;
    }
  } catch (error) {
    handleError(error, 'start');
  }
}

/** Grants extra time from the block overlay and removes it from the active tab. */
async function grantGrace(): Promise<void> {
  try {
    if (!tracker.currentSite) return;
    await tracker.addGrace(GRACE_SECONDS);
    tracker.unblock();
    updateBadge(tracker.remainingSeconds);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      sendContentMessage(tab.id, ContentMessages.unblock);
    }
  } catch (error) {
    handleError(error, 'grantGrace');
  }
}
