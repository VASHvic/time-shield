/* global chrome */

// Constants
const CONSTANTS = {
  ALARM_NAME: 'timeShieldAlarm',
  CHECK_INTERVAL: 10000, // 10 seconds
  STORAGE_KEYS: {
    RESTRICTED_SITES: 'restrictedSites',
    MAX_ALLOWED_TIME: 'maxAllowedTime',
    REMAINING_TIME: 'remainingTime',
    TODAY: 'today'
  }
};

const WorkerMessages = {
  updateTimer: 'updateTimer',
  start: 'start',
  error: 'error'
};

const Colors = {
  blue: '#0000FF',
  red: '#FF0000',
  green: '#00FF00'
};

// Global state
const globals = {
  isAppRunning: false,
  readingTabName: false,
  isRestrictedWebsiteActive: false,
  remainingSeconds: 0,
  currentIntervalId: null,
  currentRestrictedWebsite: null,
};

// Error handling utility
const ErrorHandler = {
  handle: (error, context) => {
    console.error(`Error in ${context}:`, error);
    chrome.runtime.sendMessage({
      message: WorkerMessages.error,
      error: error.message,
      context
    });
  }
};

// Storage service
class StorageService {
  constructor({ storage, defaultValues }) {
    this.defaultValues = defaultValues;
    this.localStorage = storage;
  }

  async get(storedList) {
    try {
      return this.localStorage.get(storedList ?? this.defaultValues);
    } catch (error) {
      ErrorHandler.handle(error, 'StorageService.get');
    }
  }

  async set(values) {
    try {
      await this.localStorage.set(values);
    } catch (error) {
      ErrorHandler.handle(error, 'StorageService.set');
    }
  }

  async printStorage() {
    try {
      this.localStorage.get(null, (data) => { console.log({ data }); });
    } catch (error) {
      ErrorHandler.handle(error, 'StorageService.printStorage');
    }
  }
}

const chromeStorageService = new StorageService({ storage: chrome.storage.local, defaultValues: ['restrictedSites', 'maxAllowedTime'] });

// Improved background runner with error handling
async function runBackground() {
  try {
    const {
      maxAllowedTime,
      remainingTime,
      today,
      restrictedSites,
    } = await chromeStorageService.get([
      CONSTANTS.STORAGE_KEYS.MAX_ALLOWED_TIME,
      CONSTANTS.STORAGE_KEYS.TODAY,
      CONSTANTS.STORAGE_KEYS.REMAINING_TIME,
      CONSTANTS.STORAGE_KEYS.RESTRICTED_SITES
    ]);

    const currentDate = new Date().toLocaleDateString();
    const isNewDay = today !== currentDate;

    if (!maxAllowedTime || !restrictedSites) {
      console.log('Extension not configured yet');
      return;
    }

    globals.remainingSeconds = getRemainingTimer(remainingTime, maxAllowedTime, isNewDay);
    
    if (isNewDay) {
      await chromeStorageService.set({ today: currentDate });
    }

    start();
  } catch (error) {
    ErrorHandler.handle(error, 'runBackground');
  }
}

// Improved notification handling
async function showNotification() {
  try {
    const options = {
      type: 'basic',
      iconUrl: '../shield.png',
      title: 'Time Shield Alert',
      message: 'Your allocated time for this website has expired!',
      priority: 2
    };
    
    await chrome.notifications.create('timeExpired', options);
    changeBadgeColor(Colors.red);
  } catch (error) {
    ErrorHandler.handle(error, 'showNotification');
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  try {
    console.log('Time Shield installed/updated');
    runBackground();
  } catch (error) {
    ErrorHandler.handle(error, 'onInstalled');
  }
});

// Message handling
chrome.runtime.onMessage.addListener((request) => {
  try {
    switch (request.message) {
      case WorkerMessages.updateTimer:
        console.log('⌚ Timer update requested');
        updateCurrentTimer();
        break;
      case WorkerMessages.start:
        console.log('▶️ Start requested');
        start();
        break;
      default:
        console.log('Unknown message:', request.message);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'onMessage');
  }
});

// Health check ping
(function ping() {
  try {
    console.log('🏓 Service worker ping');
    setTimeout(ping, CONSTANTS.CHECK_INTERVAL);
  } catch (error) {
    ErrorHandler.handle(error, 'ping');
  }
})();

// Read tab name
async function readTabName() {
  try {
    console.log('Reading tab name');
    if (globals.readingTabName) return;
    globals.readingTabName = true;
    const { restrictedSites: forbidenSites } = await chromeStorageService.get(['restrictedSites']);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs[0]?.url);
      const restrictedWebsite = forbidenSites.find((w) => tabs[0]?.url.includes(w));
      globals.currentRestrictedWebsite = restrictedWebsite;
      if (restrictedWebsite) {
        console.log('current restricted website: ', restrictedWebsite);
        if (!globals.currentIntervalId) {
          console.log('The website is restricted');
          chromeStorageService.printStorage();
          globals.isRestrictedWebsiteActive = true;
          checkCurrentBrowserInfoInterval();
        }
      } else {
        globals.isRestrictedWebsiteActive = false;
        saveRemainingMinutes();
        console.log(`The website is not restricted, canceling the interval ${globals.currentIntervalId}`);
        chromeStorageService.printStorage();
        clearCurrentInterval();
        globals.currentIntervalId = null;
      }
    });
    globals.readingTabName = false;
  } catch (error) {
    ErrorHandler.handle(error, 'readTabName');
  }
}

