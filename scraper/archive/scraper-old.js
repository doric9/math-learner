import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://artofproblemsolving.com';
const START_URL = `${BASE_URL}/wiki/index.php/AMC_8_Problems_and_Solutions`;

// Improved LaTeX parser
function parseLatex(latex) {
  if (!latex) return '';

  let text = latex;

  // Remove dollar signs
  text = text.replace(/\$/g, '');

  // Remove \textbf{} and \text{}
  text = text.replace(/\\textbf\{([^}]*)\}/g, '$1');
  text = text.replace(/\\text\{([^}]*)\}/g, '$1');

  // Remove spacing commands
  text = text.replace(/\\qquad/g, ' ');
  text = text.replace(/\\quad/g, ' ');
  text = text.replace(/\\ /g, ' ');
  text = text.replace(/\\,/g, '');

  // Handle fractions
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');

  // Handle square roots
  text = text.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  text = text.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '($2)^(1/$1)');

  // Math operators
  text = text.replace(/\\cdot/g, '·');
  text = text.replace(/\\times/g, '×');
  text = text.replace(/\\div/g, '÷');
  text = text.replace(/\\pm/g, '±');
  text = text.replace(/\\le/g, '≤');
  text = text.replace(/\\ge/g, '≥');
  text = text.replace(/\\ne/g, '≠');
  text = text.replace(/\\approx/g, '≈');

  // Superscripts
  text = text.replace(/\^\\circ/g, '°');
  text = text.replace(/\^(\d+)/g, '^$1');
  text = text.replace(/\^\{([^}]+)\}/g, '^($1)');

  // Subscripts
  text = text.replace(/_(\d+)/g, '_$1');
  text = text.replace(/\_\{([^}]+)\}/g, '_($1)');

  // Remove remaining backslashes
  text = text.replace(/\\([a-zA-Z]+)/g, '');
  text = text.replace(/\\/g, '');

  // Clean up braces and extra spaces
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

