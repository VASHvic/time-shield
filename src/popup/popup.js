/* global chrome */

const WorkerMessages = {
  updateTimer: 'updateTimer',
  start: 'start',
};

const Colors = {
  blue: '#0000FF',
  red: '#FF0000',
};

const defaultValues = ['restrictedSites', 'maxAllowedTime', 'today', 'disabled'];

function secondsToMinutesAsText(seconds) {
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
    changeBadgeColor(Colors.red);
  } else {
    changeBadgeColor(Colors.blue);
  }
}

function changeBadgeColor(color) {
  chrome.action.setBadgeBackgroundColor({ color });
}

const Popup = {
  limitedUrlInput: document.getElementById('limited-url-input'),
  timeInput: document.getElementById('time-input'),
  urlList: document.getElementById('lista-urls'),
  submitButton: document.getElementById('submit-button'),
  lockButton: document.getElementById('lock-button'),
  protectedSites: [],
  currentMaxAllowedTime: 0,
  restrictedSitesInfo: {},
  today: new Date().getDay(),

  async start() {
    console.log('Starting popup process...');
    await this.loadSettings();
    this.setupEventListeners();
  },

  async loadSettings() {
    try {
      const {
        restrictedSites,
        maxAllowedTime,
        today,
      } = await chrome.storage.local.get(defaultValues);
      this.protectedSites = restrictedSites ?? [];
      this.restrictedSitesInfo = await chrome.storage.local.get(this.protectedSites);
      this.restrictedSitesInfoToday = await chrome.storage.local.get(this.protectedSites.map((site) => `${site}_${this.today}`));
      console.log('🎁', this.restrictedSitesInfoToday);
      this.currentMaxAllowedTime = maxAllowedTime;
      this.timeInput.value = secondsToMinutesAsText(maxAllowedTime);
      await this.checkLock(today);
      this.displaySites();
    } catch {
      console.error('Failed to load settings');
    }
  },

  async checkLock(day) {
    const { isNewDay, disabled } = await chrome.storage.local.get(['isNewDay', 'disabled']);
    console.log('⌚', {
      day, today: this.today, isNewDay, disabled,
    });
    if (isNewDay && disabled) {
      await chrome.storage.local.set({ disabled: false, isNewDay: false });
    }
    this.submitButton.disabled = disabled;
    this.lockButton.disabled = disabled;
  },

  setupEventListeners() {
    this.submitButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSubmit(e).catch(console.error);
    });
    this.lockButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleLock(e).catch(console.error);
    });
  },

  displaySites() {
    this.protectedSites?.forEach((site) => this.addUrlListItem(site));
  },

  addUrlListItem(name) {
    const websiteListItem = this.createListItem(name);
    if (this.restrictedSitesInfo[name]) {
      this.addAditionalInfo(websiteListItem, name);
    }
    this.urlList.appendChild(websiteListItem);
  },

  createListItem(name) {
    const websiteListItem = document.createElement('li');
    websiteListItem.textContent = name;
    websiteListItem.addEventListener('click', () => {
      this.removeListItem(websiteListItem, name);
    });
    return websiteListItem;
  },

  addAditionalInfo(element, name) {
    const infoIcon = document.createElement('span');
    infoIcon.textContent = ' 💡';
    infoIcon.setAttribute('title', this.displayRestrictedSiteInfo(name));
    element.appendChild(infoIcon);
  },

  displayRestrictedSiteInfo(name) {
    const totalInfo = this.restrictedSitesInfo[name];
    const infoToday = this.restrictedSitesInfoToday[`${name}_${this.today}`];
    console.log({ infoToday, totalInfo });
    const minutes = secondsToMinutesAsText(totalInfo);
    const minutesToday = secondsToMinutesAsText(infoToday);
    const todaySentence = `\n ${Math.floor(minutesToday)} minutes wasted today`;
    if (minutes < 60) {
      return `${Math.floor(minutes)} minutes wasted in ${name}${todaySentence}`;
    }
    return `${(minutes / 60).toFixed(1)} hours wasted in ${name}${todaySentence}`;
  },

  removeListItem(item, name) {
    // TODO remove from storage keys related
    item.remove();
    this.protectedSites = this.protectedSites?.filter((site) => site !== name);
    this.updateStorage();
  },

  async handleSubmit() {
    const url = this.getUrl();
    if (url) {
      this.addUrlListItem(url);
      this.protectedSites.push(url);
      this.limitedUrlInput.value = '';
    }
    await this.updateStorage();
    sendWorkerMessage(WorkerMessages.start);
  },

  handleLock() {
    this.locked = true;
    this.submitButton.disabled = true;
    chrome.storage.local.set({ disabled: true });
  },

  getUrl() {
    let url = this.limitedUrlInput.value;
    if (url.includes('.')) {
      const splitUrl = url.split('.');
      url = splitUrl.length <= 2 ? splitUrl[0] : splitUrl[1];
    }
    return url;
  },

  async updateStorage() {
    const maxAllowedSeconds = minutesToSeconds(parseInt(this.timeInput.value, 10));
    console.log('🤔', this.currentMaxAllowedTime !== maxAllowedSeconds);
    const didTimeChange = this.currentMaxAllowedTime !== maxAllowedSeconds;
    if (didTimeChange) {
      console.log('Max allowed time changed');
      await chrome.storage.local.set({ remainingTime: maxAllowedSeconds });
      this.currentMaxAllowedTime = maxAllowedSeconds;
      sendWorkerMessage(WorkerMessages.updateTimer);
      if (maxAllowedSeconds) {
        changeBadgeContent(maxAllowedSeconds);
      }
    }

    await chrome.storage.local.set(
      { maxAllowedTime: maxAllowedSeconds, restrictedSites: this.protectedSites },
    );
  },
};

async function main() {
  // await chrome.storage.local.clear(); DEBUG PURPOSES
  await Popup.start();
}

document.addEventListener('DOMContentLoaded', (event) => {
  console.log(`DOM LOADED ${event}`);
  main();
});
