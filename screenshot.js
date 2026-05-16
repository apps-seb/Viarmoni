const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 375, height: 667 } // mobile view
  });
  await page.goto('http://localhost:8000/contacto.html');
  await page.waitForTimeout(1000); // Wait for animations/splide
  await page.screenshot({ path: 'contacto_mobile.png' });
  await browser.close();
})();
