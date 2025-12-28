import { createInterface } from 'readline';
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Competition configurations
const COMPETITIONS = {
  'amc8': {
    name: 'American Mathematics Competition 8',
    id: 'amc8',
    baseUrl: 'https://artofproblemsolving.com/wiki/index.php',
    indexPath: '/AMC_8_Problems_and_Solutions',
    problemCount: 25
  },
  'amc10': {
    name: 'American Mathematics Competition 10',
    id: 'amc10',
    baseUrl: 'https://artofproblemsolving.com/wiki/index.php',
    indexPath: '/AMC_10_Problems_and_Solutions',
    problemCount: 25
  },
  'amc12': {
    name: 'American Mathematics Competition 12',
    id: 'amc12',
    baseUrl: 'https://artofproblemsolving.com/wiki/index.php',
    indexPath: '/AMC_12_Problems_and_Solutions',
    problemCount: 25
  },
  'aime': {
    name: 'American Invitational Mathematics Examination',
    id: 'aime',
    baseUrl: 'https://artofproblemsolving.com/wiki/index.php',
    indexPath: '/AIME_Problems_and_Solutions',
    problemCount: 15
  }
};

class ScraperAgent {
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.db = null;
    this.initialized = false;
  }

  // Initialize Firebase
  initializeFirebase() {
    if (this.initialized) return;

    try {
      if (!existsSync('./serviceAccountKey.json')) {
        console.log('⚠️  Firebase service account key not found. Upload features will be disabled.');
        return;
      }

      const serviceAccount = JSON.parse(
        readFileSync('./serviceAccountKey.json', 'utf8')
      );

      initializeApp({
        credential: cert(serviceAccount)
      });

      this.db = getFirestore();
      this.initialized = true;
      console.log('✓ Firebase initialized');
    } catch (error) {
      console.log('⚠️  Could not initialize Firebase:', error.message);
    }
  }

  // Parse natural language commands
  parseCommand(input) {
    const lower = input.toLowerCase().trim();

    // Detect command type
    if (lower.includes('scrape') || lower.includes('download')) {
      return this.parseScrapeCommand(input);
    } else if (lower.includes('upload') || lower.includes('ingest')) {
      return { action: 'upload', params: this.parseUploadCommand(input) };
    } else if (lower.includes('search') || lower.includes('find')) {
      return { action: 'search', params: this.parseSearchCommand(input) };
    } else if (lower.includes('list')) {
      return { action: 'list', params: {} };
    } else if (lower.includes('help')) {
      return { action: 'help', params: {} };
    } else if (lower.includes('exit') || lower.includes('quit')) {
      return { action: 'exit', params: {} };
    }

    return { action: 'unknown', params: {} };
  }

  // Parse scrape commands
  parseScrapeCommand(input) {
    const params = {
      competition: null,
      years: [],
      problems: []
    };

    // Extract competition type
    const competitionMatch = input.match(/amc\s*8|amc\s*10|amc\s*12|aime/i);
    if (competitionMatch) {
      params.competition = competitionMatch[0].replace(/\s+/g, '').toLowerCase();
    }

    // Extract year range (e.g., "2020-2024" or "2023")
    const yearRangeMatch = input.match(/(\d{4})\s*-\s*(\d{4})/);
    const singleYearMatch = input.match(/\b(\d{4})\b/g);

    if (yearRangeMatch) {
      const start = parseInt(yearRangeMatch[1]);
      const end = parseInt(yearRangeMatch[2]);
      for (let year = start; year <= end; year++) {
        params.years.push(year);
      }
    } else if (singleYearMatch) {
      params.years = singleYearMatch.map(y => parseInt(y));
    }

    // Extract problem range (e.g., "problem 1-10" or "problems 5,7,9")
    const problemRangeMatch = input.match(/problem[s]?\s+(\d+)\s*-\s*(\d+)/i);
    const problemListMatch = input.match(/problem[s]?\s+([\d,\s]+)/i);

    if (problemRangeMatch) {
      const start = parseInt(problemRangeMatch[1]);
      const end = parseInt(problemRangeMatch[2]);
      for (let num = start; num <= end; num++) {
        params.problems.push(num);
      }
    } else if (problemListMatch) {
      params.problems = problemListMatch[1]
        .split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n));
    }

    return { action: 'scrape', params };
  }

  // Parse upload commands
  parseUploadCommand(input) {
    const params = {
      file: 'amc8_data.json',
      appId: 'amc8-learning-app'
    };

    // Extract filename if specified
    const fileMatch = input.match(/(?:file|from)\s+(\S+\.json)/i);
    if (fileMatch) {
      params.file = fileMatch[1];
    }

    return params;
  }

  // Parse search commands
  parseSearchCommand(input) {
    const params = {
      query: '',
      competition: null,
      year: null,
      topic: null
    };

    // Extract search query (text after "search" or "find")
    const queryMatch = input.match(/(?:search|find)\s+(?:for\s+)?(.+)/i);
    if (queryMatch) {
      params.query = queryMatch[1].trim();
    }

    // Extract topic keywords
    const topics = ['geometry', 'algebra', 'number theory', 'combinatorics', 'probability'];
    for (const topic of topics) {
      if (input.toLowerCase().includes(topic)) {
        params.topic = topic;
      }
    }

    return params;
  }

  // Scrape data
  async scrape(params) {
    const competition = params.competition || 'amc8';
    const config = COMPETITIONS[competition];

    if (!config) {
      console.log(`❌ Unknown competition: ${competition}`);
      console.log(`Available: ${Object.keys(COMPETITIONS).join(', ')}`);
      return;
    }

    console.log(`\n🚀 Starting scrape: ${config.name}`);
    console.log(`📅 Years: ${params.years.length > 0 ? params.years.join(', ') : 'all available'}`);
    console.log(`📝 Problems: ${params.problems.length > 0 ? params.problems.join(', ') : 'all'}\n`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const data = {
      competitionId: config.id,
      competitionName: config.name,
      exams: []
    };

    try {
      // Navigate to main page
      console.log('📡 Fetching exam list...');
      await page.goto(`${config.baseUrl}${config.indexPath}`, {
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
          const yearMatch = text.match(/(\d{4})/);

          if (yearMatch && href) {
            links.push({
              year: parseInt(yearMatch[1]),
              url: href
            });
          }
        }

        return Array.from(new Map(links.map(l => [l.year, l])).values())
          .sort((a, b) => b.year - a.year);
      });

      // Filter years if specified
      let filteredYears = yearLinks;
      if (params.years.length > 0) {
        filteredYears = yearLinks.filter(y => params.years.includes(y.year));
      }

      console.log(`✓ Found ${filteredYears.length} exam years to scrape\n`);

      // Scrape each year
      for (const { year, url } of filteredYears) {
        console.log(`📚 Scraping ${year} ${config.name}...`);

        const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;
        await page.goto(fullUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        await page.waitForTimeout(1000);

        const examData = {
          year,
          problems: []
        };

        // Determine which problems to scrape
        const problemNums = params.problems.length > 0
          ? params.problems
          : Array.from({ length: config.problemCount }, (_, i) => i + 1);

        // Scrape problems
        for (const problemNum of problemNums) {
          try {
            process.stdout.write(`  Problem ${problemNum}... `);

            const problemData = await this.scrapeProblem(page, problemNum);

            if (problemData && problemData.problemText) {
              examData.problems.push(problemData);
              console.log('✓');
            } else {
              console.log('⚠️  (not found)');
            }

            await page.waitForTimeout(100);
          } catch (error) {
            console.log(`❌ (${error.message})`);
          }
        }

        if (examData.problems.length > 0) {
          data.exams.push(examData);
          console.log(`✓ Completed ${year}: ${examData.problems.length} problems\n`);
        }
      }

    } catch (error) {
      console.error('❌ Scraping error:', error.message);
    } finally {
      await browser.close();
    }

    // Save to file
    const filename = `${config.id}_data.json`;
    writeFileSync(filename, JSON.stringify(data, null, 2));

    console.log(`\n✅ Scraping complete!`);
    console.log(`📁 Saved to: ${filename}`);
    console.log(`📊 Total problems: ${data.exams.reduce((sum, e) => sum + e.problems.length, 0)}\n`);
  }

  // Scrape individual problem
  async scrapeProblem(page, problemNum) {
    return await page.evaluate((num) => {
      const result = {
        problemNumber: num,
        problemText: '',
        choices: {},
        correctAnswer: '',
        solutionText: '',
        topic: 'General'
      };

      // Find problem header
      const headers = Array.from(document.querySelectorAll('h2'));
      const problemHeader = headers.find(h =>
        h.textContent.includes(`Problem ${num}`)
      );

      if (!problemHeader) return null;

      // Extract problem text
      let currentElement = problemHeader.nextElementSibling;
      let problemTextParts = [];

      while (currentElement && !currentElement.matches('h2')) {
        if (currentElement.tagName === 'P') {
          if (!currentElement.textContent.toLowerCase().includes('solution')) {
            problemTextParts.push(currentElement.textContent.trim());
          }
        }

        // Extract choices
        if (currentElement.tagName === 'OL' && !result.choices.A) {
          const items = Array.from(currentElement.querySelectorAll('li'));
          const choiceLabels = ['A', 'B', 'C', 'D', 'E'];
          items.forEach((item, idx) => {
            if (idx < choiceLabels.length) {
              result.choices[choiceLabels[idx]] = item.textContent.trim();
            }
          });
          break;
        }

        currentElement = currentElement.nextElementSibling;
      }

      result.problemText = problemTextParts.join(' ').trim();

      // Find solution
      const solutionHeaders = Array.from(document.querySelectorAll('h2'));
      const solutionHeader = solutionHeaders.find(h =>
        h.textContent.includes(`Solution ${num}`)
      );

      if (solutionHeader) {
        let solutionElement = solutionHeader.nextElementSibling;
        let solutionParts = [];

        while (solutionElement && !solutionElement.matches('h2')) {
          if (solutionElement.tagName === 'P' || solutionElement.tagName === 'DIV') {
            const text = solutionElement.textContent.trim();
            solutionParts.push(text);

            // Extract correct answer
            const boldElements = solutionElement.querySelectorAll('b, strong');
            for (const bold of boldElements) {
              const boldText = bold.textContent.trim();
              const answerMatch = boldText.match(/\b([A-E])\b/);
              if (answerMatch && !result.correctAnswer) {
                result.correctAnswer = answerMatch[1];
              }
            }
          }
          solutionElement = solutionElement.nextElementSibling;
        }

        result.solutionText = solutionParts.join(' ').trim();
      }

      return result;
    }, problemNum);
  }

  // Upload to Firebase
  async upload(params) {
    if (!this.db) {
      console.log('❌ Firebase not initialized. Check serviceAccountKey.json');
      return;
    }

    const filename = params.file || 'amc8_data.json';

    if (!existsSync(filename)) {
      console.log(`❌ File not found: ${filename}`);
      return;
    }

    console.log(`\n📤 Uploading ${filename} to Firebase...\n`);

    try {
      const data = JSON.parse(readFileSync(filename, 'utf8'));
      const appId = params.appId || 'amc8-learning-app';

      const competitionRef = this.db
        .collection('artifacts')
        .doc(appId)
        .collection('public')
        .doc('data')
        .collection('competitions')
        .doc(data.competitionId);

      await competitionRef.set({
        name: data.competitionName,
        id: data.competitionId,
        totalExams: data.exams.length
      });

      console.log('✓ Competition document created');

      for (const exam of data.exams) {
        process.stdout.write(`\n📅 Uploading ${exam.year}... `);

        const yearRef = competitionRef
          .collection('exams')
          .doc(exam.year.toString());

        await yearRef.set({
          year: exam.year,
          totalProblems: exam.problems.length
        });

        for (const problem of exam.problems) {
          const problemRef = yearRef
            .collection('problems')
            .doc(problem.problemNumber.toString());

          await problemRef.set(problem);
        }

        console.log(`✓ (${exam.problems.length} problems)`);
      }

      console.log('\n✅ Upload complete!\n');

    } catch (error) {
      console.error('❌ Upload error:', error.message);
    }
  }

  // Search Firebase data
  async search(params) {
    if (!this.db) {
      console.log('❌ Firebase not initialized. Check serviceAccountKey.json');
      return;
    }

    console.log(`\n🔍 Searching for: "${params.query}"\n`);

    try {
      const appId = 'amc8-learning-app';
      const competitionsRef = this.db
        .collection('artifacts')
        .doc(appId)
        .collection('public')
        .doc('data')
        .collection('competitions');

      const competitions = await competitionsRef.get();
      let resultsFound = 0;

      for (const compDoc of competitions.docs) {
        const examsRef = compDoc.ref.collection('exams');
        const exams = await examsRef.get();

        for (const examDoc of exams.docs) {
          const problemsRef = examDoc.ref.collection('problems');
          const problems = await problemsRef.get();

          for (const problemDoc of problems.docs) {
            const problem = problemDoc.data();
            const searchText = `${problem.problemText} ${problem.solutionText} ${problem.topic}`.toLowerCase();

            if (searchText.includes(params.query.toLowerCase())) {
              console.log(`📝 ${compDoc.id.toUpperCase()} ${examDoc.id} - Problem ${problem.problemNumber}`);
              console.log(`   Topic: ${problem.topic}`);
              console.log(`   ${problem.problemText.substring(0, 100)}...`);
              console.log('');
              resultsFound++;
            }
          }
        }
      }

      console.log(`Found ${resultsFound} matching problems\n`);

    } catch (error) {
      console.error('❌ Search error:', error.message);
    }
  }

  // List available data
  async list() {
    console.log('\n📋 Available Competitions:\n');

    for (const [key, comp] of Object.entries(COMPETITIONS)) {
      console.log(`  ${key.toUpperCase()}: ${comp.name}`);
    }

    console.log('\n📁 Local Data Files:\n');

    for (const key of Object.keys(COMPETITIONS)) {
      const filename = `${key}_data.json`;
      if (existsSync(filename)) {
        try {
          const data = JSON.parse(readFileSync(filename, 'utf8'));
          const totalProblems = data.exams.reduce((sum, e) => sum + e.problems.length, 0);
          console.log(`  ✓ ${filename}: ${data.exams.length} exams, ${totalProblems} problems`);
        } catch (error) {
          console.log(`  ⚠️  ${filename}: (invalid format)`);
        }
      }
    }

    console.log('');
  }

  // Show help
  showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AMC Interactive Scraping Agent                     ║
╚══════════════════════════════════════════════════════════════╝

📖 EXAMPLE COMMANDS:

  Scraping:
    "Scrape AMC 8 2020-2024"
    "Download AMC 10 from 2023"
    "Scrape AIME 2022 problems 1-5"
    "Get AMC 12 2021,2022,2023"

  Uploading:
    "Upload to Firebase"
    "Upload amc10_data.json"
    "Ingest data"

  Searching:
    "Search for geometry problems"
    "Find combinatorics"
    "Search probability in 2023"

  Other:
    "List" - Show available competitions and local files
    "Help" - Show this help message
    "Exit" - Quit the agent

💡 TIP: Use natural language! The agent understands context.
`);
  }

  // Prompt for user input
  prompt() {
    return new Promise((resolve) => {
      this.rl.question('\n🤖 > ', (answer) => {
        resolve(answer);
      });
    });
  }

  // Main loop
  async run() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║      🤖 AMC Interactive Download/Scraping Agent             ║
║                                                              ║
║      Type "help" for commands or describe what you need     ║
╚══════════════════════════════════════════════════════════════╝
`);

    // Try to initialize Firebase
    this.initializeFirebase();

    while (true) {
      try {
        const input = await this.prompt();

        if (!input.trim()) continue;

        const command = this.parseCommand(input);

        switch (command.action) {
          case 'scrape':
            await this.scrape(command.params);
            break;
          case 'upload':
            await this.upload(command.params);
            break;
          case 'search':
            await this.search(command.params);
            break;
          case 'list':
            await this.list();
            break;
          case 'help':
            this.showHelp();
            break;
          case 'exit':
            console.log('\n👋 Goodbye!\n');
            this.rl.close();
            process.exit(0);
          case 'unknown':
            console.log('❓ Not sure what you mean. Type "help" for examples.');
            break;
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }
  }
}

// Start the agent
const agent = new ScraperAgent();
agent.run().catch(console.error);
