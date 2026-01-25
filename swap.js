function startSwapping() {
  function createPlaceholderDataURL(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

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

    return canvas.toDataURL();
  }

  function swapImage(img) {
    var lastWidth = img.getAttribute("data-800x600-last-width");
    var lastHeight = img.getAttribute("data-800x600-last-height");

    if (
      lastWidth === String(img.naturalWidth) &&
      lastHeight === String(img.naturalHeight)
    ) {
      return;
    }

    var src = createPlaceholderDataURL(img.naturalWidth, img.naturalHeight);
    img.style.content = "url(" + src + ")";

    img.setAttribute("data-800x600-last-width", img.naturalWidth);
    img.setAttribute("data-800x600-last-height", img.naturalHeight);
  }

  function swapSVGImage(img) {
    var width = 0;
    var height = 0;

    // Try to get dimensions from attributes (SVGAnimatedLength)
    if (img.width && img.width.baseVal) {
      width = img.width.baseVal.value;
    }
    if (img.height && img.height.baseVal) {
      height = img.height.baseVal.value;
    }

    // Fallback to bounding client rect if attributes are missing or zero
    if (width === 0 || height === 0) {
      var rect = img.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }

    // Round to integer
    width = Math.round(width);
    height = Math.round(height);

    if (width === 0 || height === 0) return;

    var lastWidth = img.getAttribute("data-800x600-last-width");
    var lastHeight = img.getAttribute("data-800x600-last-height");

    if (lastWidth === String(width) && lastHeight === String(height)) {
      return;
    }

    var src = createPlaceholderDataURL(width, height);

    // Set href (modern) and xlink:href (legacy/compat)
    img.setAttribute("href", src);
    img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", src);

    img.setAttribute("data-800x600-last-width", width);
    img.setAttribute("data-800x600-last-height", height);
  }

  function swapImageWhenLoaded(img) {
    var isSVG = img.tagName === "image";

    var checkAndSwap = function () {
      if (isSVG) {
        swapSVGImage(img);
      } else {
        if (img.naturalWidth > 0) {
          swapImage(img);
        }
      }
    };

    if (isSVG) {
      checkAndSwap();
    } else {
      if (img.complete && img.naturalWidth > 0) {
        checkAndSwap();
      }
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
    var images = node.querySelectorAll("img, image");
    for (var i = 0; i < images.length; i++) {
      swapImageWhenLoaded(images[i]);
    }
  }

  swapChildImages(document);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      for (var i = 0; i < mutation.addedNodes.length; i++) {
        var node = mutation.addedNodes[i];
        if (node.tagName === "IMG" || node.tagName === "image") {
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
