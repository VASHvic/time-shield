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
      this.handleSubmit();
    });
    
    // Lock button now shows warning dialog
    this.lockButton.addEventListener('click', () => {
      document.getElementById('warning-dialog').classList.add('show');
    });
    
    // Cancel lock
    document.getElementById('cancel-lock').addEventListener('click', () => {
      document.getElementById('warning-dialog').classList.remove('show');
    });
    
    // Confirm lock
    document.getElementById('confirm-lock').addEventListener('click', () => {
      this.handleLock();
      document.getElementById('warning-dialog').classList.remove('show');
    });
    
    // Close dialog when clicking outside
    document.getElementById('warning-dialog').addEventListener('click', (e) => {
      if (e.target.classList.contains('dialog')) {
        document.getElementById('warning-dialog').classList.remove('show');
      }
    });
  },

  displaySites() {
    this.protectedSites?.forEach((site) => this.addUrlListItem(site));
  },

  addUrlListItem(name) {
    const websiteListItem = this.createListItem(name);
    this.urlList.appendChild(websiteListItem);
  },

  createListItem(name) {
    const li = document.createElement('li');
    li.className = 'site-card';
    
    // Create main content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'site-content';
    
    // Create website name with favicon
    const nameDiv = document.createElement('div');
    nameDiv.className = 'site-name';
    const favicon = document.createElement('img');
    favicon.src = `https://www.google.com/s2/favicons?domain=${name}`;
    favicon.alt = '';
    favicon.className = 'site-favicon';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameDiv.appendChild(favicon);
    nameDiv.appendChild(nameSpan);
    
    // Create info container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'site-info';
    
    // Create remove button
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.textContent = '×';
    removeButton.title = 'Remove site';
    
    removeButton.onclick = (e) => {
      e.stopPropagation();
      li.classList.add('removing');
      setTimeout(() => {
        this.removeListItem(li, name);
      }, 300);
    };
    
    contentDiv.appendChild(nameDiv);
    contentDiv.appendChild(infoDiv);
    li.appendChild(contentDiv);
    li.appendChild(removeButton);
    
    // Load info immediately
    this.addAdditionalInfo(infoDiv, name);
    
    return li;
  },

  async addAdditionalInfo(element, name) {
    const info = await this.displayRestrictedSiteInfo(name);
    element.textContent = info;
  },

  displayRestrictedSiteInfo(name) {
    const infoToday = this.restrictedSitesInfo[`${name}_${this.today}`] || 0;
    const totalInfo = this.restrictedSitesInfo[name] || 0;
    console.log({ infoToday, totalInfo });
    const minutes = secondsToMinutesAsText(totalInfo);
    const minutesToday = secondsToMinutesAsText(infoToday);
    
    const formattedMinutes = minutes < 60 ? 
      `${Math.floor(minutes)}m` : 
      `${(minutes / 60).toFixed(1)}h`;
    const formattedToday = `${Math.floor(minutesToday)}m`;
    
    return `Today: ${formattedToday} • Total: ${formattedMinutes}`;
  },

  removeListItem(item, name) {
    const index = this.protectedSites.indexOf(name);
    if (index > -1) {
      this.protectedSites.splice(index, 1);
      item.addEventListener('transitionend', () => {
        item.remove();
      });
      this.updateStorage();
    }
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

  async handleLock() {
    const today = new Date().getDay();
    await chrome.storage.local.set({ disabled: today });
    this.timeInput.disabled = true;
    this.lockButton.disabled = true;
    this.lockButton.textContent = 'Time Locked';
    this.lockButton.style.opacity = '0.6';
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
