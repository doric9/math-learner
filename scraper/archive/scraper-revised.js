import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://artofproblemsolving.com';
const START_URL = `${BASE_URL}/wiki/index.php/AMC_8_Problems_and_Solutions`;

// Extract answer choices from LaTeX string
function extractChoices(latexText) {
  if (!latexText) return {};

  const choices = {};

  // Pattern: \textbf{(A)}\ content \qquad \textbf{(B)}\ content ...
  // or: \textbf{(A) } content \qquad \textbf{(B) } content ...
  const pattern = /\\textbf\{\(([A-E])\)\}[\\~\s]+([^\\]+?)(?=\\qquad|\\textbf|\s*$)/g;

  let match;
  while ((match = pattern.exec(latexText)) !== null) {
    const letter = match[1];
    let content = match[2];

    // Clean up the content
    content = content.trim();
    content = content.replace(/\s+/g, ' ');
    content = content.replace(/\$+/g, '');

    if (content) {
      choices[letter] = content;
    }
  }

  return choices;
}

// Extract correct answer from solution text
function extractAnswer(solutionText, solutionHtml = '') {
  if (!solutionText && !solutionHtml) return '';

  const combined = (solutionText + ' ' + solutionHtml).toLowerCase();

  // Look for boxed answer: \boxed{\textbf{(A)}}  or \boxed{A} or \boxed{\textbf{(A)}~content}
  const boxedMatch = combined.match(/\\boxed\{\\textbf\{?\(?([a-e])\)?/i);
  if (boxedMatch) {
    return boxedMatch[1].toUpperCase();
  }

  // Look for "the answer is A" or "answer: A"
  const answerMatch = combined.match(/(?:answer is|answer:|^answer\s+)[\s~]*\(?([a-e])\)?/i);
  if (answerMatch) {
    return answerMatch[1].toUpperCase();
  }

  return '';
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

            // Extract problem data
            const problemData = await page.evaluate(() => {
              const content = document.querySelector('.mw-parser-output');
              if (!content) return null;

              const headers = Array.from(content.querySelectorAll('h2'));

              // Find Problem section
              let problemText = '';
              let problemHtml = '';
              let choicesLatex = '';

              const problemHeader = headers.find(h => h.textContent.toLowerCase().includes('problem'));
              if (problemHeader) {
                const problemParts = [];
                const htmlParts = [];
                let current = problemHeader.nextElementSibling;

                while (current && !current.matches('h2')) {
                  if (current.tagName === 'P' || current.tagName === 'DIV' || current.tagName === 'CENTER' || current.tagName === 'FIGURE') {
                    // Get text
                    problemParts.push(current.textContent.trim());

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

              // Extract choices from LaTeX
              const latexImages = Array.from(content.querySelectorAll('img.latex'));
              for (const img of latexImages) {
                const alt = img.getAttribute('alt') || '';
                if (alt.includes('\\textbf{(A)}') || (alt.includes('(A)') && alt.includes('\\qquad') && alt.includes('(B)'))) {
                  choicesLatex = alt;
                  break;
                }
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

                while (current && !current.matches('h2') && count < 10) {
                  if (current.tagName === 'P') {
                    solutionParts.push(current.textContent.trim());
                    solutionHtmlParts.push(current.innerHTML);
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
                choicesLatex,
                solutionText,
                solutionHtml
              };
            });

            if (problemData) {
              const choices = extractChoices(problemData.choicesLatex);
              const correctAnswer = extractAnswer(problemData.solutionText, problemData.solutionHtml);

              examData.problems.push({
                problemNumber: number,
                problemText: problemData.problemText,
                problemHtml: problemData.problemHtml,
                choices: choices,
                correctAnswer: correctAnswer,
                solutionText: problemData.solutionText
              });

              const hasChoices = Object.keys(choices).length === 5;
              const hasAnswer = correctAnswer !== '';
              console.log(`  ✓ Problem ${number}: Choices=${hasChoices ? '✓' : '✗'} Answer=${hasAnswer ? correctAnswer : '✗'}`);
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
    const filename = './amc8_data.json';
    writeFileSync(filename, JSON.stringify(data, null, 2));

    // Print summary
    const totalProblems = data.exams.reduce((sum, exam) => sum + exam.problems.length, 0);
    const totalWithChoices = data.exams.reduce((sum, exam) =>
      sum + exam.problems.filter(p => Object.keys(p.choices).length === 5).length, 0);
    const totalWithAnswers = data.exams.reduce((sum, exam) =>
      sum + exam.problems.filter(p => p.correctAnswer).length, 0);

    console.log('\n============================================================');
    console.log('✅ SCRAPING COMPLETE');
    console.log('============================================================');
    console.log(`📁 Output: ${filename}`);
    console.log(`📊 Exams scraped: ${data.exams.length}`);
    console.log(`📝 Total problems: ${totalProblems}`);
    console.log('\n📋 Success Rates:');
    console.log(`   • Answer choices: ${totalWithChoices}/${totalProblems} (${Math.round(totalWithChoices/totalProblems*100)}%)`);
    console.log(`   • Correct answers: ${totalWithAnswers}/${totalProblems} (${Math.round(totalWithAnswers/totalProblems*100)}%)`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

scrapeAMC8();
