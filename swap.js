chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    function swapImage(img) {
        var realSrc = img.src;
        img.src = 'http://dummyimage.com/' + img.naturalWidth + 'x' + img.naturalHeight;
        img.classList.add('_dummy_');
        img.dataset.realSrc = realSrc;
    }

    function startSwapping() {
        var images = document.querySelectorAll('img');

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

    if (request.action == 'swap-images') {
        startSwapping();
    } else {
        window.location.reload();
    }
});
