import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://artofproblemsolving.com/wiki/index.php/2025_AMC_8_Problems/Problem_1';

    console.log(`Scraping ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    const problemData = await page.evaluate(() => {
        const content = document.querySelector('.mw-parser-output');
        if (!content) return null;

        // Clean redundant parts first
        const redundant = content.querySelectorAll('table.wikitable, table.toccolours, div.print, .printfooter, #catlinks, #siteSub, #contentSub, #jump-to-nav, .mw-jump-link');
        redundant.forEach(el => el.remove());

        const headers = Array.from(content.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const sections = [];

        headers.forEach((h, i) => {
            const title = h.innerText.trim().replace('[edit]', '');
            if (['See Also', 'Annotated Solutions', 'External Links', 'References', 'Email Sent', 'Credits'].includes(title)) return;

            const nextH = headers[i + 1];
            const range = document.createRange();
            range.setStartAfter(h);

            if (nextH) {
                range.setEndBefore(nextH);
            } else {
                range.setEndAfter(content.lastChild);
            }

            const fragment = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(fragment);

            // Now tempDiv has exactly the content between h and nextH
            // We can process it similarly to how we did before

            const html = tempDiv.innerHTML.replace(/src="\/\//g, 'src="https://').replace(/src="\//g, 'src="https://artofproblemsolving.com/');

            // For text extraction, we still need getBetterText logic but applied to tempDiv
            // For repro simplicity, let's just use innerText first
            const text = tempDiv.innerText.trim();

            sections.push({ title, text, html });
        });

        return sections;
    });

    console.log('\n--- Section Summaries ---');
    problemData.forEach((s, i) => {
        console.log(`${i + 1}. [${s.title}] - ${s.text.length} chars`);
        if (s.title.includes('Solution 6') || s.title.includes('Solution 7')) {
            console.log(`   Preview: ${s.text.substring(0, 100)}...`);
        }
    });

    const sol6 = problemData.find(s => s.title.includes('Solution 6'));
    if (sol6 && sol6.text.toLowerCase().includes('solution 7')) {
        console.log('\n❌ FAILURE: Solution 6 still contains Solution 7 text!');
    } else if (sol6 && problemData.find(s => s.title.includes('Solution 7'))) {
        console.log('\n✅ SUCCESS: Solution 6 and Solution 7 are properly separated!');
    } else {
        console.log('\n❓ Something went wrong, sections not found as expected.');
    }

    await browser.close();
})();
