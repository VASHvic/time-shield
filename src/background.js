/* global chrome */
let isAppRunning = false;

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.message === 'runBackground') {
      console.log('Running background');
      if (isAppRunning === false) {
        runBackground();
        isAppRunning = true;
      }
    }
    if (request.message === 'ping') {
      console.log('pong');
    }
  },
);

function runBackground() {
  chrome.storage.local.get(['restrictedSites', 'maxAllowedTime', 'today', 'remainingTime']).then(({
    maxAllowedTime, restrictedSites, remainingTime, today,
  }) => {
    console.log('All variables in background\n', {
      maxAllowedTime, restrictedSites, remainingTime, today,
    });

    const dayToday = new Date().getDay();

    let remainingSeconds = calculateRemainingTimer(remainingTime, maxAllowedTime, today, dayToday);

    let isRestrictedWebsiteActive = false;
    let intervalId; // This will store the id of the intervals to call clearInterval

    chrome.windows.onFocusChanged.addListener(readTabName);
    chrome.tabs.onActivated.addListener(readTabName);
    chrome.runtime.onSuspend.addListener(() => {
      chrome.storage.local.set({
        remainingTime: remainingSeconds,
        today: dayToday,
      });
      clearRequestedInterval(intervalId);
    });
    chrome.runtime.onMessage.addListener((msg) => {
      console.log({ msg });
      console.log('pong');
    });
    chrome.alarms.onAlarm.addListener(() => {
      this.registration.showNotification('Time Shield Extension', {
        body: 'Time to close that tab',
        icon: 'shield.png',
      });
    });

    // Initialize recursive ping
    ping();

    function readTabName(t) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log(tabs[0]?.url);
        if (restrictedSites.some((w) => tabs[0]?.url.includes(w))) {
          if (!intervalId) {
            console.log('The website is restricted');
            chrome.storage.local.get(['remainingTime', 'today']).then(console.log);
            isRestrictedWebsiteActive = true;

            createInterval();
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
    }

    function createInterval() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (isRestrictedWebsiteActive) remainingSeconds -= 10;
        chrome.action.setBadgeText({
          text: `${`${Math.floor(remainingSeconds / 60)}m`}`,
        });
        console.log('remainingTimer 👀', remainingSeconds);
        if (remainingSeconds < 100) {
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

    function calculateRemainingTimer(remainingTime, maxAllowedTime, today, dayToday) {
      let remainingTimer;

      if (typeof remainingTime === 'number') {
        if (maxAllowedTime < remainingTime) {
          remainingTimer = maxAllowedTime;
        } else {
          remainingTimer = remainingTime;
        }
      } else {
        remainingTimer = 9999;
      }

      if (today !== dayToday) {
        remainingTimer = maxAllowedTime ?? 9999;
      }

      return remainingTimer;
    }
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

function ping() {
  setTimeout(() => {
    chrome.runtime.sendMessage('ping', () => {
      console.log('ping');
      printStorage();
    });
    ping();
  }, 10000);
}

function 
