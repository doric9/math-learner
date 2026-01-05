# AMC 8 Guided Learning Platform

A comprehensive full-stack application for practicing AMC 8 (American Mathematics Competition 8) problems, featuring automated data pipelines, an AI-powered tutoring system, gamification elements, and personalized learning tools.

## Project Overview

The project is organized into two primary components:

1.  **Data Pipeline** (`/scraper`): Tools for harvesting problems from the AoPS Wiki and ingesting them into Firestore.
2.  **Learning Platform** (`/platform`): A robust Firebase-powered ecosystem:
    *   **Web App** (`/platform/web`): A React dashboard for students.
    *   **Cloud Functions** (`/platform/functions`): Backend proxy for secure Gemini AI integration and access control.

## Key Features

### 🎓 Learning Experience
*   **Timed Mock Exams**: Full 25-question, 40-minute simulated testing environment with a problem navigation sidebar and "Mark for Review" functionality.
*   **Practice Mode**: Topic-specific or year-specific practice with immediate feedback and detailed solutions.
*   **Mistake Journal**: An automated system that tracks incorrect answers and uses spaced repetition to help students master challenging concepts.

### 🤖 AI Tutor & Assistant
*   **Socratic Tutoring**: A Gemini-powered AI tutor that provides hints and guides students through problems without giving away the answer.
*   **Solution Explainer**: Detailed, step-by-step explanations of complex math problems generated on-demand.
*   **Access Control**: A robust allowlist system (managed via Firestore) to ensure secure and controlled access to AI features.

### 🎮 Gamification & Engagement
*   **XP & Leveling System**: Earn experience points for daily logins, practicing problems, and completing mock tests.
*   **Streaks & Badges**: Unlock achievements for consistent practice and performance milestones.
*   **Progress Dashboard**: Visual tracking of learning activity, performance trends, and earned badges.

## Technology Stack

### Backend & Infrastructure
*   **Firebase / Google Cloud**: Firestore (Database), Authentication, Cloud Functions (Node.js), and Hosting.
*   **Google Gemini API**: Advanced LLM for Socratic tutoring and solution generation.
*   **Playwright**: Industrial-strength web scraping for data collection.

### Frontend
*   **React 18**: Modern UI development with Vite.
*   **Tailwind CSS**: Utility-first styling for a responsive, premium design.
*   **React Router v6**: Dynamic client-side routing.
*   **Math Rendering**: Support for LaTeX-style math formulas.

## Project Structure

```bash
amc8-guided-learning/
├── scraper/                  # Data pipeline tools
│   ├── scraper.js           # AoPS Wiki problem scraper
│   ├── ingest-to-firestore.js # Data upload utility
│   └── amc8_data.json       # Local data storage (intermediary)
├── platform/                 # Core application services
│   ├── web/                 # React frontend (Vite project)
│   │   ├── src/components/  # UI components (Dashboard, Tutor, etc.)
│   │   ├── src/services/    # API and internal services
│   │   └── .env.example     # Configuration template
│   ├── functions/           # Firebase Cloud Functions (AI Proxy)
│   │   └── index.js         # Gemini integration & access control
│   ├── firestore.rules      # Database security configuration
│   └── firebase.json        # Firebase deployment config
└── project_plan.md           # Original roadmap and specifications
```

## Quick Start

### 1. Scrape and Ingest Data
```bash
cd scraper
npm install
npm run scrape  # Collects problems from AoPS Wiki
# Copy your serviceAccountKey.json to the scraper directory
npm run ingest  # Uploads data to Firestore
```

### 2. Deploy Backend Services
```bash
cd platform
# Install functions dependencies
cd functions && npm install && cd ..
# Deploy functions, rules, and indexes
firebase deploy --only functions,firestore
```

### 3. Start the Web App
```bash
cd platform/web
npm install
cp .env.example .env # Configure your Firebase and Gemini keys
npm run dev
```

## Database Schema Highlights

### `competitions/amc8/exams/{year}/problems/{number}`
*   `problemHtml/problemText`: The core problem content.
*   `correctAnswer`: Correct letter option (A-E).
*   `solutionHtml`: Step-by-step solution.
*   `topic`: Mathematical category (e.g., Geometry, Algebra).

### `users/{uid}`
*   `xp`: Cumulative experience points.
*   `level`: Current user level.
*   `streak`: Object tracking `current` streak and `lastActivityDate`.
*   `badges`: Array of earned achievement IDs.

### `users/{uid}/mistakeJournal/{problemId}`
*   `missedCount`: Number of times the problem was missed.
*   `nextReviewDate`: Date for next spaced repetition review.
*   `status`: Current learning state (`learning`, `mastered`).

## Security & Ethics
*   **Secret Management**: Gemini API keys are handled as Firebase Secrets to prevent client-side exposure.
*   **Access Control**: AI features are restricted via a server-side allowlist (`config/aiAccess`).
*   **Data Integrity**: Firestore rules ensure that mission-critical data remains immutable from the client.

---
*Created for educational purposes. Problem data sourced from the [Art of Problem Solving Wiki](https://artofproblemsolving.com/wiki/index.php/AMC_8_Problems_and_Solutions).*
