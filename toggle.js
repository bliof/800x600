var activeOnTabs = {};

function activateOnTab(tab) {
    chrome.tabs.sendMessage(tab.id, {action: "swap-images"});

    chrome.browserAction.setIcon({
        path: {
            '19': 'images/active19.png',
            '38': 'images/active38.png'
        },
        tabId: tab.id
    });
    activeOnTabs[tab.id] = true;
}

function deactivateOnTab(tab) {
    chrome.tabs.sendMessage(tab.id, {action: "undo-swap-images"});

    chrome.browserAction.setIcon({
        path: {
            '19': 'images/inactive19.png',
            '38': 'images/inactive38.png'
        },
        tabId: tab.id
    });
    delete activeOnTabs[tab.id];
}

chrome.browserAction.onClicked.addListener(function(tab) {
    if (activeOnTabs[tab.id]) {
        deactivateOnTab(tab);
    } else {
        activateOnTab(tab);
    }
});
