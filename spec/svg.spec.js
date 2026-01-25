const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

test.describe("Image Swap Extension - SVG Support", () => {
  async function injectSwapScript(page) {
    const swapJsContent = fs.readFileSync(
      path.join(__dirname, "../swap.js"),
      "utf8",
    );
    await page.evaluate((scriptContent) => {
      const script = document.createElement("script");
      script.textContent = scriptContent;
      document.head.appendChild(script);
    }, swapJsContent);
    await page.evaluate(() => {
      if (typeof startSwapping === "function") {
        startSwapping();
      }
    });
  }

  test("replaces SVG image tags with placeholders", async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, "svg.html")}`);
    const svgImage = page.locator("#svg-image");
    await expect(svgImage).toBeVisible();

    await injectSwapScript(page);

    // Check if href or xlink:href starts with data:image
    await expect
      .poll(async () => {
        return await svgImage.evaluate((el) => {
          // Check both standard href and xlink:href
          const href = el.getAttribute("href");
          const xlinkHref = el.getAttribute("xlink:href");
          return href || xlinkHref;
        });
      })
      .toMatch(/^data:image\/png;base64/);
  });

  test("replaces dynamically added SVG image tags", async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, "svg.html")}`);
    await injectSwapScript(page);

    await page.evaluate(() => {
      const ns = "http://www.w3.org/2000/svg";
      const xlink = "http://www.w3.org/1999/xlink";
      const img = document.createElementNS(ns, "image");
      img.setAttribute("id", "dynamic-svg-image");
      img.setAttribute("width", "100");
      img.setAttribute("height", "100");
      img.setAttributeNS(xlink, "href", "images/img_pink_flowers.jpg");
      document.getElementById("dynamic-container").appendChild(img);
    });

    const dynamicImage = page.locator("#dynamic-svg-image");
    await expect(dynamicImage).toBeVisible();

    await expect
      .poll(async () => {
        return await dynamicImage.evaluate((el) => {
          const href = el.getAttribute("href");
          const xlinkHref = el.getAttribute("xlink:href");
          return href || xlinkHref;
        });
      })
      .toMatch(/^data:image\/png;base64/);
  });
});
