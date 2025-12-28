# AMC 8 Guided Learning Platform

A complete full-stack application for practicing AMC 8 (American Mathematics Competition 8) problems, featuring web scraping, data ingestion, practice modes, timed mock exams, and AI-powered problem generation.

## Project Overview

This project consists of two main components:

1. **Data Pipeline** (`/scraper`): Web scraper and Firestore ingestion tools
2. **Learning App** (`/app`): React-based web application for students

## Quick Start

### 1. Set Up Data Pipeline

```bash
cd scraper
npm install
npm run demo            # Use pre-made demo dataset (recommended)
npm run ingest          # Upload data to Firestore (requires service account key)
```

The demo dataset includes **24 complete problems** across 3 exam years (2022-2024) with:
- ✅ Complete problem text
- ✅ All answer choices
- ✅ Correct answers
- ✅ Full solutions

See [scraper/README.md](scraper/README.md) for detailed instructions and web scraping options.

### 2. Set Up Learning App

```bash
cd app
npm install
cp .env.example .env    # Configure Firebase & Gemini API keys
npm run dev             # Start development server
```

See [app/README.md](app/README.md) for detailed instructions.

## Features

### Data Pipeline
- Automated web scraping of AMC 8 problems from Art of Problem Solving wiki
- Extracts problem text, multiple choice options, solutions, and correct answers
- Structured JSON output
- Firebase Firestore ingestion with organized hierarchical structure

### Learning Application
- **Exam Selection**: Browse all available AMC 8 exams by year
- **Practice Mode**:
  - Study problems at your own pace
  - Immediate answer feedback (correct/incorrect)
  - Detailed solutions
  - AI-powered similar problem generation using Gemini
- **Mock Exam Mode**:
  - 40-minute timed test
  - Side panel navigation with visual progress tracking
  - Auto-submit when time expires
- **Results View**:
  - Comprehensive score breakdown
  - Question-by-question analysis
  - Complete solutions for review

## Technology Stack

### Backend/Data
- Node.js
- Playwright (web scraping)
- Firebase Admin SDK (data ingestion)
- Firebase Firestore (database)

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router v6
- Firebase (Firestore + Auth)
- Google Gemini API (AI problem generation)

## Project Structure

```
amc8-guided-learning/
├── scraper/                    # Data pipeline
│   ├── scraper.js             # Web scraping script
│   ├── ingest-to-firestore.js # Firestore upload script
│   ├── package.json
│   └── README.md
├── app/                       # React learning application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── firebase/         # Firebase config
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── firestore.rules       # Security rules
│   ├── package.json
│   └── README.md
├── project_plan.md           # Original project specification
└── README.md                 # This file
```

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Firebase project created
- Gemini API key (for AI features)

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd amc8-guided-learning
```

### Step 2: Scrape Data

```bash
cd scraper
npm install
npm run scrape
```

This creates `amc8_data.json` with all AMC 8 problems.

### Step 3: Set Up Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Enable Anonymous Authentication
4. Download service account key and save as `scraper/serviceAccountKey.json`

### Step 4: Ingest Data to Firestore

```bash
cd scraper
npm run ingest
```

### Step 5: Configure App

```bash
cd app
cp .env.example .env
# Edit .env with your Firebase and Gemini API credentials
```

### Step 6: Deploy Security Rules

```bash
cd app
firebase deploy --only firestore:rules
```

### Step 7: Run the App

```bash
cd app
npm run dev
```

Visit `http://localhost:5173` to use the application.

## Data Flow

```
AoPS Wiki → Scraper → amc8_data.json → Ingestion Script → Firestore → React App
```

## Firestore Schema

```
artifacts/{appId}/public/data/
  competitions/
    amc8/
      name: "American Mathematics Competition 8"
      id: "amc8"
      totalExams: number
      exams/ (subcollection)
        {year}/ (e.g., "2022")
          year: 2022
          totalProblems: 25
          problems/ (subcollection)
            {problemNumber}/ (e.g., "1")
              problemNumber: 1
              problemText: "..."
              choices: { A: "...", B: "...", ... }
              correctAnswer: "A"
              solutionText: "..."
              topic: "Arithmetic"
```

## Security

- Firestore rules allow public read access to competition data
- Write access restricted to Firebase Admin SDK only
- Anonymous authentication used for user sessions
- No sensitive data stored in client

## Future Enhancements

- User progress tracking and analytics
- Performance-based study recommendations
- Additional competitions (AMC 10, AMC 12, AIME)
- Spaced repetition for weak topics
- Collaborative features (discussion forums)
- Mobile app version

## License

This project is for educational purposes.

## Acknowledgments

- Problems sourced from [Art of Problem Solving](https://artofproblemsolving.com)
- AMC 8 is a program of the Mathematical Association of America
