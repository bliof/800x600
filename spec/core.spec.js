const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Image Swap Extension", () => {
  // Helper function to inject the swapping logic
  async function injectSwapScript(page) {
    // Read the actual swap.js file
    const swapJsContent = fs.readFileSync(
      path.join(__dirname, "../swap.js"),
      "utf8",
    );

    // Execute it in the page context.
    // Note: swap.js defines 'startSwapping' but doesn't call it.
    // We need to inject the content and then call startSwapping().
    // Since 'importScripts' is used in service_worker, but here we are in page context,
    // we can just strip "importScripts('swap.js');" if it was there (it's in service_worker.js, not swap.js).
    // swap.js is clean.

    await page.evaluate((scriptContent) => {
      // Create a script tag to define the functions
      const script = document.createElement("script");
      script.textContent = scriptContent;
      document.head.appendChild(script);
    }, swapJsContent);

    // Now activate it
    await page.evaluate(() => {
      if (typeof startSwapping === "function") {
        startSwapping();
      } else {
        throw new Error("startSwapping function not found");
      }
    });
  }

  test("replaces static images with placeholders", async ({ page }) => {
    // Load the test page
    await page.goto(`file://${path.join(__dirname, "test.html")}`);

    // Wait for images to load
    const staticImage = page.locator("#static-image");
    await expect(staticImage).toBeVisible();

    // Inject and start swapping
    await injectSwapScript(page);

    // Verify src has NOT changed to a data URL (it should stay as original)
    await expect(staticImage).not.toHaveAttribute(
      "src",
      /^data:image\/png;base64/,
    );

    // Verify the visual content is replaced via CSS
    const styleContent = await staticImage.evaluate((el) => el.style.content);
    expect(styleContent).toMatch(/^url\("data:image\/png;base64/);
  });

  test("replaces dynamically added images", async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, "test.html")}`);

    // Inject and start swapping
    await injectSwapScript(page);

    // Wait for dynamic image to appear (script in test.html adds it after 1s)
    const dynamicImage = page.locator("#dynamic-image");
    await expect(dynamicImage).toBeVisible({ timeout: 5000 });

    // Verify it gets masked
    const styleContent = await dynamicImage.evaluate((el) => el.style.content);
    expect(styleContent).toMatch(/^url\("data:image\/png;base64/);

    // Verify dimensions (img_white_flower.jpg is 214x204)
    const lastWidth = await dynamicImage.getAttribute(
      "data-800x600-last-width",
    );
    const lastHeight = await dynamicImage.getAttribute(
      "data-800x600-last-height",
    );

    expect(Number(lastWidth)).toBe(214);
    expect(Number(lastHeight)).toBe(204);
  });

  test("does not replace images that fail to load", async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, "test.html")}`);

    // Inject and start swapping
    await injectSwapScript(page);

    const missingImage = page.locator("#missing-image");

    // Should not have style.content set
    const styleContent = await missingImage.evaluate((el) => el.style.content);
    expect(styleContent).toBe("");
  });

  test("placeholder contains correct dimensions", async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, "test.html")}`);

    // Wait for the image to load fully to ensure naturalWidth is available
    const imgElement = await page.locator("#static-image").elementHandle();

    await injectSwapScript(page);

    // Check style content
    const styleContent = await imgElement.evaluate((el) => el.style.content);
    expect(styleContent).toContain("data:image/png;base64");

    // Check scoped dataset attributes for exact dimensions of img_orange_flowers.jpg
    const lastWidth = await imgElement.getAttribute("data-800x600-last-width");
    const lastHeight = await imgElement.getAttribute(
      "data-800x600-last-height",
    );

    expect(Number(lastWidth)).toBe(100);
    expect(Number(lastHeight)).toBe(135);
  });

  test("replaces images with srcset and preserves original srcset", async ({
    page,
  }) => {
    await page.goto(`file://${path.join(__dirname, "test.html")}`);

    // Wait for srcset image to load
    const srcsetImage = page.locator("#srcset-image");
    await expect(srcsetImage).toBeVisible();

    // Get original srcset before swap
    const originalSrcset = await srcsetImage.getAttribute("srcset");
    expect(originalSrcset).toContain("100w");

    // Inject and start swapping
    await injectSwapScript(page);

    // Verify srcset is preserved (NOT cleared)
    await expect(srcsetImage).toHaveAttribute("srcset", originalSrcset);

    // Verify masked
    const styleContent = await srcsetImage.evaluate((el) => el.style.content);
    expect(styleContent).toMatch(/^url\("data:image\/png;base64/);

    // Verify scoped attributes
    // Default viewport is 1280x720, but sizes="... 100px" might come into play or the density.
    // However, usually without viewport setup it might pick based on 1280w.
    // Let's check what it picks. With "sizes" logic:
    // (min-width: 460px) 460px -> matches.
    // So slot width is 460px.
    // Candidates: 100w, 214w, 460w.
    // 460w match should be img_pink_flowers.jpg (460x345).
    // Let's assert based on that calculation.

    const lastWidth = await srcsetImage.getAttribute("data-800x600-last-width");
    const lastHeight = await srcsetImage.getAttribute(
      "data-800x600-last-height",
    );

    // Allow for potential browser choices but prioritize the most likely one (460w)
    // If it picks the largest for safety: 460x345.
    expect(Number(lastWidth)).toBe(460);
    expect(Number(lastHeight)).toBe(345);
  });

  test("handles dynamically added images with srcset", async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, "test.html")}`);

    // Inject and start swapping
    await injectSwapScript(page);

    // Dynamically add an image with srcset
    await page.evaluate(() => {
      const img = document.createElement("img");
      img.id = "dynamic-srcset-image";
      img.src = "images/img_orange_flowers.jpg";
      img.srcset =
        "images/img_orange_flowers.jpg 1x, images/img_pink_flowers.jpg 2x";
      img.alt = "Dynamic Srcset";
      document.getElementById("dynamic-container").appendChild(img);
    });

    // Wait for dynamic srcset image to appear and be processed
    const dynamicSrcsetImage = page.locator("#dynamic-srcset-image");
    await expect(dynamicSrcsetImage).toBeVisible({ timeout: 5000 });

    // Verify it masked
    const styleContent = await dynamicSrcsetImage.evaluate(
      (el) => el.style.content,
    );
    expect(styleContent).toMatch(/^url\("data:image\/png;base64/);

    // Verify srcset is preserved
    const srcset = await dynamicSrcsetImage.getAttribute("srcset");
    expect(srcset).toContain("1x");
    expect(srcset).toContain("2x");

    // Verify dimensions
    // 2x -> img_pink_flowers.jpg (460x345)
    // Since it's a 2x descriptor, naturalWidth reports density-corrected size: 460/2 = 230.
    const lastWidth = await dynamicSrcsetImage.getAttribute(
      "data-800x600-last-width",
    );
    const lastHeight = await dynamicSrcsetImage.getAttribute(
      "data-800x600-last-height",
    );

    expect(Number(lastWidth)).toBe(230);
    expect(Number(lastHeight)).toBe(172);
  });

  test("handles picture elements with source srcsets", async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, "test.html")}`);

    // Wait for picture image to load
    const pictureImage = page.locator("#picture-image");
    await expect(pictureImage).toBeVisible();

    // Get original source srcsets before swap
    const sources = page.locator("#picture-container source");
    const sourceCount = await sources.count();
    expect(sourceCount).toBe(2);

    // Inject and start swapping
    await injectSwapScript(page);

    // Verify img is masked
    const styleContent = await pictureImage.evaluate((el) => el.style.content);
    expect(styleContent).toMatch(/^url\("data:image\/png;base64/);

    // Verify sources are NOT cleared
    for (let i = 0; i < sourceCount; i++) {
      const source = sources.nth(i);
      const srcset = await source.getAttribute("srcset");
      expect(srcset).not.toBe("");
    }

    // Verify dimensions for Picture selection
    // Viewport 1280x720 (default) > 650px
    // First source: media="(min-width: 650px)" srcset="images/img_pink_flowers.jpg"
    // Should match. img_pink_flowers.jpg is 460x345.

    const lastWidth = await pictureImage.getAttribute(
      "data-800x600-last-width",
    );
    const lastHeight = await pictureImage.getAttribute(
      "data-800x600-last-height",
    );

    expect(Number(lastWidth)).toBe(460);
    expect(Number(lastHeight)).toBe(345);
  });
});
