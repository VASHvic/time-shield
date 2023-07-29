/* global chrome */

const saveBtn = document.getElementById('save-btn');
const nameInput = document.getElementById('name-input');

saveBtn.addEventListener('click', () => {
  console.log('Options.js');
  const name = nameInput.value;

  chrome.storage.local.set({
    name,
  });
  nameInput.value = name; // antes tenia res.name
});
