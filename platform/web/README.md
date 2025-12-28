# AMC 8 Guided Learning App

A comprehensive web application for practicing AMC 8 (American Mathematics Competition 8) problems with practice mode, timed mock exams, and AI-powered problem generation.

## Features

- **Exam Selection**: Browse and select from all available AMC 8 exams
- **Practice Mode**:
  - Study problems at your own pace
  - Immediate answer feedback
  - View detailed solutions
  - AI-powered similar problem generation
- **Mock Exam Mode**:
  - Timed 40-minute test environment
  - Side panel navigation
  - Visual progress tracking
- **Results View**:
  - Detailed score breakdown
  - Question-by-question analysis
  - Complete solutions for all problems

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the app directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Then fill in your Firebase and Gemini API credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Set Up Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Anonymous Authentication
4. Deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

The security rules are defined in `firestore.rules`:
- Public read access to competition data
- Write access restricted to Admin SDK only

### 4. Ingest Data

Before running the app, you need to populate Firestore with AMC 8 data. See the `scraper/` directory for instructions on:
1. Scraping AMC 8 problems
2. Uploading them to Firestore

## Development

```bash
npm run dev
```

This starts the development server at `http://localhost:5173`

## Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Project Structure

```
src/
├── components/
│   ├── ExamSelection.jsx    # Home page with exam grid
│   ├── PracticeView.jsx     # Practice mode interface
│   ├── TestView.jsx         # Timed mock exam
│   ├── ResultsView.jsx      # Test results breakdown
│   └── AIGeneratorModal.jsx # AI problem generation
├── firebase/
│   └── config.js            # Firebase initialization
├── App.jsx                  # Router configuration
├── main.jsx                 # App entry point
└── index.css                # Tailwind CSS directives
```

## Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Anonymous Auth
- **Routing**: React Router v6
- **AI**: Google Gemini API

## Firestore Data Structure

```
artifacts/{appId}/public/data/
  competitions/
    amc8/
      exams/ (subcollection)
        {year}/
          year: number
          totalProblems: number
          problems/ (subcollection)
            {problemNumber}/
              problemNumber: number
              problemText: string
              choices: object
              correctAnswer: string
              solutionText: string
              topic: string
```

## Features in Detail

### Practice Mode
- Navigate through problems freely
- Select answers and get immediate feedback (correct/incorrect)
- View detailed solutions after attempting
- Generate similar AI problems using Gemini

### Mock Exam Mode
- Simulates real test conditions with 40-minute timer
- Side panel showing all 25 problems
- Visual indicators for answered/unanswered questions
- Auto-submit when time expires
- State persistence during the test

### Results View
- Comprehensive score summary
- Visual breakdown by correct/incorrect/unanswered
- Detailed solution for every problem
- Options to retake test or practice individual problems

## Contributing

This is a learning application. Feel free to extend it with additional features like:
- User progress tracking
- Performance analytics
- More competition types (AMC 10, AMC 12, etc.)
- Study recommendations based on performance
