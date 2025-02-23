/* global chrome */
const globals = {
  isAppRunning: false,
  readingTabName: false,
  isRestrictedWebsiteActive: false,
  remainingSeconds: 0,
  currentIntervalId: null,
  currentRestrictedWebsite: null,
};

const WorkerMessages = {
  updateTimer: 'updateTimer',
  start: 'start',
};
const Colors = {
  blue: '#0000FF',
  red: '#FF0000',
};
class StorageService {
  constructor({ storage, defaultValues }) {
    this.defaultValues = defaultValues;
    this.localStorage = storage;
  }

  async get(storedList) {
    return this.localStorage.get(storedList ?? this.defaultValues);
  }

  async set(values) {
    await this.localStorage.set(values);
  }

  async printStorage() {
    this.localStorage.get(null, (data) => { console.log({ data }); });
  }
}
const chromeStorageService = new StorageService({ storage: chrome.storage.local, defaultValues: ['restrictedSites', 'maxAllowedTime'] });
chrome.runtime.onMessage.addListener((request) => {
  if (request.message === WorkerMessages.updateTimer) {
    console.log('⌚');
    updateCurrentTimer();
  }
  if (request.message === WorkerMessages.start) {
    start();
  }
});

async function runBackground() {
  const {
    maxAllowedTime, remainingTime, today, restrictedSites,
  } = await chromeStorageService.get(['maxAllowedTime', 'today', 'remainingTime', 'restrictedSites']);
  console.log('INITIAL DATA LOADED');
  if (!maxAllowedTime) return; // App only works if maxAllowedTime is set
  const systemDay = new Date().getDay();
  const isNewDay = today !== systemDay;
  console.log({ isNewDay });
  let restrictedSitesTodayTime = [];
  if (restrictedSites?.lengh) {
    console.log('RESTICTED SITES ON START');
    console.log(restrictedSites);
    if (isNewDay) {
      console.log({ isNewDay });
      // It's a new day, so reset the time for each restricted site to 0
      restrictedSitesTodayTime = restrictedSites.map((value) => [`${value}_${systemDay}`, 0]);
    } else {
      console.log('Entra en el else y se suposa que recu[era el tems de la web actual');
      // Not a new day, fetch the existing times to preserve them
      const keysToFetch = restrictedSites.map((value) => `${value}_${systemDay}`);
      const existingTimes = await chromeStorageService.get(keysToFetch);
      console.log({ keysToFetch, existingTimes });
      restrictedSitesTodayTime = restrictedSites.map((value) => [`${value}_${systemDay}`, existingTimes[`${value}_${systemDay}`] || 0]);
    }
  }
  const restrictedSitesToday = Object.fromEntries(restrictedSitesTodayTime);
  // Update 'today' regardless of whether it's a new day to ensure 'today' is always current
  chromeStorageService.set({ today: systemDay, ...restrictedSitesToday });
  console.log('Updated daily times for restricted sites.');
  globals.remainingSeconds = getRemainingTimer(remainingTime, maxAllowedTime, isNewDay);
  changeBadgeContent(globals.remainingSeconds);
  chrome.windows.onFocusChanged.addListener((windowId) => {
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
  });
  chrome.tabs.onActivated.addListener(readTabName);
  chrome.tabs.onCreated.addListener(readTabName);
  chrome.tabs.onUpdated.addListener(readTabName);
  chrome.runtime.onSuspend.addListener(() => {
    saveRemainingMinutes();
    clearCurrentInterval();
  });

  async function readTabName() {
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
  }
  /**
   * Check each 10 seconds if the global isRestrictedWebsite
   * is active and substract seconds from global count
  */
  function checkCurrentBrowserInfoInterval() {
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
  }
}

async function updateCurrentTimer() {
  const { maxAllowedTime } = await chromeStorageService.get('maxAllowedTime');
  console.log(`log maxAllowedTime en storage ${maxAllowedTime}`);
  if (maxAllowedTime) {
    globals.remainingSeconds = parseInt(maxAllowedTime, 10);
    console.log(`Remaining seconds from the listener: ${globals.remainingSeconds}`);
  }
}

function showNotification() {
  chrome.notifications.create({
    type: 'basic',
    title: 'Time Shield Extension',
    message: 'Time to close that tab',
    iconUrl: 'shield.png',
  });
}

function changeBadgeContent(currentSeconds) {
  chrome.action.setBadgeText({
    text: `${`${Math.floor(currentSeconds / 60)}m`}`,
  });
  if (currentSeconds < (5 * 60)) {
    changeBadgeColor(Colors.red);
  } else {
    changeBadgeColor(Colors.blue);
  }
}
function changeBadgeColor(color) {
  chrome.action.setBadgeBackgroundColor({ color });
}

function clearCurrentInterval() {
  if (globals.currentIntervalId) {
    clearInterval(globals.currentIntervalId);
    globals.currentIntervalId = null;
  }
}

async function saveRemainingMinutes() { // TODO no son seconds?
  console.log('Lo que guarde en storage');
  console.log({
    remainingTime: globals.remainingSeconds,
  });
  chromeStorageService.set({
    remainingTime: globals.remainingSeconds,
  });
}
function getRemainingTimer(remaining, max, isNewDay) {
  if (isNewDay) {
    console.log('Day changed');
    return max;
  }

  return Math.min(remaining, max);
}

function start() {
  if (!globals.isAppRunning) {
    runBackground();
    globals.isAppRunning = true;
  }
}
/**
 * Recursively ping each 10 seconds to avoid the background task getting inactive
 */
(function ping() {
  console.log('ping');
  chromeStorageService.printStorage();
  setTimeout(ping, 10000);
}());

start();
