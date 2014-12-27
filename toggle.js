var activeTabs = {};

chrome.browserAction.onClicked.addListener(function (tab) {
    if (activeTabs[tab.id]) {
        chrome.browserAction.setIcon({path: 'inactive.png', tabId: tab.id});
        delete activeTabs[tab.id];
    } else {
        chrome.browserAction.setIcon({path: 'active.png', tabId: tab.id});
        activeTabs[tab.id] = true;
    }
});
