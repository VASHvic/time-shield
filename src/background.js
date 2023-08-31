/* global chrome */
const globals = {
  isAppRunning: false,
  readingTabName: false,
  isRestrictedWebsiteActive: false,
  remainingSeconds: undefined,
  currentIntervalId: undefined,
};

const WorkerMessages = {
  updateTimer: 'updateTimer',
  start: 'start',
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === WorkerMessages.updateTimer) {
    updateCurrentTimer();
  }
  if (request.message === WorkerMessages.start) {
    start();
  }
});

async function runBackground() {
  const {
    maxAllowedTime, remainingTime, today,
  } = await chrome.storage.local.get(['maxAllowedTime', 'today', 'remainingTime']);
  if (!maxAllowedTime) return;

  globals.remainingSeconds = getRemainingTimer(remainingTime, maxAllowedTime, today);

  chrome.windows.onFocusChanged.addListener(readTabName);
  chrome.tabs.onActivated.addListener(readTabName);
  chrome.tabs.onCreated.addListener(readTabName);
  chrome.tabs.onUpdated.addListener(readTabName);
  chrome.runtime.onSuspend.addListener(() => {
    saveCurrentDataToStorage();
    clearRequestedInterval(globals.currentIntervalId);
  });

  async function readTabName() {
    console.log('Reading tab name');
    if (globals.readingTabName) return;
    globals.readingTabName = true;
    const { restrictedSites } = await chrome.storage.local.get(['restrictedSites']);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs[0]?.url);
      if (restrictedSites?.some((w) => tabs[0]?.url.includes(w))) {
        if (!globals.currentIntervalId) {
          console.log('The website is restricted');
          printStorage();
          globals.isRestrictedWebsiteActive = true;
          checkCurrentBrowserInfoInterval();
        }
      } else {
        globals.isRestrictedWebsiteActive = false;
        // saveCurrentDataToStorage(); // TODO: crec que no sería necesaria esta cridada
        console.log(`The website is not restricted, canceling the interval${globals.currentIntervalId}`);
        printStorage();
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
    globals.currentIntervalId = setInterval(() => {
      if (globals.isRestrictedWebsiteActive) globals.remainingSeconds -= 10;
      console.log('remainingTimer 👀', globals.remainingSeconds);
      changeBadgeContent(globals.remainingSeconds);
      if (globals.isRestrictedWebsiteActive && globals.remainingSeconds <= 0) {
        showNotification();
      }
    }, 10000);
  }
}

function updateCurrentTimer() {
  chrome.storage.local.get('maxAllowedTime', ({ maxAllowedTime }) => {
    globals.remainingSeconds = parseInt(maxAllowedTime, 10);
    console.log(`Remaining seconds from the listener: ${globals.remainingSeconds}`);
  });
}

function showNotification() {
  chrome.notifications.create({
    type: 'basic',
    title: 'Time Shield Extension',
    message: 'Time to close that tab',
    iconUrl: 'shield.png',
  });
}
function printStorage() {
  console.log('STORAGE: ');
  chrome.storage.local.get(['restrictedSites', 'maxAllowedTime', 'today', 'remainingTime']).then(console.log);
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

function saveCurrentDataToStorage() {
  chrome.storage.local.set({
    remainingTime: globals.remainingSeconds,
    today: new Date().getDay(),
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
  printStorage();
  setTimeout(ping, 10000);
}());

start();
