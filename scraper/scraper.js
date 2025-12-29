import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://artofproblemsolving.com';
const START_URL = `${BASE_URL}/wiki/index.php/AMC_8_Problems_and_Solutions`;

// Extract correct answer from solution text/HTML
function extractAnswer(solutionText, solutionHtml = '') {
  if (!solutionText && !solutionHtml) return '';

  const combined = (solutionText + ' ' + solutionHtml).toLowerCase();

  // Try 1: Look for boxed answer
  const boxedMatch = combined.match(/\\boxed\{\\textbf\{?\(?([a-e])\)?/i);
  if (boxedMatch) {
    return boxedMatch[1].toUpperCase();
  }

  // Try 2: Look for "the answer is A" or "answer: A"
  const answerMatch = combined.match(/(?:answer is|answer:|^answer\s+)[\s~]*\(?([a-e])\)?/i);
  if (answerMatch) {
    return answerMatch[1].toUpperCase();
  }

  // Try 3: Look for "therefore (A)" or "so (B)"
  const thereforeMatch = combined.match(/(?:therefore|thus|so|hence)[\s,~]*\(?([a-e])\)?/i);
  if (thereforeMatch) {
    return thereforeMatch[1].toUpperCase();
  }

  return '';
}

// NEW: Extract answers from the dedicated Answer Key page
async function scrapeAnswerKey(page, url) {
  try {
    console.log(`  🔍 Scraping Answer Key from ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    return await page.evaluate(() => {
      const answers = {};
      const content = document.querySelector('.mw-parser-output');
      if (!content) return {};

      // Strategy 1: Look for ordered list (most common)
      const ol = content.querySelector('ol');
      if (ol) {
        const items = ol.querySelectorAll('li');
        items.forEach((li, index) => {
          const text = li.textContent.trim();
          const match = text.match(/([A-E])/i);
          if (match) {
            answers[index + 1] = match[1].toUpperCase();
          }
        });
      }

      // Strategy 2: Look for paragraphs with patterns like "1. A", "2. B"
      if (Object.keys(answers).length < 5) {
        const text = content.textContent;
        const pattern = /(\d+)\.\s*([A-E])/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
          answers[parseInt(match[1])] = match[2].toUpperCase();
        }
      }

      return answers;
    });
  } catch (error) {
    console.error(`  ⚠️ Answer Key scraping failed: ${error.message}`);
    return {};
  }
}

async function scrapeAMC8() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const data = {
    competitionId: 'amc8',
    competitionName: 'American Mathematics Competition 8',
    exams: []
  };

  try {
    console.log('Navigating to main page...');
    await page.goto(START_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(2000);

    // Extract year links
    const yearLinks = await page.evaluate(() => {
      const links = [];
      const anchors = Array.from(document.querySelectorAll('a'));

      for (const anchor of anchors) {
        const href = anchor.getAttribute('href');
        const text = anchor.textContent.trim();

        if (href && text.match(/\d{4}\s+AMC\s*8/i)) {
          const yearMatch = text.match(/(\d{4})/);
          if (yearMatch && href.includes('AMC_8')) {
            links.push({
              year: parseInt(yearMatch[1]),
              url: href
            });
          }
        }
      }

      const unique = Array.from(new Map(links.map(l => [l.year, l])).values());
      return unique.sort((a, b) => b.year - a.year);
    });

    console.log(`Found ${yearLinks.length} exam years\n`);

    // Scrape all years from 1999 to 2025
    const yearsToScrape = yearLinks.filter(l => l.year >= 1999 && l.year <= 2025);

    for (const { year, url } of yearsToScrape) {
      console.log(`Scraping ${year} AMC 8...`);

      try {
        const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
        await page.goto(fullUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        await page.waitForTimeout(1000);

        const examData = {
          year,
          problems: []
        };

        // NEW: Look for Answer Key link
        const answerKeyUrl = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a'));
          const keyAnchor = anchors.find(a => a.textContent.toLowerCase().includes('answer key'));
          return keyAnchor ? keyAnchor.getAttribute('href') : null;
        });

        let answerKeyMap = {};
        if (answerKeyUrl) {
          const fullKeyUrl = answerKeyUrl.startsWith('http') ? answerKeyUrl : `${BASE_URL}${answerKeyUrl}`;
          answerKeyMap = await scrapeAnswerKey(page, fullKeyUrl);
          // Return to the year's main page
          await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } else {
          console.log(`  ⚠️ No Answer Key link found for ${year}`);
        }

        // Get problem links
        const problemLinks = await page.evaluate(() => {
          const links = [];
          const anchors = Array.from(document.querySelectorAll('a[href*="/Problem_"]'));

          for (const anchor of anchors) {
            const href = anchor.getAttribute('href');
            const match = href.match(/Problem_(\d+)$/);
            if (match) {
              const problemNum = parseInt(match[1]);
              if (problemNum >= 1 && problemNum <= 25 && !links.some(l => l.number === problemNum)) {
                links.push({
                  number: problemNum,
                  url: href
                });
              }
            }
          }

          return links.sort((a, b) => a.number - b.number);
        });

        console.log(`  Found ${problemLinks.length} problem links`);

        // Visit each problem page
        for (const { number, url: problemUrl } of problemLinks) {
          try {
            const fullProblemUrl = problemUrl.startsWith('http') ? problemUrl : `${BASE_URL}${problemUrl}`;
            await page.goto(fullProblemUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 60000
            });
            await page.waitForTimeout(500);

            // IMPROVED: Extract problem data with multiple LaTeX image support
            const problemData = await page.evaluate(() => {
              const content = document.querySelector('.mw-parser-output');
              if (!content) return null;

              const getBetterText = (el) => {
                if (!el) return '';
                const clone = el.cloneNode(true);
                // Replace latex images with their alt text (LaTeX)
                const latexImgs = clone.querySelectorAll('img.latex');
                latexImgs.forEach(img => {
                  const alt = img.getAttribute('alt') || '';
                  const span = document.createElement('span');
                  span.textContent = alt;
                  img.parentNode.replaceChild(span, img);
                });
                return clone.textContent.trim();
              };

              const headers = Array.from(content.querySelectorAll('h2'));

              // Find Problem section
              let problemText = '';
              let problemHtml = '';

              const problemHeader = headers.find(h => h.textContent.toLowerCase().includes('problem'));
              if (problemHeader) {
                const problemParts = [];
                const htmlParts = [];
                let current = problemHeader.nextElementSibling;

                while (current && !current.matches('h2')) {
                  if (current.tagName === 'P' || current.tagName === 'DIV' || current.tagName === 'CENTER' || current.tagName === 'FIGURE' || current.tagName === 'UL' || current.tagName === 'OL') {
                    // Get better text with LaTeX
                    problemParts.push(getBetterText(current));

                    // Get HTML with fixed image URLs
                    let html = current.outerHTML;
                    html = html.replace(/src="\/\//g, 'src="https://');
                    html = html.replace(/src="\//g, 'src="https://artofproblemsolving.com/');
                    htmlParts.push(html);
                  }
                  current = current.nextElementSibling;
                }

                problemText = problemParts.join('\n\n');
                problemHtml = htmlParts.join('\n');
              }

              // Find solution section
              let solutionText = '';
              let solutionHtml = '';

              const solutionHeader = headers.find(h => h.textContent.toLowerCase().includes('solution'));
              if (solutionHeader) {
                const solutionParts = [];
                const solutionHtmlParts = [];
                let current = solutionHeader.nextElementSibling;
                let count = 0;

                while (current && !current.matches('h2') && count < 15) {
                  if (current.tagName === 'P' || current.tagName === 'DIV' || current.tagName === 'ol' || current.tagName === 'ul') {
                    solutionParts.push(getBetterText(current));

                    let html = current.outerHTML;
                    html = html.replace(/src="\/\//g, 'src="https://');
                    html = html.replace(/src="\//g, 'src="https://artofproblemsolving.com/');
                    solutionHtmlParts.push(html);
                  }
                  current = current.nextElementSibling;
                  count++;
                }

                solutionText = solutionParts.join('\n\n');
                solutionHtml = solutionHtmlParts.join('\n');
              }

              return {
                problemText,
                problemHtml,
                solutionText,
                solutionHtml
              };
            });

            if (problemData) {
              // Prioritize answer from Answer Key map, fallback to extraction
              let correctAnswer = answerKeyMap[number] || '';
              if (!correctAnswer) {
                correctAnswer = extractAnswer(problemData.solutionText, problemData.solutionHtml);
              }

              examData.problems.push({
                problemNumber: number,
                problemText: problemData.problemText,
                problemHtml: problemData.problemHtml,
                correctAnswer: correctAnswer,
                solutionText: problemData.solutionText,
                solutionHtml: problemData.solutionHtml
              });

              const hasAnswer = correctAnswer !== '';
              console.log(`  ✓ Problem ${number}: Answer=${hasAnswer ? correctAnswer : '✗'}`);
            }

          } catch (error) {
            console.error(`  ✗ Problem ${number} failed:`, error.message);
          }
        }

        data.exams.push(examData);
        console.log(`  ✅ ${year}: ${examData.problems.length} problems scraped\n`);

      } catch (error) {
        console.error(`✗ Failed to scrape ${year}:`, error.message);
      }
    }

    // Save data
    const filename = '../amc8_data_improved.json';
    writeFileSync(filename, JSON.stringify(data, null, 2));
    // Print summary
    const totalProblems = data.exams.reduce((sum, exam) => sum + exam.problems.length, 0);
    const totalWithAnswers = data.exams.reduce((sum, exam) =>
      sum + exam.problems.filter(p => p.correctAnswer).length, 0);

    console.log('\n============================================================');
    console.log('✅ SCRAPING COMPLETE');
    console.log('============================================================');
    console.log(`📁 Output: ${filename}`);
    console.log(`📊 Exams scraped: ${data.exams.length}`);
    console.log(`📝 Total problems: ${totalProblems}`);
    console.log(`✓ Correct answers: ${totalWithAnswers}/${totalProblems} (${Math.round(totalWithAnswers / totalProblems * 100)}%)`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

scrapeAMC8();
