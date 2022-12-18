var div=document.createElement("div"); 

// chrome.tabs.query({ active: true, currentWindow: true }).then(tabs =>urlVisited.textContent = tabs[0].url);
// window.addEventListener("visibilitychange",()=>{
//   console.log(location.href);
// });


// const timeElement = document.getElementById("time");
// const nameElement = document.getElementById("name");
// const timerElement = document.getElementById("timer");
// console.log(timer);


// function updateTimeElements(){  
//   chrome.storage.local.get(["timer"], (res)=> {
//     const time = res.timer ?? 0;
//     timerElement.textContent = ` The timer is at ${time} seconds`;
//   });
  
//   const currentTime = new Date().toLocaleTimeString();
//   timeElement.textContent = `The time is ${currentTime}`
// }
// updateTimeElements()
// setInterval(updateTimeElements,1000);

// chrome.action.setBadgeText({
//   text: "TIME"
// });

// chrome.storage.local.get(["name"], (res)=> {
//   nameElement.textContent = `Your name is: ${res.name ?? "not set yet"}`;
// });