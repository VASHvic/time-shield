/* global chrome */

const WorkerMessages = {
  runBackGround: 'runBackground',
  updateTimer: 'updateTimer',
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

    this.popupProtectedSites = [];
    this.currentMaxAllowedTime = 0;
  }

  async start() {
    console.log('Starting popup process...');
    await this.loadSettings();
    this.setupEventListeners();
    if (this.popupProtectedSites.length > 0 && this.currentMaxAllowedTime) {
      sendWorkerMessage(WorkerMessages.runBackGround);
    }
  }

  async loadSettings() {
    const { restrictedSites, maxAllowedTime } = await this.storageService.get();
    this.popupProtectedSites = restrictedSites;
    this.currentMaxAllowedTime = maxAllowedTime;
    this.timeInput.value = secondsToMinutes(maxAllowedTime);
    this.displaySites();
  }

  setupEventListeners() {
    this.submitButton.addEventListener('click', async (e) => this.handleSubmit(e));
  }

  displaySites() {
    this.popupProtectedSites.forEach((site) => this.addNewUrlListItem(site));
  }

  addNewUrlListItem(name) {
    const websiteListItem = this.createListItem(name);
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

  removeListItem(item, name) {
    item.remove();
    this.popupProtectedSites = this.popupProtectedSites.filter((site) => site !== name);
    this.updateStorage();
  }

  async handleSubmit(e) {
    e.preventDefault();
    const url = this.getUrl();
    if (url) {
      this.addNewUrlListItem(url);
      this.popupProtectedSites.push(url);
      this.limitedUrlInput.value = '';
    }
    this.updateStorage();
    console.log('click pasa');
    sendWorkerMessage(WorkerMessages.runBackGround);
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

    if (this.currentMaxAllowedTime !== maxAllowedSeconds) {
      console.log('Max allowed time changed');
      await this.storageService.set({ remainingTime: maxAllowedSeconds });
      this.currentMaxAllowedTime = maxAllowedSeconds;
      sendWorkerMessage(WorkerMessages.updateTimer);
    }

    await this.storageService.set(
      { maxAllowedTime: maxAllowedSeconds, restrictedSites: this.popupProtectedSites },
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
  console.log('sending worker message');
  chrome.runtime.sendMessage({ message: msg });
}

async function main() {
  const storageService = new StorageService({ storage: chrome.storage.local, defaultValues: ['restrictedSites', 'maxAllowedTime'] });
  const popup = new Popup({ storageService });
  await popup.start();
}

main();
