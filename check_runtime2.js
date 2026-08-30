import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log("Navigating to local dev server...");
  try {
    await page.goto('http://localhost:5173/');
    await new Promise(r => setTimeout(r, 5000));
    console.log("Checking body content...");
    
    const content = await page.content();
    if(content.includes('Good') || content.includes('Good Morning') || content.includes('Good Evening') || content.includes('Good Night')) {
      console.log("SUCCESS: Found greeting in the DOM.");
    } else {
      console.log("FAILED: Did not find greeting in the DOM. Length of content:", content.length);
    }
  } catch (err) {
    console.error("Navigation error:", err);
  }
  
  await browser.close();
})();
