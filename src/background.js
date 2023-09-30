/* global chrome */
const globals = {
  isAppRunning: false,
  readingTabName: false,
  isRestrictedWebsiteActive: false,
  remainingSeconds: undefined,
  currentIntervalId: undefined,
  currentRestrictedWebsite: undefined,
};

const WorkerMessages = {
  updateTimer: 'updateTimer',
  start: 'start',
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
    const { restrictedSites } = await this.localStorage.get(['restrictedSites']);
    console.log('PRINTING STORAGE');
    this.localStorage.get(['maxAllowedTime', 'today', 'remainingTime', ...restrictedSites]).then(console.log);
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
    maxAllowedTime, remainingTime, today,
  } = await chromeStorageService.get(['maxAllowedTime', 'today', 'remainingTime']);
  console.log('INITIAL DATA LOADED');
  if (!maxAllowedTime) return;
  chromeStorageService.set({ today: new Date().getDay() });
  console.log('FIRST FUNCTION CALL');
  globals.remainingSeconds = getRemainingTimer(remainingTime, maxAllowedTime, today);
  changeBadgeContent(globals.remainingSeconds);
  // TODO: probar un altra funció en lloc de redtabname en focuschanged a vore si funciona y posarli un log diferent o algo
  chrome.windows.onFocusChanged.addListener(readTabName);
  chrome.tabs.onActivated.addListener(readTabName);
  chrome.tabs.onCreated.addListener(readTabName);
  chrome.tabs.onUpdated.addListener(readTabName);
  chrome.runtime.onSuspend.addListener(() => {
    saveRemainingMinutes();
    clearRequestedInterval(globals.currentIntervalId);
  });
  // TODO: listener para cuando está en segundo plano?

  async function readTabName() {
    console.log('Reading tab name');
    if (globals.readingTabName) return;
    globals.readingTabName = true;
    const { restrictedSites } = await chromeStorageService.get(['restrictedSites']);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs[0]?.url);
      const restrictedWebsite = restrictedSites.find((w) => tabs[0]?.url.includes(w));
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
        clearRequestedInterval(globals.currentIntervalId);
        globals.currentIntervalId = undefined;
      }
    });
    // To avoid calling this function in multiple listeners
    setTimeout(() => {
      globals.readingTabName = false;
    }, 100);
  }
  /**
   * Check each 10 seconds if the global isRestrictedWebsite
   * is active and substract seconds from global count
  */
  function checkCurrentBrowserInfoInterval() {
    if (globals.currentIntervalId) return;
    globals.currentIntervalId = setInterval(async () => {
      if (globals.isRestrictedWebsiteActive) {
        const restrictedSite = globals.currentRestrictedWebsite;
        const currentSeconds = await chromeStorageService.get(restrictedSite);
        currentSeconds[`${restrictedSite}`] = parseInt(currentSeconds[`${restrictedSite}`], 10) || 0;
        console.log('🌞', currentSeconds);
        chromeStorageService.set(
          { [restrictedSite]: currentSeconds[restrictedSite] += 10 },
        );
        globals.remainingSeconds -= 10;
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
    changeBadgeColor('#FF0000');
  } else {
    changeBadgeColor('#0000FF');
  }
}
function changeBadgeColor(color) {
  chrome.action.setBadgeBackgroundColor({ color });
}

function clearRequestedInterval(intervalIdToDelete) {
  if (intervalIdToDelete) {
    clearInterval(intervalIdToDelete);
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
function getRemainingTimer(remaining, max, savedDay) {
  const currentDay = new Date().getDay();

  if (savedDay !== currentDay) {
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
 * Recursibe ping each 10 seconds to avoid the background task getting inactive
 */
(function ping() {
  console.log('ping');
  chromeStorageService.printStorage();
  setTimeout(ping, 10000);
}());

start();
