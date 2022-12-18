var twitterActive = false;
var twitterTimer =0;
const interValEnd = setInterval(()=> {
    Boolean(twitterActive) && (twitterTimer+=10);
    console.log({twitterActive,twitterTimer});
},10000);

function readTabName(t){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        console.log(tabs[0]?.url);
        if(tabs[0]?.url.includes("twitter")){
            twitterActive=true;
        }else{
            twitterActive=false;
            // guardar en storage el temps
        }

       }
       )
}

chrome.windows.onFocusChanged.addListener(readTabName);

chrome.tabs.onActivated.addListener(readTabName)
// chrome.runtime.onSuspend.addListener() guardar timer y tancar timeout

chrome.alarms.create({
  periodInMinutes: 1/60,
});

chrome.alarms.onAlarm.addListener((alarm)=> {
    
//   chrome.storage.local.get(["timer"], (res)=> {
    // const time = res.timer ?? 0;
    // chrome.storage.local.set({
    //   timer: time +1
    // });   
    // chrome.action.setBadgeText({
    //   text:`${time + 1}`
    // });

    this.registration.showNotification("Time Guardian Extension", {
      body: "Close Twitter",
      icon: "shield.png"
    })
//   });
});