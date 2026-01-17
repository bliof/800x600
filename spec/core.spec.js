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

    test('replaces images with srcset and preserves original srcset', async ({ page }) => {
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);

        // Wait for srcset image to load
        const srcsetImage = page.locator('#srcset-image');
        await expect(srcsetImage).toBeVisible();

        // Get original srcset before swap
        const originalSrcset = await srcsetImage.getAttribute('srcset');
        expect(originalSrcset).toContain('128w');

        // Inject and start swapping
        await injectSwapScript(page);

        // Verify the src has changed to a data URL
        await expect(srcsetImage).toHaveAttribute('src', /^data:image\/png;base64/);

        // Verify srcset is cleared (to prevent browser from overriding placeholder)
        await expect(srcsetImage).toHaveAttribute('srcset', '');

        // Verify original srcset is preserved in data attribute
        const realSrcset = await srcsetImage.getAttribute('data-real-srcset');
        expect(realSrcset).toContain('128w');
        expect(realSrcset).toContain('256w');

        // Verify realSrc is also preserved
        const realSrc = await srcsetImage.getAttribute('data-real-src');
        expect(realSrc).toContain('logo128.png');
    });

    test('handles dynamically added images with srcset', async ({ page }) => {
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);

        // Inject and start swapping
        await injectSwapScript(page);

        // Dynamically add an image with srcset
        await page.evaluate(() => {
            const img = document.createElement('img');
            img.id = 'dynamic-srcset-image';
            img.src = '../images/logo128.png';
            img.srcset = '../images/logo128.png 1x, ../images/active.png 2x';
            img.alt = 'Dynamic Srcset';
            document.getElementById('dynamic-container').appendChild(img);
        });

        // Wait for dynamic srcset image to appear and be processed
        const dynamicSrcsetImage = page.locator('#dynamic-srcset-image');
        await expect(dynamicSrcsetImage).toBeVisible({ timeout: 5000 });

        // Verify it gets swapped
        await expect(dynamicSrcsetImage).toHaveAttribute('src', /^data:image\/png;base64/);

        // Verify srcset is cleared
        await expect(dynamicSrcsetImage).toHaveAttribute('srcset', '');

        // Verify realSrcset is preserved
        const realSrcset = await dynamicSrcsetImage.getAttribute('data-real-srcset');
        expect(realSrcset).toContain('1x');
        expect(realSrcset).toContain('2x');
    });

    test('handles picture elements with source srcsets', async ({ page }) => {
        await page.goto(`file://${path.join(__dirname, 'test.html')}`);

        // Wait for picture image to load
        const pictureImage = page.locator('#picture-image');
        await expect(pictureImage).toBeVisible();

        // Get original source srcsets before swap
        const sources = page.locator('#picture-container source');
        const sourceCount = await sources.count();
        expect(sourceCount).toBe(2);

        // Inject and start swapping
        await injectSwapScript(page);

        // Verify the img src has changed to a data URL
        await expect(pictureImage).toHaveAttribute('src', /^data:image\/png;base64/);

        // Verify realSrc is preserved on the img
        const realSrc = await pictureImage.getAttribute('data-real-src');
        expect(realSrc).toContain('logo128.png');

        // Verify source srcsets are cleared
        for (let i = 0; i < sourceCount; i++) {
            const source = sources.nth(i);
            await expect(source).toHaveAttribute('srcset', '');

            // Verify original srcset is preserved in data attribute
            const realSrcset = await source.getAttribute('data-real-srcset');
            expect(realSrcset).toBeTruthy();
        }
    });
});
