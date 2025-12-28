import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://artofproblemsolving.com';
const START_URL = `${BASE_URL}/wiki/index.php/AMC_8_Problems_and_Solutions`;

// IMPROVED: Extract answer choices from LaTeX string with multiple pattern support
function extractChoices(latexText) {
  if (!latexText) return {};

  const choices = {};

  // Try multiple patterns to handle variations
  const patterns = [
    // Pattern 1: Standard \textbf{(A)}\ content (backslash-space or tilde)
    /\\textbf\{\(([A-E])\)\}[\\~\s]+([^\\]+?)(?=\\qquad|\\textbf|\s*$)/g,

    // Pattern 2: Space inside braces \textbf{(A) } content
    /\\textbf\{\(([A-E])\)\s*\}[\\~\s]*([^\\]+?)(?=\\qquad|\\textbf|\s*$)/g,

    // Pattern 3: Flexible with optional backslash in braces
    /\\textbf\{\\?\(([A-E])\)\\?\}[\\~\s]*([^\\]+?)(?=\\qquad|\\textbf|\s*$)/g
  ];

  for (const pattern of patterns) {
    let match;
    const tempChoices = {};

    // Reset regex state
    pattern.lastIndex = 0;

    while ((match = pattern.exec(latexText)) !== null) {
      const letter = match[1];
      let content = match[2];

      // Clean up the content
      content = content.trim();
      content = content.replace(/\s+/g, ' ');
      content = content.replace(/\$+/g, '');
      content = content.replace(/\\qquad/g, '').trim();

      if (content && content.length > 0) {
        tempChoices[letter] = content;
      }
    }

    // If this pattern found all 5 choices, use it
    if (Object.keys(tempChoices).length === 5) {
      return tempChoices;
    } else if (Object.keys(tempChoices).length > Object.keys(choices).length) {
      // Use the pattern that found the most choices
      Object.assign(choices, tempChoices);
    }
  }

  return choices;
}

// IMPROVED: Extract correct answer with numeric mapping support
function extractAnswer(solutionText, solutionHtml = '', choices = {}) {
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

  // Try 3: NEW - Look for numeric answer and map to choice
  const numAnswerMatch = combined.match(/(?:answer is|answer:|final answer is)[\s~]*[\\$]*([0-9,\.]+)/i);
  if (numAnswerMatch && Object.keys(choices).length > 0) {
    const numAnswer = numAnswerMatch[1].replace(/,/g, '').trim();

    // Try to find which choice matches this number
    for (const [letter, value] of Object.entries(choices)) {
      const cleanValue = value.replace(/,/g, '').replace(/\$/g, '').trim();
      if (cleanValue === numAnswer || cleanValue.includes(numAnswer)) {
        return letter;
      }
    }
  }

  // Try 4: Look for "therefore (A)" or "so (B)"
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
              let choicesLatex = '';

              const problemHeader = headers.find(h => h.textContent.toLowerCase().includes('problem'));
              if (problemHeader) {
                const problemParts = [];
                const htmlParts = [];
                let current = problemHeader.nextElementSibling;

                while (current && !current.matches('h2')) {
                  if (current.tagName === 'P' || current.tagName === 'DIV' || current.tagName === 'CENTER' || current.tagName === 'FIGURE') {
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

              // IMPROVED: Extract choices from ALL LaTeX images, not just one
              const latexImages = Array.from(content.querySelectorAll('img.latex'));
              const choicesLatexParts = [];

              for (const img of latexImages) {
                const alt = img.getAttribute('alt') || '';
                // Check if this image contains choice labels
                if (alt.includes('\\textbf{(A)') || alt.includes('\\textbf{(B)') ||
                  alt.includes('\\textbf{(C)') || alt.includes('\\textbf{(D)') ||
                  alt.includes('\\textbf{(E)')) {
                  choicesLatexParts.push(alt);
                }
              }

              // Combine all choice-related LaTeX into one string
              choicesLatex = choicesLatexParts.join(' ');

              // IMPROVED: Fallback to HTML lists for legacy wiki pages
              if (!choicesLatex || choicesLatexParts.length === 0) {
                const olLists = Array.from(content.querySelectorAll('ol'));
                for (const ol of olLists) {
                  const items = ol.querySelectorAll('li');
                  if (items.length === 5) {
                    // Likely the choices list
                    const htmlChoices = Array.from(items).map((li, idx) => {
                      const letter = String.fromCharCode(65 + idx); // A, B, C, D, E
                      return `\\textbf{(${letter})} ${li.textContent.trim()} \\qquad`;
                    }).join(' ');
                    choicesLatex = htmlChoices;
                    break;
                  }
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
                choicesLatex,
                solutionText,
                solutionHtml
              };
            });

            if (problemData) {
              const choices = extractChoices(problemData.choicesLatex);

              // NEW: Prioritize answer from Answer Key map, fallback to extraction
              let correctAnswer = answerKeyMap[number] || '';
              if (!correctAnswer) {
                correctAnswer = extractAnswer(problemData.solutionText, problemData.solutionHtml, choices);
              }

              examData.problems.push({
                problemNumber: number,
                problemText: problemData.problemText,
                problemHtml: problemData.problemHtml,
                choices: choices,
                correctAnswer: correctAnswer,
                solutionText: problemData.solutionText,
                solutionHtml: problemData.solutionHtml
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
    const filename = '../amc8_data_improved.json';
    writeFileSync(filename, JSON.stringify(data, null, 2));

    // Print summary
    const totalProblems = data.exams.reduce((sum, exam) => sum + exam.problems.length, 0);
    const totalWithChoices = data.exams.reduce((sum, exam) =>
      sum + exam.problems.filter(p => Object.keys(p.choices).length === 5).length, 0);
    const totalWithAnswers = data.exams.reduce((sum, exam) =>
      sum + exam.problems.filter(p => p.correctAnswer).length, 0);

    console.log('\n============================================================');
    console.log('✅ IMPROVED SCRAPING COMPLETE');
    console.log('============================================================');
    console.log(`📁 Output: ${filename}`);
    console.log(`📊 Exams scraped: ${data.exams.length}`);
    console.log(`📝 Total problems: ${totalProblems}`);
    console.log('\n📋 Success Rates:');
    console.log(`   • Answer choices: ${totalWithChoices}/${totalProblems} (${Math.round(totalWithChoices / totalProblems * 100)}%)`);
    console.log(`   • Correct answers: ${totalWithAnswers}/${totalProblems} (${Math.round(totalWithAnswers / totalProblems * 100)}%)`);

    // Show improvement
    console.log('\n📈 Improvement vs Previous:');
    console.log(`   • Choices: ${Math.round(totalWithChoices / totalProblems * 100)}% (was 39%)`);
    console.log(`   • Answers: ${Math.round(totalWithAnswers / totalProblems * 100)}% (was 73%)`);
    console.log('============================================================\n');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

scrapeAMC8();