// Check current browser info interval
function checkCurrentBrowserInfoInterval() {
  try {
    if (globals.currentIntervalId) {
      clearInterval(globals.currentIntervalId);
      globals.currentIntervalId = null;
    }

    // Set a new interval
    globals.currentIntervalId = setInterval(async () => {
      console.log({ restrictedwebsiteactive: globals.isRestrictedWebsiteActive });
      if (globals.isRestrictedWebsiteActive) {
        const currentDay = new Date().getDay();
        const restrictedSite = globals.currentRestrictedWebsite;
        const restrictedSiteObj = await chromeStorageService.get(restrictedSite);
        const restrictedSiteTodayObj = await chromeStorageService.get(`${restrictedSite}_${currentDay}`);
        const restrictedSiteSavedSecsToday = restrictedSiteTodayObj[`${restrictedSite}_${currentDay}`] || 0;
        console.log('RESTRICTED OBJS!!!');
        console.log({ restrictedSiteObj, restrictedSiteTodayObj, restrictedSiteSavedSecsToday });
        restrictedSiteObj[`${restrictedSite}`] = parseInt(restrictedSiteObj[`${restrictedSite}`], 10) || 0;
        console.log('🌞', restrictedSiteObj);
        await chromeStorageService.set(
          {
            [restrictedSite]: restrictedSiteObj[restrictedSite] += 10,
            [`${restrictedSite}_${currentDay}`]: restrictedSiteSavedSecsToday + 10,
          },
        );
        globals.remainingSeconds -= 10;
        console.log({ currentDay });
        await chromeStorageService.get([restrictedSite, `${restrictedSite}_${currentDay}`]).then((res) => console.log('132', res));
      }
      console.log('remainingTimer 👀', globals.remainingSeconds);
      changeBadgeContent(globals.remainingSeconds);
      if (globals.isRestrictedWebsiteActive && globals.remainingSeconds <= 0) {
        showNotification();
      }
    }, 10000);
  } catch (error) {
    ErrorHandler.handle(error, 'checkCurrentBrowserInfoInterval');
  }
}

// Update current timer
async function updateCurrentTimer() {
  try {
    const { maxAllowedTime } = await chromeStorageService.get('maxAllowedTime');
    console.log(`log maxAllowedTime en storage ${maxAllowedTime}`);
    if (maxAllowedTime) {
      globals.remainingSeconds = parseInt(maxAllowedTime, 10);
      console.log(`Remaining seconds from the listener: ${globals.remainingSeconds}`);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'updateCurrentTimer');
  }
}

// Change badge content
function changeBadgeContent(currentSeconds) {
  try {
    chrome.action.setBadgeText({
      text: `${`${Math.floor(currentSeconds / 60)}m`}`,
    });
    if (currentSeconds < (5 * 60)) {
      changeBadgeColor(Colors.red);
    } else {
      changeBadgeColor(Colors.blue);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'changeBadgeContent');
  }
}

// Change badge color
function changeBadgeColor(color) {
  try {
    chrome.action.setBadgeBackgroundColor({ color });
  } catch (error) {
    ErrorHandler.handle(error, 'changeBadgeColor');
  }
}

// Clear current interval
function clearCurrentInterval() {
  try {
    if (globals.currentIntervalId) {
      clearInterval(globals.currentIntervalId);
      globals.currentIntervalId = null;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'clearCurrentInterval');
  }
}

// Save remaining minutes
async function saveRemainingMinutes() {
  try {
    console.log('Lo que guarde en storage');
    console.log({
      remainingTime: globals.remainingSeconds,
    });
    chromeStorageService.set({
      remainingTime: globals.remainingSeconds,
    });
  } catch (error) {
    ErrorHandler.handle(error, 'saveRemainingMinutes');
  }
}

// Get remaining timer
function getRemainingTimer(remaining, max, isNewDay) {
  try {
    if (isNewDay) {
      console.log('Day changed');
      return max;
    }

    return Math.min(remaining, max);
  } catch (error) {
    ErrorHandler.handle(error, 'getRemainingTimer');
  }
}

// Start
function start() {
  try {
    if (!globals.isAppRunning) {
      runBackground();
      globals.isAppRunning = true;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'start');
  }
}

// Window focus changed listener
chrome.windows.onFocusChanged.addListener((windowId) => {
  try {
    console.log('Window', windowId, 'gained focus');
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      console.log('Lost focus');
      if (globals.currentIntervalId) {
        console.log('Stopping the timer as Chrome lost focus');
        clearCurrentInterval();
        globals.currentIntervalId = null; // Ensure the interval ID is reset
        globals.isRestrictedWebsiteActive = false;
        // Optionally, mark no restricted website as active
        saveRemainingMinutes(); // Save the remaining minutes as the focus is lost
      }
    } else {
      console.log('Window', windowId, 'gained focus');
      readTabName();
    }
  } catch (error) {
    ErrorHandler.handle(error, 'onFocusChanged');
  }
});

// Tab listeners
chrome.tabs.onActivated.addListener(readTabName);
chrome.tabs.onCreated.addListener(readTabName);
chrome.tabs.onUpdated.addListener(readTabName);

// Runtime on suspend listener
chrome.runtime.onSuspend.addListener(() => {
  try {
    saveRemainingMinutes();
    clearCurrentInterval();
  } catch (error) {
    ErrorHandler.handle(error, 'onSuspend');
  }
});
