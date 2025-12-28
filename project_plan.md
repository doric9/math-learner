# AMC 8 Guided Learning App - Build Instructions

Build a web application for practicing AMC 8 math competition problems with the following components:

## Part 1: Web Scraping Agent

**Task**: Create a Playwright-based Node.js script to scrape AMC 8 problems from AoPS wiki.

**Requirements**:
- Start at: https://artofproblemsolving.com/wiki/index.php/AMC_8_Problems_and_Solutions
- Crawl all year links (e.g., /wiki/index.php/2022_AMC_8_Problems)
- For each year's page:
  - Extract problem text from paragraphs following headers like `<h2>Problem 1</h2>`
  - Extract multiple-choice options from `<ol>` elements
  - Click to expand "Solution" toggles/collapsible elements
  - Extract solution text and correct answer (often bolded)
- Include try-catch blocks per page/problem with error logging (year + problem number)
- Output to: `amc8_data.json`

**Output Schema**:
```json
{
  "competitionId": "amc8",
  "competitionName": "American Mathematics Competition 8",
  "exams": [
    {
      "year": 2022,
      "problems": [
        {
          "problemNumber": 1,
          "problemText": "...",
          "choices": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
          "correctAnswer": "A",
          "solutionText": "...",
          "topic": "Arithmetic"
        }
      ]
    }
  ]
}
```

**CLI**: Script should run via `node scraper.js` (or similar)

## Part 2: Learning App

**Tech Stack**: React, Firebase (Firestore + Auth), Tailwind CSS

### Phase 1: Setup & Data Ingestion

**Tasks**:
1. Initialize React app with Tailwind CSS
2. Set up Firebase project with Firestore
3. Configure Firestore security rules (public read, admin write only)
4. Create Node.js script using Firebase Admin SDK to upload `amc8_data.json` to Firestore
5. Implement anonymous Firebase Authentication

**Firestore Structure**:
```
artifacts/{appId}/public/data/
  competitions/
    amc8/
      exams/ (subcollection)
        {year}/ (e.g., "2022")
          problems/ (subcollection)
            {problemNumber}/ (e.g., "1")
```

### Phase 2: Practice Mode

**Build**:
- Exam selection page: responsive grid displaying all available exams
- `PracticeView` component:
  - Display one problem at a time
  - Show multiple choice options
  - Immediate visual feedback on answer selection (correct/incorrect)
  - "Show Solution" button (available after attempt)
  - Track user answers in session state

### Phase 3: Mock Exam Mode

**Build**:
- `TestView` component:
  - 40-minute countdown timer (persistent, always visible)
  - Side panel with 25-problem grid for navigation
  - Visual indicators for answered/unanswered questions
  - State persistence for answers
- `ResultsView` component:
  - Display final score (e.g., 23/25)
  - Question-by-question breakdown with correct/incorrect/unanswered status
  - Full solutions for all problems

### Phase 4: AI Problem Generation

**Build**:
- Add "Generate Similar Problem" button in `PracticeView`
- Integrate Gemini API:
  - Send prompt with: original problem text, topic, and solution
  - Request new problem testing same concept
  - Require JSON response format
- Display AI-generated problem and solution in modal
- Handle loading states and errors gracefully

## Acceptance Criteria

- Web scraper successfully extracts all AMC 8 data to valid JSON
- App displays all exams and problems from Firestore
- Practice mode provides immediate feedback and shows solutions
- Mock exam mode enforces 40-minute timer with navigation
- Results view shows detailed breakdown with solutions
- AI generation creates similar problems based on original content
