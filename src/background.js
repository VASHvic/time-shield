chrome.storage.local.get(["restrictedSites", "maxAllowedTime", "today", "remainingTime"]).then(({maxAllowedTime,restrictedSites,remainingTime,today})=>
{
    console.log("totes les variables en bckground\n",{maxAllowedTime,restrictedSites,remainingTime,today});
    
    const dayToday = new Date().getDay();

    let remainingTimer = typeof remainingTime === "number" ? remainingTime : maxAllowedTime ?? 9999;

    if (today !== dayToday) {
        remainingTimer = maxAllowedTime ?? 9999;
    }     

    let restrictedWebsiteActive = false;
    let interValEnd;



    function readTabName(t) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            console.log(tabs[0]?.url);
            if (restrictedSites.split(',').some(w=>tabs[0]?.url.includes(w))){
                console.log("ENTRAAA!!")
                console.log("la boleana de interbal id", !Boolean(interValEnd));
                if (!Boolean(interValEnd)) {
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
                chrome.storage.local.get(["remainingTime", "today"]).then(console.log)
                Boolean(interValEnd) && clearRequestedInterval(interValEnd);
            }
        }
        )
    }

    function creteInterVal() {
        if (Boolean(interValEnd)) return;
        console.log("create Interval s ha cridat");
        interValEnd = setInterval(() => {
            restrictedWebsiteActive && (remainingTimer -= 10);
            chrome.action.setBadgeText({
                text: `${remainingTimer}` // dividir entre 60 si vull traure els minuts
            });
            if (restrictedWebsiteActive && remainingTimer <= 0) {
                createAlarm()
                chrome.storage.local.get(["remainingTime", "today"]).then(console.log)


            }
            console.log({ dayToday, twitterActive: restrictedWebsiteActive, twitterTimer: remainingTimer });
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
        console.log("intervalEnd despues de borrarla val ", interValEnd);
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
        console.log(msg);
        console.log("pong");
    })

    chrome.alarms.onAlarm.addListener((alarm) => {
        this.registration.showNotification("Time Guardian Extension", {
            body: "Close Twitter",
            icon: "shield.png"
        });
    });

    var wakeup = function () {
        setTimeout(function () {
            chrome.runtime.sendMessage('ping', function () {
                console.log("ping");
            });
            wakeup();
        }, 10000);
    }
    wakeup();
});