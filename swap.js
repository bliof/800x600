function startSwapping() {
  var cache = {};

  function swapImage(img) {
    var src = cache[img.naturalWidth + "x" + img.naturalHeight];

    if (!src) {
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

      src = canvas.toDataURL();
      cache[img.naturalWidth + "x" + img.naturalHeight] = src;
    }

    // Store original sources and clear srcsets
    clearSources(img);

    img.src = src;
  }

  function swapImageWhenLoaded(img) {
    if (img.naturalWidth === 0) {
      var imageSwapHandler = function (e) {
        var img = e.target;
        img.removeEventListener("load", imageSwapHandler);
        img.removeEventListener("error", imageSwapHandler);
        if (img.naturalWidth !== 0) {
          swapImage(img);
        }
      };

      img.addEventListener("load", imageSwapHandler);
      img.addEventListener("error", imageSwapHandler);
    } else {
      swapImage(img);
    }
  }

  function clearSources(img) {
    // Store original src
    img.dataset.realSrc = img.src;
    img.src = "";

    // Store and clear img srcset
    if (img.srcset) {
      img.dataset.realSrcset = img.srcset;
      img.srcset = "";
    }

    // Handle <source> elements inside <picture>
    var picture = img.closest("picture");
    if (picture) {
      var sources = picture.querySelectorAll(
        "source[srcset]:not([data-real-srcset])",
      );
      for (var i = 0; i < sources.length; i++) {
        var source = sources[i];
        source.dataset.realSrcset = source.srcset;
        source.srcset = "";
      }
    }
  }

  function swapChildImages(node) {
    var images = node.querySelectorAll('img:not([src^="data:image/png;"])');

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
          if (node.src.indexOf("data:image/png;") !== 0) {
            swapImageWhenLoaded(node);
          }
        }

        if (node.querySelectorAll) {
          swapChildImages(node);
        }
      }

      if (
        mutation.attributeName &&
        mutation.target.tagName === "IMG" &&
        mutation.target.src.indexOf("data:image/png;") !== 0
      ) {
        swapImageWhenLoaded(mutation.target);
      }
    });
  }).observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"],
  });
}
