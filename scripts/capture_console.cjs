const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
    console.log(`[console ${msg.type()}] ${args.join(' ')}`);
  });
  page.on('pageerror', err => {
    console.error('[pageerror]', err.stack || err.toString());
  });

  page.on('requestfailed', req => {
    console.error('[requestfailed]', req.url(), req.failure().errorText);
  });

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 30000 });
  // wait a bit to collect errors
  await page.waitForTimeout(3000);
  await browser.close();
})();