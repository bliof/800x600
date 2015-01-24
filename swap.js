var cache = {};

function swapImage(img) {
    var src = cache[img.naturalWidth + 'x' + img.naturalHeight];

    if (!src) {
        var canvas = document.createElement('canvas');

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        var c = canvas.getContext("2d");

        c.fillStyle = 'lightgrey';
        c.fillRect(0, 0, canvas.width, canvas.height);

        var fontSize = canvas.width * 0.15;

        c.font = fontSize + 'px Monaco, monospace';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = 'black';
        c.fillText(canvas.width + ' x ' + canvas.height, canvas.width/2, canvas.height/2);

        src = canvas.toDataURL();
        cache[img.naturalWidth + 'x' + img.naturalHeight] = src;
    }

    var realSrc = img.src;
    img.dataset.realSrc = realSrc;
    img.src = src;
}

function swapImageWhenLoaded(img) {
    if (img.naturalWidth === 0) {
        img.addEventListener('load', function imageSwapHandler() {
            img.removeEventListener(img, imageSwapHandler);
            if (img.naturalWidth !== 0) {
                swapImage(img);
            }
        });
    } else {
        swapImage(img);
    }
}

function swapChildImages(node) {
    var images = node.querySelectorAll('img:not([src^="data:image/png;"])');

    for (var i = 0; i < images.length; i++) {
        swapImageWhenLoaded(images[i]);
    }
}

function startSwapping() {
    swapChildImages(document);

    new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            for (var i = 0; i < mutation.addedNodes.length; i++) {
                var node = mutation.addedNodes[i];

                if (node.querySelectorAll) {
                    swapChildImages(node);
                }
            }

            if (mutation.attributeName && mutation.target.tagName == 'IMG' && mutation.target.src.indexOf("data:image/png;")) {
                swapImageWhenLoaded(mutation.target);
            }
        });
    }).observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['src']});
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
