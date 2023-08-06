/* global chrome */

// DOM Elements
const limitedUrlInput = document.getElementById('limited-url-input');
const timeInput = document.getElementById('time-input');
const listaUrls = document.getElementById('lista-urls');
const submitButton = document.getElementById('submit-button');

// Variables
let protectedSites = [];
const currentMaxAllowedTime = timeInput.value;
// DEBUG
// chrome.storage.local.clear();

// Get stored data and setup
main();

// Event Listeners
submitButton.addEventListener('click', handleSubmit);

function main() {
  console.log('pop up main function running');
  chrome.storage.local.get(['restrictedSites', 'maxAllowedTime'])
    .then(({ maxAllowedTime, restrictedSites }) => {
      protectedSites = restrictedSites ?? [];
      timeInput.value = secondsToMinutes(maxAllowedTime ?? 1800);
      if (protectedSites.length > 0) {
        displaySites();
        sendWorkerMessage('runBackground');
      }
    });
}

function displaySites() {
  if (protectedSites.length > 0) {
    protectedSites.forEach((s) => addNewUrlListItem(s));
  }
}

function addNewUrlListItem(name) {
  const websiteListItem = createListItem(name);
  listaUrls.appendChild(websiteListItem);
}

function createListItem(name) {
  const websiteListItem = document.createElement('li');
  websiteListItem.textContent = name;

  websiteListItem.addEventListener('click', () => {
    removeListItem(websiteListItem, name);
  });

  return websiteListItem;
}

function removeListItem(item, name) {
  item.remove();
  protectedSites = protectedSites.filter((site) => site !== name);
  updateStorage();
}

function handleSubmit(e) {
  console.log('pasa per update storage');
  e.preventDefault();
  if (limitedUrlInput.value) {
    const url = getUrl();
    addNewUrlListItem(url);
    protectedSites.push(url);
  }
  updateStorage();
  limitedUrlInput.value = '';
  sendWorkerMessage('runBackground');
}

function getUrl() {
  let url = limitedUrlInput.value;
  if (url.includes('.')) {
    const splitUrl = url.split('.');
    url = splitUrl.length <= 2 ? splitUrl[0] : splitUrl[1];
  }
  return url;
}

function updateStorage() {
  const maxAllowedSeconds = String(parseInt(timeInput.value, 10) * 60);
  chrome.storage.local.set({
    restrictedSites: protectedSites,
    maxAllowedTime: maxAllowedSeconds,
  });
  if (isMaxAllowedTimeChange()) {
    console.log('Max allowed time changed');
    chrome.storage.local.set({
      remainingTime: maxAllowedSeconds,
    });
    sendWorkerMessage('updateTimer');
  } else {
    console.log('Max time stays the same');
  }
}

function sendWorkerMessage(msg) {
  console.log('sending worker message');
  chrome.runtime.sendMessage({ message: msg });
}

function isMaxAllowedTimeChange() {
  return currentMaxAllowedTime !== timeInput.value;
}
function secondsToMinutes(seconds) {
  return String(parseInt(seconds, 10) / 60);
}
