/* global chrome */

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
}

class Popup {
  constructor({ storageService }) {
    this.limitedUrlInput = document.getElementById('limited-url-input');
    this.timeInput = document.getElementById('time-input');
    this.urlList = document.getElementById('lista-urls');
    this.submitButton = document.getElementById('submit-button');

    this.storageService = storageService;
    this.protectedSites = [];
    this.currentMaxAllowedTime = 0;
  }

  async start() {
    console.log('Starting popup process...');
    await this.loadSettings();
    this.setupEventListeners();
  }

  async loadSettings() {
    const { restrictedSites, maxAllowedTime } = await this.storageService.get();
    this.protectedSites = restrictedSites ?? [];
    this.restrictedSitesInfo = await this.storageService.get(this.protectedSites);
    this.currentMaxAllowedTime = maxAllowedTime;
    this.timeInput.value = secondsToMinutes(maxAllowedTime);
    this.displaySites();
  }

  setupEventListeners() {
    this.submitButton.addEventListener('click', async (e) => this.handleSubmit(e));
  }

  displaySites() {
    this.protectedSites?.forEach((site) => this.addUrlListItem(site));
  }

  addUrlListItem(name) {
    const websiteListItem = this.createListItem(name);
    if (this.restrictedSitesInfo[name]) {
      this.addAditionalInfo(websiteListItem, name);
    }
    this.urlList.appendChild(websiteListItem);
  }

  createListItem(name) {
    const websiteListItem = document.createElement('li');
    websiteListItem.textContent = name;
    websiteListItem.addEventListener('click', () => {
      this.removeListItem(websiteListItem, name);
    });
    return websiteListItem;
  }

  addAditionalInfo(element, name) {
    const infoIcon = document.createElement('span');
    infoIcon.textContent = ' 💡';
    infoIcon.setAttribute('title', this.displayRestrictedSiteInfo(name));
    element.appendChild(infoIcon);
  }

  displayRestrictedSiteInfo(name) {
    const info = this.restrictedSitesInfo[name];
    const minutes = secondsToMinutes(info);
    if (minutes < 60) {
      return `${Math.floor(minutes)} minutes wasted in ${name}`;
    }
    return `${minutes / 60} hours wasted in ${name}`;
  }

  removeListItem(item, name) {
    item.remove();
    this.protectedSites = this.protectedSites?.filter((site) => site !== name);
    this.updateStorage();
  }

  async handleSubmit(e) {
    e.preventDefault();
    const url = this.getUrl();
    if (url) {
      this.addUrlListItem(url);
      this.protectedSites.push(url);
      this.limitedUrlInput.value = '';
    }
    await this.updateStorage();
    sendWorkerMessage(WorkerMessages.start);
  }

  getUrl() {
    let url = this.limitedUrlInput.value;
    if (url.includes('.')) {
      const splitUrl = url.split('.');
      url = splitUrl.length <= 2 ? splitUrl[0] : splitUrl[1];
    }
    return url;
  }

  async updateStorage() {
    const maxAllowedSeconds = minutesToSeconds(parseInt(this.timeInput.value, 10));
    console.log('🤔', this.currentMaxAllowedTime !== maxAllowedSeconds);
    const didTimeChange = this.currentMaxAllowedTime !== maxAllowedSeconds;
    if (didTimeChange) {
      console.log('Max allowed time changed');
      await this.storageService.set({ remainingTime: maxAllowedSeconds });
      this.currentMaxAllowedTime = maxAllowedSeconds;
      sendWorkerMessage(WorkerMessages.updateTimer);
      if (maxAllowedSeconds) {
        changeBadgeContent(maxAllowedSeconds);
      }
    }

    await this.storageService.set(
      { maxAllowedTime: maxAllowedSeconds, restrictedSites: this.protectedSites },
    );
  }
}

function secondsToMinutes(seconds) {
  if (typeof seconds !== 'number') return '';
  return String(seconds / 60);
}

function minutesToSeconds(minutes) {
  return minutes * 60;
}

function sendWorkerMessage(msg) {
  console.log(`sending ${msg} worker message`);
  chrome.runtime.sendMessage({ message: msg });
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

async function main() {
  // await chrome.storage.local.clear();
  const chromeStorageService = new StorageService({ storage: chrome.storage.local, defaultValues: ['restrictedSites', 'maxAllowedTime'] });
  const popup = new Popup({ storageService: chromeStorageService });
  await popup.start();
}

main();
