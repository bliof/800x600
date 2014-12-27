var activeTabs = {};

chrome.browserAction.onClicked.addListener(function (tab) {
    if (activeTabs[tab.id]) {
        chrome.browserAction.setIcon({
            path: {
                '19': 'images/inactive19.png',
                '38': 'images/inactive38.png'
            },
            tabId: tab.id
        });
        delete activeTabs[tab.id];
    } else {
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
