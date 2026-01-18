function startSwapping() {
  function swapImage(img) {
    var lastWidth = img.getAttribute("data-800x600-last-width");
    var lastHeight = img.getAttribute("data-800x600-last-height");

    if (
      lastWidth === String(img.naturalWidth) &&
      lastHeight === String(img.naturalHeight)
    ) {
      return;
    }

    var canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    var c = canvas.getContext("2d");

    c.fillStyle = "lightgrey";
    c.fillRect(0, 0, canvas.width, canvas.height);

    var fontSize = canvas.width * 0.15;

    c.font = fontSize + "px Monaco, monospace";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "black";
    c.fillText(
      canvas.width + " x " + canvas.height,
      canvas.width / 2,
      canvas.height / 2,
    );

    var src = canvas.toDataURL();
    img.style.content = "url(" + src + ")";

    img.setAttribute("data-800x600-last-width", img.naturalWidth);
    img.setAttribute("data-800x600-last-height", img.naturalHeight);
  }

  function swapImageWhenLoaded(img) {
    var checkAndSwap = function () {
      if (img.naturalWidth > 0) {
        swapImage(img);
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      checkAndSwap();
    }

    // Listen for load events (srcset changes)
    img.addEventListener("load", checkAndSwap);

    // Listen for resize events (layout changes that might trigger srcset switch or just reveal new natural size)
    // We attach this once per image
    if (!img.getAttribute("data-800x600-resize-observed")) {
      new ResizeObserver(function () {
        // When layout size changes, check if natural size also changed
        checkAndSwap();
      }).observe(img);
      img.setAttribute("data-800x600-resize-observed", "true");
    }
  }

  function swapChildImages(node) {
    var images = node.querySelectorAll("img");
    for (var i = 0; i < images.length; i++) {
      swapImageWhenLoaded(images[i]);
    }
  }

  swapChildImages(document);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        var node = mutation.addedNodes[i];
        if (node.tagName === "IMG") {
          swapImageWhenLoaded(node);
        }
        if (node.querySelectorAll) {
          swapChildImages(node);
        }
      }
    });
  }).observe(document, {
    childList: true,
    subtree: true,
  });
}