// Extract answer choices from LaTeX
function extractChoices(latexText) {
  if (!latexText) return {};

  const choices = {};

  // Try multiple patterns
  const patterns = [
    /\\textbf\{?\(([A-E])\)\}?[\s\\]*(.+?)(?=\\qquad|\\textbf|$)/g,
    /\(([A-E])\)[\s\\]*(.+?)(?=\\qquad|\s*\([A-E]\)|$)/g
  ];

  for (const pattern of patterns) {
    let match;
    const tempChoices = {};

    while ((match = pattern.exec(latexText)) !== null) {
      const letter = match[1];
      let content = match[2];

      // Clean the content
      content = content.replace(/\\qquad/g, '');
      content = content.replace(/\\quad/g, '');
      content = parseLatex(content);

      if (content && content.trim()) {
        tempChoices[letter] = content.trim();
      }
    }

    // If this pattern found all 5 choices, use it
    if (Object.keys(tempChoices).length === 5) {
      return tempChoices;
    } else if (Object.keys(tempChoices).length > Object.keys(choices).length) {
      Object.assign(choices, tempChoices);
    }
  }

  return choices;
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

    // Scrape specific years for the user
    // Filter yearLinks for 2023, 2024, 2025
    const yearsToScrape = yearLinks.filter(l => [2023, 2024, 2025].includes(l.year));

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
            await page.waitForTimeout(300);

            // Extract problem data
            const problemData = await page.evaluate(({ number }) => {
              const content = document.querySelector('.mw-parser-output');
              if (!content) return null;

              let debugHtml = null;
              if (number === 1) { // generic for any first problem
                debugHtml = content.outerHTML;
              }

              // Get first Problem section (before Solution)
              let problemSection = null;
              const headers = Array.from(content.querySelectorAll('h2'));

              for (let i = 0; i < headers.length; i++) {
                const header = headers[i];
                if (header.textContent.toLowerCase().includes('problem')) {
                  // Get content between this header and next header
                  const nextHeader = headers[i + 1];
                  problemSection = [];
                  let htmlParts = [];

                  let current = header.nextElementSibling;
                  while (current && current !== nextHeader) {
                    // Capture valid content blocks (P, DIV with images, etc)
                    if (current.tagName === 'P' || current.tagName === 'DIV' || current.tagName === 'CENTER') {
                      // Clean up some wiki-specific junk if needed, or just take raw HTML
                      // We need to fix relative URLs for images to absolute
                      let html = current.outerHTML;
                      const baseUrl = 'https://artofproblemsolving.com';
                      html = html.replace(/src="\//g, `src="${baseUrl}/`);
                      htmlParts.push(html);

                      problemSection.push(current.textContent.trim());
                    }
                    current = current.nextElementSibling;
                  }

                  return {
                    problemText: problemSection.join('\n\n'),
                    problemHtml: htmlParts.join('\n'), // New field
                    choicesLatex: '', // will fill below
                    correctAnswer: '',
                    solutionText: ''
                  };
                  break;
                }
              }

              if (!problemSection) return null; // Logic flow adjustment required due to structure change

              // We need to continue extracting choices/solution. 
              // Refactoring the evaluate block slightly to flatten the return.
              // Re-implementing the rest since I broke the loop scope key.

              // (Self-correction: The previous loop had a 'break', I should preserve the logic structure)
              // Let's just return the found elements and process choices/solution separately outside the loop.

              // Actually, simplest is to just assign to a variable 'foundProblem' and break.
              let foundProblemHtml = htmlParts.join('\n');
              let foundProblemText = problemSection.join('\n\n');

              // ... continue to choices/solution extraction ...

              // If we didn't find specific problem text logic above...
              // Check our temp object
              const foundData = window._tempProblemData || { text: '', html: '' };
              delete window._tempProblemData;

              // Extract LaTeX for choices
              let choicesLatex = '';
              const latexImages = Array.from(content.querySelectorAll('img.latex'));

              for (const img of latexImages) {
                const alt = img.getAttribute('alt') || '';
                if (alt.includes('(A)') && alt.includes('(B)') && alt.includes('textbf')) {
                  choicesLatex = alt;
                  break;
                }
              }

              // Find solution and answer
              let solutionText = '';
              let correctAnswer = '';

              for (const header of headers) {
                if (header.textContent.toLowerCase().includes('solution')) {
                  let current = header.nextElementSibling;
                  const solutionParts = [];

                  let count = 0;
                  while (current && !current.matches('h2') && count < 3) {
                    if (current.tagName === 'P') {
                      solutionParts.push(current.textContent.trim());
                      count++;
                    }
                    current = current.nextElementSibling;
                  }

                  solutionText = solutionParts.join(' ');

                  // Extract answer
                  const answerPatterns = [
                    /answer is\s*\(?([A-E])\)?/i,
                    /\boxed\{([A-E])\}/,
                    /therefore[,\s]+\(?([A-E])\)?/i,
                    /answer:\s*\(?([A-E])\)?/i,
                    /^([A-E])$/m
                  ];

                  for (const pattern of answerPatterns) {
                    const match = solutionText.match(pattern);
                    if (match) {
                      correctAnswer = match[1];
                      break;
                    }
                  }
                  break;
                }
              }

              return {
                problemText: foundData.text,
                problemHtml: foundData.html,
                choicesLatex,
                correctAnswer,
                solutionText: solutionText.substring(0, 500)
              };
            }, { number });

            if (problemData && problemData.debugHtml) {
              writeFileSync('debug-problem.html', problemData.debugHtml);
              console.log('Saved debug-problem.html');
            }
            // continue/return or process?
            // For this debug run, we can just crash/exit or continue.
            // But the loop inside evaluate needs to return valid object structure or handle this case.
            // Our evaluate returned ONLY debugHtml in that branch.
            // So problemData.problemText will be undefined.
            // This will crash logic below.

            // Let's modify the PREVIOUS step to return full object AND debugHtml.

            if (problemData && problemData.problemText) {
              const choices = extractChoices(problemData.choicesLatex);

              examData.problems.push({
                problemNumber: number,
                problemText: problemData.problemText,
                problemHtml: problemData.problemHtml,
                choices,
                correctAnswer: problemData.correctAnswer,
                solutionText: problemData.solutionText,
                topic: 'General'
              });

              const hasChoices = Object.keys(choices).length === 5;
              const hasAnswer = !!problemData.correctAnswer;

              console.log(`  ✓ Problem ${number}: Choices=${hasChoices ? '✓' : '✗'} Answer=${hasAnswer ? '✓' : '✗'}`);
            }

          } catch (error) {
            console.error(`  ✗ Problem ${number}: ${error.message}`);
          }
        }

        if (examData.problems.length > 0) {
          data.exams.push(examData);
          console.log(`  ✅ ${year}: ${examData.problems.length} problems scraped\n`);
        }

      } catch (error) {
        console.error(`❌ Error scraping ${year}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }

  // Save data
  const outputPath = './amc8_data.json';
  writeFileSync(outputPath, JSON.stringify(data, null, 2));

  // Calculate success rates
  let totalProblems = 0;
  let problemsWithChoices = 0;
  let problemsWithAnswers = 0;

  data.exams.forEach(exam => {
    exam.problems.forEach(problem => {
      totalProblems++;
      if (Object.keys(problem.choices).length === 5) problemsWithChoices++;
      if (problem.correctAnswer) problemsWithAnswers++;
    });
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ SCRAPING COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 Exams scraped: ${data.exams.length}`);
  console.log(`📝 Total problems: ${totalProblems}`);
  console.log(`\n📋 Success Rates:`);
  console.log(`   • Answer choices: ${problemsWithChoices}/${totalProblems} (${Math.round(problemsWithChoices / totalProblems * 100)}%)`);
  console.log(`   • Correct answers: ${problemsWithAnswers}/${totalProblems} (${Math.round(problemsWithAnswers / totalProblems * 100)}%)`);
  console.log(`${'='.repeat(60)}\n`);

  return data;
}

scrapeAMC8().catch(console.error);
