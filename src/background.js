/* global chrome */
let readingTabName = false;
let remainingSeconds;

const WorkerMessages = {
  updateTimer: 'updateTimer',
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === WorkerMessages.updateTimer) {
    console.log('Updating timer');
    updateTimerFromStorage();
  }
});

function runBackground() {
  chrome.storage.local.get(['restrictedSites', 'maxAllowedTime', 'today', 'remainingTime']).then(({
    maxAllowedTime, restrictedSites, remainingTime, today,
  }) => {
    console.log('All variables in background\n', {
      maxAllowedTime, restrictedSites, remainingTime, today,
    });

    const dayToday = new Date().getDay();

    remainingSeconds = calculateRemainingTimer(remainingTime, maxAllowedTime, today, dayToday);

    let isRestrictedWebsiteActive = false;
    let intervalId; // This will store the id of the intervals to call clearInterval

    chrome.windows.onFocusChanged.addListener(readTabName);
    chrome.tabs.onActivated.addListener(readTabName);
    chrome.tabs.onCreated.addListener(readTabName);
    chrome.tabs.onUpdated.addListener(readTabName);
    chrome.runtime.onSuspend.addListener(() => {
      chrome.storage.local.set({
        remainingTime: remainingSeconds,
        today: dayToday,
      });
      clearRequestedInterval(intervalId);
    });

    chrome.runtime.onMessage.addListener((msg) => {
      console.log('this executed the onMessage Listener', { msg });
    });

    chrome.alarms.onAlarm.addListener(() => {
      chrome.notifications.create('notification-id', {
        type: 'basic',
        title: 'Time Shield Extension',
        message: 'Time to close that tab',
        iconUrl: 'shield.png',
      });
    });

    function readTabName() {
      // TODO: i have to read the restricted site array brecause removing
      // elements doesnt work for the day
      if (readingTabName) return;
      readingTabName = true;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log(tabs[0]?.url);
        if (restrictedSites.some((w) => tabs[0]?.url.includes(w))) {
          if (!intervalId) {
            console.log('The website is restricted');
            chrome.storage.local.get(['remainingTime', 'today']).then(console.log);
            isRestrictedWebsiteActive = true;
            checkCurrentBrowserInfoInterval();
          }
        } else {
          isRestrictedWebsiteActive = false;
          chrome.storage.local.set({
            remainingTime: remainingSeconds,
            today: dayToday,

          });
          console.log(`The website is not restricted, canceling the interval${intervalId}`);
          chrome.storage.local.get(['remainingTime', 'today']).then(console.log);
          if (intervalId) {
            clearRequestedInterval(intervalId);
          }
        }
      });
      readingTabName = false;
    }

    function checkCurrentBrowserInfoInterval() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (isRestrictedWebsiteActive) remainingSeconds -= 10;
        chrome.action.setBadgeText({
          text: `${`${Math.floor(remainingSeconds / 60)}m`}`,
        });
        console.log('remainingTimer 👀', remainingSeconds);
        if (remainingSeconds < (5 * 60)) {
          // TODO: color no vuelve a ponerse normal is esta  en rojo
          chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
          if (isRestrictedWebsiteActive && remainingSeconds <= 0) {
            createAlarm();
          }
        }
      }, 10000);
    }

    function clearRequestedInterval(intervalIdToDelete) {
      clearInterval(intervalIdToDelete);
      intervalId = undefined;
    }

    function calculateRemainingTimer(remaining, max, savedDay, currentDay) {
      if (savedDay !== currentDay) {
        return max ?? 9999;
      }

      return typeof remaining === 'number' ? Math.min(remaining, max) : 9999;
    }
  });
}

function updateTimerFromStorage() {
  chrome.storage.local.get('maxAllowedTime', ({ maxAllowedTime }) => {
    remainingSeconds = parseInt(maxAllowedTime, 10);
    console.log(`Remaining seconds from the listener: ${remainingSeconds}`);
  });
}
function createAlarm() {
  chrome.alarms.create({
    when: new Date().getMilliseconds(),
  });
}
function printStorage() {
  console.log('STORAGE: ');
  chrome.storage.local.get(['restrictedSites', 'maxAllowedTime', 'today', 'remainingTime']).then(console.log);
}
(function start() {
  runBackground();
}());

(function ping() {
  console.log('ping');
  printStorage();
  setTimeout(ping, 10000);
}());
