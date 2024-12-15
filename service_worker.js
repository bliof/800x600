var activeOnTabs = {};

function changeIconTo(tab, state) {
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
        tabId: tab.id
    });
}

function activateOnTab(tab) {
    chrome.tabs.sendMessage(tab.id, {action: "swap-images"});

    changeIconTo(tab, 'active');
    activeOnTabs[tab.id] = true;
}

function deactivateOnTab(tab) {
    chrome.tabs.sendMessage(tab.id, {action: "undo-swap-images"});

    changeIconTo(tab, 'inactive');
    delete activeOnTabs[tab.id];
}

chrome.action.onClicked.addListener(function(tab) {
    if (activeOnTabs[tab.id]) {
        deactivateOnTab(tab);
    } else {
        activateOnTab(tab);
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request) { return; }

    var tab = sender.tab;

    if (request.action == 'init') {
        if (activeOnTabs[tab.id]) {
            changeIconTo(tab, 'active');
            sendResponse({action: 'swap-images'});
            return;
        }
    }

    sendResponse({action: 'none'});
});
