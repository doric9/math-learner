import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://artofproblemsolving.com';

async function debugPage() {
  const browser = await chromium.launch({ headless: false }); // Run with browser visible
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  try {
    // Go to a specific year page (2022 as example)
    const url = `${BASE_URL}/wiki/index.php/2022_AMC_8_Problems`;
    console.log('Loading:', url);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('Screenshot saved to debug-screenshot.png');

    // Get the HTML content
    const html = await page.content();
    writeFileSync('debug-page.html', html);
    console.log('HTML saved to debug-page.html');

    // Try to find headers and structure
    const structure = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('h2, h3, h4'));
      return headers.map(h => ({
        tag: h.tagName,
        text: h.textContent.trim().substring(0, 100),
        id: h.id
      }));
    });

    console.log('\nPage structure (headers):');
    console.log(JSON.stringify(structure, null, 2));

    // Try to find problem content
    const sampleContent = await page.evaluate(() => {
      // Try different selectors
      const selectors = [
        '.mw-parser-output',
        '#mw-content-text',
        '.problem',
        'p'
      ];

      const results = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results[selector] = {
          count: elements.length,
          sample: elements[0]?.textContent?.substring(0, 200) || 'Not found'
        };
      });

      return results;
    });

    console.log('\nContent analysis:');
    console.log(JSON.stringify(sampleContent, null, 2));

    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugPage();
