importScripts('swap.js');

var activeOnTabs = {};

function changeIconTo(tabId, state) {
    var icon = {};

    if (state == 'active') {
        icon = {
            '19': 'images/active19.png',
            '38': 'images/active38.png'
        }
    } else {
        icon = {
            '19': 'images/inactive19.png',
            '38': 'images/inactive38.png'
        };
    }

    chrome.action.setIcon({
        path: icon,
        tabId: tabId
    });
}

function activateOnTab(tabId) {
    changeIconTo(tabId, 'active');
    activeOnTabs[tabId] = true;

    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: startSwapping
    }).catch((err) => {
        /* When the host changes */
        if (err.message.includes('Cannot access contents of the page')) {
            changeIconTo(tabId, 'inactive');
            delete activeOnTabs[tabId];
        }
    });
}

function deactivateOnTab(tabId) {
    changeIconTo(tabId, 'inactive');
    delete activeOnTabs[tabId];

    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => window.location.reload()
    });
}

chrome.action.onClicked.addListener(function(tab) {
    if (activeOnTabs[tab.id]) {
        deactivateOnTab(tab.id);
    } else {
        activateOnTab(tab.id);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (activeOnTabs[tabId] && changeInfo.status === "complete") {
        activateOnTab(tabId);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    delete activeOnTabs[tabId];
});
