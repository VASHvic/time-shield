/* global chrome */

class StorageService {
  constructor(storage, defaultValues) {
    this.defaultValues = defaultValues;
    this.localStorage = storage;
  }

  async get() {
    const values = await this.localStorage.get(this.defaultValues);
    return values;
  }

  async set(values) {
    await this.localStorage.set(values);
  }
}

class Popup {
  constructor() {
    this.limitedUrlInput = document.getElementById('limited-url-input');
    this.timeInput = document.getElementById('time-input');
    this.listaUrls = document.getElementById('lista-urls');
    this.submitButton = document.getElementById('submit-button');

    this.storageService = new StorageService(chrome.storage.local, ['restrictedSites', 'maxAllowedTime']);

    this.popupProtectedSites = [];
    this.currentMaxAllowedTime = 0;
  }

  async start() {
    console.log('Starting popup process...');
    await this.loadSettings();
    this.setupEventListeners();
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
    console.log('fin set up events');
  }

  displaySites() {
    this.popupProtectedSites.forEach((site) => this.addNewUrlListItem(site));
  }

  addNewUrlListItem(name) {
    const websiteListItem = this.createListItem(name);
    this.listaUrls.appendChild(websiteListItem);
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
      this.updateStorage();
      this.limitedUrlInput.value = '';
    }
    console.log('click pasa');
    if (this.currentMaxAllowedTime !== this.timeInput.value) {
      console.log('Max allowed time changed');
      await this.storageService.set({ maxAllowedTime: minutesToSeconds(this.timeInput.value) });
      sendWorkerMessage('updateTimer');
    }
    sendWorkerMessage('runBackground');
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
    const maxAllowedSeconds = parseInt(this.timeInput.value, 10) * 60;

    if (this.currentMaxAllowedTime !== maxAllowedSeconds) {
      console.log('Max allowed time changed');
      this.storageService.set({ remainingTime: maxAllowedSeconds });
      this.currentMaxAllowedTime = maxAllowedSeconds;
      sendWorkerMessage('updateTimer');
    } else {
      console.log('Max time stays the same');
    }

    await this.storageService.set(
      { maxAllowedTime: maxAllowedSeconds, restrictedSites: this.popupProtectedSites },
    );
    sendWorkerMessage('runBackground');
  }
}

function secondsToMinutes(seconds) {
  return String(seconds / 60);
}
function minutesToSeconds(minutes) {
  return minutes * 60;
}

function sendWorkerMessage(msg) {
  console.log('sending worker message');
  chrome.runtime.sendMessage({ message: msg });
}

async function startPopupProcess() {
  const popup = new Popup();
  await popup.start();
}

startPopupProcess();
