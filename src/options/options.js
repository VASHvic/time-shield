const nameInput = document.getElementById("name-input");
const saveBtn = document.getElementById("save-btn");

saveBtn.addEventListener("click",()=> {
  const name = nameInput.value;

  chrome.storage.local.set({
    name
  });
  nameInput.value = res.name;

});
