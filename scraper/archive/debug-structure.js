import { chromium } from 'playwright';

async function debugPageStructure() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Loading 2025 AMC 8 Problem 1...');
  await page.goto('https://artofproblemsolving.com/wiki/index.php/2025_AMC_8_Problems/Problem_1');
  await page.waitForTimeout(2000);

  const structure = await page.evaluate(() => {
    const result = {
      headers: [],
      hasOL: 0,
      latexImages: 0,
      choicesInLatex: false,
      problemHTML: '',
      answerCandidates: []
    };

    // Find all headers
    const headers = Array.from(document.querySelectorAll('h2'));
    result.headers = headers.map(h => h.textContent.trim());

    // Count OL elements
    result.hasOL = document.querySelectorAll('ol').length;

    // Count latex images
    const latexImgs = Array.from(document.querySelectorAll('img.latex'));
    result.latexImages = latexImgs.length;

    // Check if choices are in latex
    result.choicesInLatex = latexImgs.some(img => {
      const alt = img.getAttribute('alt') || '';
      return alt.includes('textbf') && alt.includes('(A)');
    });

    // Get problem section HTML
    const problemHeader = headers.find(h => h.textContent.toLowerCase().includes('problem'));
    if (problemHeader) {
      let current = problemHeader.nextElementSibling;
      const htmlParts = [];
      let count = 0;
      while (current && !current.matches('h2') && count < 5) {
        htmlParts.push(current.outerHTML.substring(0, 200));
        current = current.nextElementSibling;
        count++;
      }
      result.problemHTML = htmlParts.join('\n---\n');
    }

    // Look for answer in solution section
    const solutionHeader = headers.find(h => h.textContent.toLowerCase().includes('solution'));
    if (solutionHeader) {
      let current = solutionHeader.nextElementSibling;
      let count = 0;
      while (current && !current.matches('h2') && count < 3) {
        const text = current.textContent;
        // Look for patterns like "The answer is A" or "boxed{A}"
        const answerMatch = text.match(/answer is ([A-E])|boxed\{([A-E])\}/i);
        if (answerMatch) {
          result.answerCandidates.push(answerMatch[1] || answerMatch[2]);
        }
        current = current.nextElementSibling;
        count++;
      }
    }

    return result;
  });

  console.log('\n=== PAGE STRUCTURE ===');
  console.log('Headers found:', structure.headers);
  console.log('OL elements:', structure.hasOL);
  console.log('LaTeX images:', structure.latexImages);
  console.log('Choices in LaTeX:', structure.choicesInLatex);
  console.log('Answer candidates:', structure.answerCandidates);
  console.log('\n=== PROBLEM HTML PREVIEW ===');
  console.log(structure.problemHTML);

  await browser.close();
}

debugPageStructure();
