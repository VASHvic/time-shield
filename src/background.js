chrome.storage.local.get(["restrictedSites", "maxAllowedTime", "today", "remainingTime"]).then(({maxAllowedTime,restrictedSites,remainingTime,today})=>
{
    console.log("totes les variables en bckground\n",{maxAllowedTime,restrictedSites,remainingTime,today});
    
    const dayToday = new Date().getDay();

    let remainingTimer;

    if(typeof remainingTime === "number") {

        if(maxAllowedTime <  remainingTime){
            remainingTimer = maxAllowedTime;
        }else {
            remainingTimer = remainingTime;
        }
    }else{
        remainingTimer = 9999;
    }

    if (today !== dayToday) {
        remainingTimer = maxAllowedTime ?? 9999;
    }     

    let restrictedWebsiteActive = false;    
    let interValEnd; // This will store the id of the intervals to call clearInterval



    function readTabName(t) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            console.log(tabs[0]?.url);
            if (restrictedSites.split(',').some(w=>tabs[0]?.url.includes(w))){
                if (!Boolean(interValEnd)) {
                    console.log("La web esta prohibida");
                    chrome.storage.local.get(["remainingTime", "today"]).then(console.log)
                    restrictedWebsiteActive = true;
      
                    creteInterVal()
                }
            } else {
     
                restrictedWebsiteActive = false;
                chrome.storage.local.set({
                    "remainingTime": remainingTimer,
                    "today": dayToday

                });
                console.log("La web no esta prohibida, vaiga cancelar el intervalo");
                chrome.storage.local.get(["remainingTime", "today"]).then(console.log)
                Boolean(interValEnd) && clearRequestedInterval(interValEnd);
            }
        }
        )
    }

    function creteInterVal() {
        if (Boolean(interValEnd)) return;
        interValEnd = setInterval(() => {
            console.log("aso es dins del callback del interbbal");
            restrictedWebsiteActive && (remainingTimer -= 10);
            chrome.action.setBadgeText({
                text: `${Math.floor(remainingTimer / 60) + 'm'}`
            });
            console.log("remainingTmer 👀",remainingTimer);
            if(remainingTimer < 100){
                console.log("deuria cambiar el badge a roig pero no va");
                chrome.action.setBadgeBackgroundColor({color: '#FF0000'});
                if (restrictedWebsiteActive && remainingTimer <= 0) {
                    createAlarm();
                }
            }
        }, 10000);
    }

    function createAlarm() {
        chrome.alarms.create({
            when: new Date().getMilliseconds()
        });
    }
    function clearRequestedInterval(clearRequestedInterval) {
        clearInterval(clearRequestedInterval);
        interValEnd = undefined;
    }

    chrome.windows.onFocusChanged.addListener(readTabName);

    chrome.tabs.onActivated.addListener(readTabName);

    chrome.runtime.onSuspend.addListener(() => {
        chrome.storage.local.set({
            "remainingTime": remainingTimer,
            "today": dayToday
        });
        clearRequestedInterval(interValEnd)

    });
    chrome.runtime.onMessage.addListener((msg)=>{
        console.log({msg});
        console.log("pong");
    })

    chrome.alarms.onAlarm.addListener((alarm) => {
        this.registration.showNotification("Time Shield Extension", {
            body: "Time to close that tab",
            icon: "shield.png"
        });
    });

     var wakeup = function () {
        setTimeout(function () {
            chrome.runtime.sendMessage('ping', function () {
                console.log("ping");
                chrome.storage.local.get(["restrictedSites", "maxAllowedTime", "today", "remainingTime"]).then(console.log)
            });
            wakeup();
        }, 10000);
    }
    wakeup();
});