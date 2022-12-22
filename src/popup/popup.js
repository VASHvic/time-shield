const sitesArea = document.getElementById("sites");
const limitedUrlInput = document.getElementById("limited-url-input");
const timeInput = document.getElementById("time-input");
const listaUrls = document.getElementById("lista-urls");
const submitButton = document.getElementById("submit-button");

let protectedSites = "";

chrome.storage.local.get(["restrictedSites", "maxAllowedTime"]).then(({maxAllowedTime,restrictedSites})=>{


  protectedSites+=restrictedSites;
  timeInput.value=maxAllowedTime;

  if(protectedSites.length>1){
  protectedSites.split(',').forEach(s=>addNewUrlListItem(s));
  }
  
  
  submitButton.addEventListener("click", (e)=>{
    e.preventDefault();
    let url = limitedUrlInput.value;
    if(url.includes('.')){
      const splitUrl = url.split('.');
      splitUrl.length <= 2 ? url =splitUrl[0] : url =splitUrl[1];    
    };

    addNewUrlListItem(url);  

    protectedSites === "" ? protectedSites+=url : protectedSites+=','+url;

    chrome.storage.local.set({
      "restrictedSites":protectedSites,
      "maxAllowedTime":timeInput.value
    });

  });


  function addNewUrlListItem(name){
    
    const websiteListItem = document.createElement('li');
    websiteListItem.textContent =name
    listaUrls.appendChild(websiteListItem);
    websiteListItem.addEventListener("click", ()=>{
      websiteListItem.remove();
      protectedSites =protectedSites.replace(name,"").replace(",,",',').replace(/^,/, "");

      chrome.storage.local.set({
        "restrictedSites":protectedSites.trim(),
        "maxAllowedTime":timeInput.value
      });

    })
  }

});













