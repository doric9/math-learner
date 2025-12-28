# AMC 8 Data Pipeline

Tools for scraping AMC 8 problems and uploading them to Firebase Firestore.

## Installation

```bash
npm install
```

## Quick Start (Demo Data)

**For development and testing, use the pre-made demo dataset:**

```bash
npm run demo
```

This copies the curated demo dataset (`amc8_demo_data.json`) with 24 complete problems across 3 exam years (2022-2024) into `amc8_data.json`.

The demo dataset includes:
- ✅ Complete problem text (all numbers/equations filled in)
- ✅ All answer choices (A-E)
- ✅ Correct answers for every problem
- ✅ Complete solutions

## Advanced: Scrape Live Data

**Note:** The web scraper works but has limitations (see `SCRAPER_REPORT.md`). It extracts answer choices well (96% success) but problem text is incomplete due to LaTeX rendering.

### Option 1: Basic Scraper (Original)
```bash
npm run scrape
```

### Option 2: Full Scraper with LaTeX Parsing
```bash
npm run scrape-full
```

Both save data to `amc8_data.json`.

## Step 2: Ingest to Firestore

Before running the ingestion script:

1. Download your Firebase service account key from the Firebase Console
2. Save it as `serviceAccountKey.json` in this directory
3. Run the ingestion script:

```bash
npm run ingest
```

This will upload all scraped data to your Firestore database following this structure:

```
artifacts/{appId}/public/data/
  competitions/
    amc8/
      exams/ (subcollection)
        {year}/ (e.g., "2022")
          problems/ (subcollection)
            {problemNumber}/ (e.g., "1")
```

## Data Schema

### Scraped JSON (`amc8_data.json`)

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
          "choices": { "A": "...", "B": "...", ... },
          "correctAnswer": "A",
          "solutionText": "...",
          "topic": "General"
        }
      ]
    }
  ]
}
```

## Notes

- The scraper handles errors gracefully, logging any issues with specific years or problems
- Run periodically to collect new exams as they become available
- The script includes small delays to be respectful of the AoPS server
- Make sure to add `serviceAccountKey.json` to your `.gitignore`
