var activeTabs = {};

chrome.browserAction.onClicked.addListener(function (tab) {
    if (activeTabs[tab.id]) {
        chrome.tabs.sendMessage(tab.id, {action: "undo-swap-images"});

        chrome.browserAction.setIcon({
            path: {
                '19': 'images/inactive19.png',
                '38': 'images/inactive38.png'
            },
            tabId: tab.id
        });
        delete activeTabs[tab.id];
    } else {
        chrome.tabs.sendMessage(tab.id, {action: "swap-images"});

        chrome.browserAction.setIcon({
            path: {
                '19': 'images/active19.png',
                '38': 'images/active38.png'
            },
            tabId: tab.id
        });
        activeTabs[tab.id] = true;
    }
});
