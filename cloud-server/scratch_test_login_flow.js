const { chromium } = require('playwright');

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log all console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  // Log all network requests and responses
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`[API REQUEST] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      const url = response.url();
      const status = response.status();
      console.log(`[API RESPONSE] ${status} ${url}`);
      try {
        const text = await response.text();
        console.log(`[API RESPONSE BODY] ${text.substring(0, 1000)}`);
      } catch (e) {
        console.log(`[API RESPONSE BODY ERROR] Could not read body: ${e.message}`);
      }
    }
  });

  try {
    console.log("Navigating to https://b2b-law.netlify.app/login...");
    await page.goto('https://b2b-law.netlify.app/login', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log("Filling username and password...");
    await page.fill('#username-input', 'admin');
    await page.fill('#password-input', 'admin1390');
    
    console.log("Clicking submit...");
    await page.click('#login-submit-btn');
    
    console.log("Waiting 20 seconds for response/redirection...");
    await page.waitForTimeout(20000);
    
    console.log("Final URL:", page.url());
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
