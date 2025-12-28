import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

export class ScraperAgent {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://artofproblemsolving.com';
        this.startUrl = config.startUrl || `${this.baseUrl}/wiki/index.php/AMC_8_Problems_and_Solutions`;
        this.outputDir = config.outputDir || './data';
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    async initialize() {
        console.log('Initializing Scraper Agent...');
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        this.page = await this.context.newPage();

        if (!existsSync(this.outputDir)) {
            mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async scrape() {
        if (!this.page) await this.initialize();

        const data = {
            competitionId: 'amc8',
            competitionName: 'American Mathematics Competition 8',
            exams: []
        };

        try {
            console.log('Navigating to main page...');
            await this.page.goto(this.startUrl, { waitUntil: 'domcontentloaded' });

            const yearLinks = await this._getYearLinks();
            console.log(`Found ${yearLinks.length} years: ${yearLinks.map(y => y.year).join(', ')}`);

            for (const { year, url } of yearLinks) {
                console.log(`\nProcessing ${year}...`);
                const examData = await this._processYear(year, url);
                data.exams.push(examData);
            }

        } catch (error) {
            console.error('Fatal error during scraping:', error);
        } finally {
            await this.shutdown();
            const outputPath = path.join(this.outputDir, 'amc8_data.json');
            writeFileSync(outputPath, JSON.stringify(data, null, 2));
            console.log(`Done. Saved to ${outputPath}`);
        }
    }

    async _getYearLinks() {
        return await this.page.evaluate(() => {
            const links = [];
            const anchors = Array.from(document.querySelectorAll('a'));
            for (const anchor of anchors) {
                const text = anchor.textContent.trim();
                const href = anchor.getAttribute('href');
                if (text.match(/^\d{4}\s+AMC\s*8$/) && href && href.includes('AMC_8')) {
                    links.push({
                        year: parseInt(text.match(/^\d{4}/)[0]),
                        url: href
                    });
                }
            }
            return Array.from(new Map(links.map(l => [l.year, l])).values())
                .sort((a, b) => b.year - a.year);
        });
    }

    async _processYear(year, url) {
        const examData = { year, problems: [] };
        const fullUrl = url.startsWith('http') ? url : this.baseUrl + url;

        try {
            console.log(`  Navigating to: ${fullUrl}`);
            await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

            try {
                await this.page.waitForSelector('.mw-parser-output', { timeout: 5000 });
            } catch (e) {
                console.log('  ❌ .mw-parser-output NOT found');
            }

            const problemDefinitions = await this._extractProblemsFromPage();
            console.log(`  Found ${problemDefinitions.length} problems.`);

            const answerKey = await this._getAnswerKey(year);

            for (const prob of problemDefinitions) {
                const solutionData = await this._getSolution(prob.solutionUrl);

                examData.problems.push({
                    problemNumber: prob.problemNumber,
                    problemHtml: prob.problemHtml,
                    solutionHtml: solutionData.html,
                    answer: answerKey[prob.problemNumber] || solutionData.ans || '',
                    images: prob.images,
                    sourceUrl: url
                });

                console.log(`  Scraped Problem ${prob.problemNumber} (Ans: ${examData.problems[examData.problems.length - 1].answer})`);
                await this.page.waitForTimeout(200);
            }

        } catch (e) {
            console.error(`Error processing year ${year}: ${e.message}`);
        }

        return examData;
    }

    async _extractProblemsFromPage() {
        return await this.page.evaluate(() => {
            const probs = [];
            const headers = Array.from(document.querySelectorAll('h2'));

            for (const header of headers) {
                const text = header.textContent.trim();
                const match = text.match(/Problem\s+(\d+)/);
                if (match) {
                    const problemNumber = parseInt(match[1]);
                    let contentHtml = '';
                    let solutionUrl = null;
                    let images = [];

                    let curr = header.nextElementSibling;
                    while (curr && curr.tagName !== 'H2') {
                        const links = Array.from(curr.querySelectorAll('a'));
                        const solLink = links.find(l => l.textContent.includes('Solution'));
                        if (solLink) {
                            solutionUrl = solLink.getAttribute('href');
                        } else {
                            const solLinkHref = curr.querySelector('a[href*="Solution"]');
                            if (solLinkHref) solutionUrl = solLinkHref.getAttribute('href');
                        }

                        const imgs = curr.querySelectorAll('img');
                        imgs.forEach(img => images.push(img.src));

                        if (!curr.textContent.includes('Solution') || curr.textContent.length > 20) {
                            contentHtml += curr.outerHTML;
                        }

                        curr = curr.nextElementSibling;
                    }

                    probs.push({
                        problemNumber,
                        problemHtml: contentHtml,
                        solutionUrl,
                        images
                    });
                }
            }
            return probs;
        });
    }

    async _getAnswerKey(year) {
        const answerKeyUrl = `${this.baseUrl}/wiki/index.php?title=${year}_AMC_8_Answer_Key`;
        try {
            await this.page.goto(answerKeyUrl, { waitUntil: 'domcontentloaded' });
            return await this.page.evaluate(() => {
                const key = {};
                const content = document.body.innerText;
                const lines = content.split('\n').map(l => l.trim());
                const keyIndex = lines.findIndex(l => l.includes('Answer Key'));

                if (keyIndex !== -1) {
                    let count = 1;
                    for (let i = keyIndex + 1; i < lines.length && count <= 25; i++) {
                        const line = lines[i];
                        if (/^[A-E]$/.test(line)) {
                            key[count] = line;
                            count++;
                        }
                    }
                }
                return key;
            });
        } catch (e) {
            console.log('  ⚠️  Could not load Answer Key page.');
            return {};
        }
    }

    async _getSolution(solutionUrl) {
        if (!solutionUrl) return { html: '', ans: '' };

        try {
            const solFullUrl = solutionUrl.startsWith('http') ? solutionUrl : this.baseUrl + solutionUrl;
            await this.page.goto(solFullUrl, { waitUntil: 'domcontentloaded' });

            return await this.page.evaluate(() => {
                const content = document.querySelector('.mw-parser-output');
                if (!content) return { html: '', ans: '' };

                const unwantedSelectors = ['#toc', '.mw-editsection', '#See_also', '.printfooter', '#catlinks'];
                unwantedSelectors.forEach(sel => {
                    const els = content.querySelectorAll(sel);
                    els.forEach(el => el.remove());
                });

                const headers = content.querySelectorAll('h2, h3');
                headers.forEach(h => {
                    if (h.textContent.includes('See also')) h.remove();
                });

                let html = content.innerHTML;
                let ans = '';

                const boldTexts = Array.from(document.querySelectorAll('b, strong')).map(b => b.textContent);
                for (const txt of boldTexts) {
                    let m = txt.match(/\(([A-E])\)/);
                    if (m) { ans = m[1]; break; }
                    m = txt.match(/boxed\{\(?([A-E])\)?\}/);
                    if (m) { ans = m[1]; break; }
                    if (/^[A-E]$/.test(txt.trim())) { ans = txt.trim(); break; }
                }

                if (!ans) {
                    const textContent = content.textContent;
                    const m = textContent.match(/The answer is\s+\(?([A-E])\)?/i);
                    if (m) ans = m[1];
                }

                return { html, ans };
            });
        } catch (e) {
            return { html: '', ans: '' };
        }
    }

    async shutdown() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}
