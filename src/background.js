async function main() {
    const dayToday = new Date().getDay();
    const { twitter, today } = await chrome.storage.local.get(["twitter", "today"]);
    let twitterTimer = typeof twitter === "number" ? twitter : 0;
    console.log({ twitter, today, twitterTimer });
    if (today !== dayToday) {
        console.log("els dies son diferents y la variable de temps es resetea");
        twitterTimer = 0;
    } else {
        console.log("estem en el mateix dia y la variable es queda igual");
    }
    let twitterActive = false;
    let interValEnd;


    function readTabName(t) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            console.log(tabs[0]?.url);
            if (tabs[0]?.url.includes("twitter")) {
                console.log("la boleana de interbal id", !Boolean(interValEnd));
                if (!Boolean(interValEnd)) {
                    chrome.storage.local.get(["twitter","today"]).then(console.log)
                    twitterActive = true;
                    console.log("interval estaba buit i ne tinc que crear uno nou");
                    creteInterVal()
                }
            } else {
                console.log("are tindria que borrar o no tocar el intervalo");
                twitterActive = false;
                chrome.storage.local.set({
                    "twitter": twitterTimer,
                    "today": dayToday

                });
                chrome.storage.local.get(["twitter","today"]).then(console.log)
                Boolean(interValEnd) && clearRequestedInterval(interValEnd);
            }
        }
        )
    }

    function creteInterVal() {
        console.log("intervalEnd a boleana per a saber si ja existeix", Boolean(interValEnd));
        if (Boolean(interValEnd)) return;
        console.log("create Interval s ha cridat");
        interValEnd = setInterval(() => {
            twitterActive && (twitterTimer += 1);
            chrome.action.setBadgeText({
                text: `${twitterTimer}` // dividir entre 60 si vull traure els minuts
            });
            if (twitterActive && twitterTimer >= 1800) {
                createAlarm()
                chrome.storage.local.get(["twitter","today"]).then(console.log)


            }
            console.log({ dayToday, twitterActive, twitterTimer });
        }, 1000);
    }





    function createAlarm() {
        chrome.alarms.create({
            when: new Date().getMilliseconds()
        });
    }
    function clearRequestedInterval(clearRequestedInterval) {
        console.log(`borrant interval ${clearRequestedInterval}`);
        clearInterval(clearRequestedInterval);
        interValEnd = undefined;
        console.log("intervalEnd despues de borrarla val ", interValEnd);
    }

    chrome.windows.onFocusChanged.addListener(readTabName);

    chrome.tabs.onActivated.addListener(readTabName);

    chrome.runtime.onSuspend.addListener(() => {
        chrome.storage.local.set({
            "twitter": twitterTimer,
            "today": dayToday
        });
        clearRequestedInterval(interValEnd)

    });

    chrome.alarms.onAlarm.addListener((alarm) => {
        this.registration.showNotification("Time Guardian Extension", {
            body: "Close Twitter",
            icon: "shield.png"
        });
    });
}


main()
