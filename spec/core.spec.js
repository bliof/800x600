const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Image Swap Extension', () => {

    // Helper function to inject the swapping logic
    async function injectSwapScript(page) {
        // Read the actual swap.js file
        const swapJsContent = fs.readFileSync(path.join(__dirname, '../swap.js'), 'utf8');

        // Execute it in the page context.
        // Note: swap.js defines 'startSwapping' but doesn't call it.
        // We need to inject the content and then call startSwapping().
        // Since 'importScripts' is used in service_worker, but here we are in page context,
        // we can just strip "importScripts('swap.js');" if it was there (it's in service_worker.js, not swap.js).
        // swap.js is clean.

        await page.evaluate((scriptContent) => {
            // Create a script tag to define the functions
            const script = document.createElement('script');
            script.textContent = scriptContent;
            document.head.appendChild(script);
        }, swapJsContent);

        // Now activate it
        await page.evaluate(() => {
            if (typeof startSwapping === 'function') {
                startSwapping();
            } else {
                throw new Error('startSwapping function not found');
            }
        });
    }

    test('replaces static images with placeholders', async ({ page }) => {
        // Load the test page
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);

        // Wait for images to load
        const staticImage = page.locator('#static-image');
        await expect(staticImage).toBeVisible();

        // Inject and start swapping
        await injectSwapScript(page);

        // Verify the src has changed to a data URL
        await expect(staticImage).toHaveAttribute('src', /^data:image\/png;base64/);

        // Verify dataset.realSrc matches original
        // Note: file:// URLs might be tricky with exact matching due to encoding, but let's check end
        const realSrc = await staticImage.getAttribute('data-real-src');
        expect(realSrc).toContain('images/logo128.png');
    });

    test('replaces dynamically added images', async ({ page }) => {
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);

        // Inject and start swapping
        await injectSwapScript(page);

        // Wait for dynamic image to appear (script in test.html adds it after 1s)
        const dynamicImage = page.locator('#dynamic-image');
        await expect(dynamicImage).toBeVisible({ timeout: 5000 });

        // Verify it gets swapped
        await expect(dynamicImage).toHaveAttribute('src', /^data:image\/png;base64/);
    });

    test('does not replace images that fail to load', async ({ page }) => {
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);

        // Inject and start swapping
        await injectSwapScript(page);

        const missingImage = page.locator('#missing-image');
        // Original src should be preserved (or at least not become a data URL)
        // Since it's 404, naturalWidth will be 0.
        // The script waits for 'load' event. 'load' event won't fire for 404 (error event fires instead).
        // So it should remain as is.

        await expect(missingImage).not.toHaveAttribute('src', /^data:image\/png;base64/);
        await expect(missingImage).toHaveAttribute('src', 'non-existent.png');
    });

    test('placeholder contains correct dimensions', async ({ page }) => {
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);

        // Wait for the image to load fully to ensure naturalWidth is available
        const imgElement = await page.locator('#static-image').elementHandle();
        const naturalWidth = await imgElement.evaluate(el => el.naturalWidth);
        const naturalHeight = await imgElement.evaluate(el => el.naturalHeight);

        await injectSwapScript(page);

        // Extract the base64 data
        const src = await page.locator('#static-image').getAttribute('src');

        // Use an evaluate to load this data url into an image object and check its dimensions,
        // or check if the canvas drawing logic is correct.
        // We can't easily OCR the image, but we can verify the image element dimensions match the original.

        // The script sets canvas.width = img.naturalWidth.
        // And the src is the dataURL of that canvas.
        // So the new image should have the same natural dimensions.

        const newWidth = await imgElement.evaluate(el => el.naturalWidth);
        const newHeight = await imgElement.evaluate(el => el.naturalHeight);

        expect(newWidth).toBe(naturalWidth);
        expect(newHeight).toBe(naturalHeight);
    });
});
