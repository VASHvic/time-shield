/* global chrome */
let isAppRunning = false;
let readingTabName = false;
let isRestrictedWebsiteActive = false;
let remainingSeconds;
let currentIntervalId; // This will store the id of the intervals to call clearInterval

const WorkerMessages = {
  updateTimer: 'updateTimer',
  start: 'start',
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === WorkerMessages.updateTimer) {
    updateTimerFromStorage();
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

  remainingSeconds = getRemainingTimer(remainingTime, maxAllowedTime, today);

  chrome.windows.onFocusChanged.addListener(readTabName);
  chrome.tabs.onActivated.addListener(readTabName);
  chrome.tabs.onCreated.addListener(readTabName);
  chrome.tabs.onUpdated.addListener(readTabName);
  chrome.runtime.onSuspend.addListener(() => {
    saveCurrentDataToStorage();
    clearRequestedInterval(currentIntervalId);
  });

  function readTabName() {
    console.log('Reading tab name');
    if (readingTabName) return;
    readingTabName = true;
    chrome.storage.local.get(['restrictedSites']).then(({ restrictedSites }) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log(tabs[0]?.url);
        if (restrictedSites?.some((w) => tabs[0]?.url.includes(w))) {
          if (!currentIntervalId) {
            console.log('The website is restricted');
            printStorage();
            isRestrictedWebsiteActive = true;
            checkCurrentBrowserInfoInterval();
          }
        } else {
          isRestrictedWebsiteActive = false;
          saveCurrentDataToStorage(); // TODO: crec que no sería necesaria esta cridada
          console.log(`The website is not restricted, canceling the interval${currentIntervalId}`);
          printStorage();
          clearRequestedInterval(currentIntervalId);
          currentIntervalId = undefined;
        }
      });
      readingTabName = false;
    });
  }

  function checkCurrentBrowserInfoInterval() {
    if (currentIntervalId) return;
    currentIntervalId = setInterval(() => {
      if (isRestrictedWebsiteActive) remainingSeconds -= 10;
      console.log('remainingTimer 👀', remainingSeconds);
      changeBadgeContent(remainingSeconds);
      if (isRestrictedWebsiteActive && remainingSeconds <= 0) {
        showNotification();
      }
    }, 10000);
  }
}

function updateTimerFromStorage() {
  chrome.storage.local.get('maxAllowedTime', ({ maxAllowedTime }) => {
    remainingSeconds = parseInt(maxAllowedTime, 10);
    console.log(`Remaining seconds from the listener: ${remainingSeconds}`);
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
    remainingTime: remainingSeconds,
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
  if (!isAppRunning) {
    runBackground();
    isAppRunning = true;
  }
}

(function ping() {
  console.log('ping');
  printStorage();
  setTimeout(ping, 10000);
}());

start();
