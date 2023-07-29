/* global chrome */

// DOM Elements
const limitedUrlInput = document.getElementById('limited-url-input');
const timeInput = document.getElementById('time-input');
const listaUrls = document.getElementById('lista-urls');
const submitButton = document.getElementById('submit-button');

// Variables
let protectedSites = [];

// DEBUG
// chrome.storage.local.clear();

// Get stored data and setup
main();

// Event Listeners
submitButton.addEventListener('click', handleSubmit);

function main() {
  chrome.storage.local.get(['restrictedSites', 'maxAllowedTime'])
    .then(({ maxAllowedTime, restrictedSites }) => {
      protectedSites = restrictedSites ?? [];
      timeInput.value = maxAllowedTime ?? 1800;
      if (protectedSites.length > 0) {
        displaySites();
        sendWorkerMessage();
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
  e.preventDefault();
  const url = getUrl();
  addNewUrlListItem(url);
  protectedSites.push(url);
  updateStorage();
  limitedUrlInput.value = '';
  sendWorkerMessage();
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
  chrome.storage.local.set({
    restrictedSites: protectedSites,
    maxAllowedTime: timeInput.value,
  });
}

function sendWorkerMessage() {
  chrome.runtime.sendMessage({ message: 'runBackground' });
}
