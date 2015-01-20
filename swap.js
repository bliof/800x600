function swapImage(img) {
    var realSrc = img.src;
    img.src = 'http://dummyimage.com/' + img.naturalWidth + 'x' + img.naturalHeight;
    img.classList.add('_dummy_');
    img.dataset.realSrc = realSrc;
}

function swapChildImages(node) {
    var images = node.querySelectorAll('img:not(._dummy_)');

    for (var i = 0; i < images.length; i++) {
        var img = images[i];

        if (img.naturalWidth === 0) {
            img.addEventListener('load', function imageSwapHandler() {
                swapImage(img);
                img.removeEventListener(img, imageSwapHandler);
            });
        } else {
            swapImage(img);
        }
    }
}

function startSwapping() {
    swapChildImages(document);

    new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            for (var i = 0; i < mutation.addedNodes.length; i++) {
                var node = mutation.addedNodes[i];

                if (node.querySelectorAll) {
                    swapChildImages(node)
                }
            }
        });
    }).observe(document, {childList: true, subtree: true});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action == 'swap-images') {
        startSwapping();
    } else {
        window.location.reload();
    }
});

chrome.runtime.sendMessage({action: 'init'}, function(response) {
    if (response.action == 'swap-images') {
        startSwapping();
    }
});
