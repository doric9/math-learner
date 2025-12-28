# 🤖 AMC Interactive Download/Scraping Agent

An intelligent, prompt-based CLI tool for scraping and managing math competition problems from Art of Problem Solving (AoPS) wiki.

## ✨ Features

- **Natural Language Commands**: No need to remember complex flags or syntax
- **Multiple Competitions**: Support for AMC 8, AMC 10, AMC 12, and AIME
- **Flexible Filtering**: Select specific years, year ranges, or problem numbers
- **Direct Firebase Integration**: Upload scraped data directly to Firestore
- **Content Search**: Search through existing Firebase data by keywords or topics
- **Progress Tracking**: Real-time feedback during scraping operations
- **Two-Step Process**: Scrape to JSON first, then upload when ready

## 🚀 Quick Start

### Installation

```bash
cd scraper
npm install
```

### Running the Agent

```bash
npm run agent
```

## 📖 Usage Examples

The agent understands natural language! Just describe what you want:

### Scraping Commands

```
Scrape AMC 8 2020-2024
```
Downloads all AMC 8 problems from 2020 to 2024

```
Download AMC 10 from 2023
```
Downloads all AMC 10 problems from 2023

```
Scrape AIME 2022 problems 1-5
```
Downloads only problems 1 through 5 from AIME 2022

```
Get AMC 12 2021,2022,2023
```
Downloads AMC 12 from specific years

```
Scrape AMC 8 problem 15-20 from 2024
```
Downloads problems 15-20 from AMC 8 2024

### Upload Commands

```
Upload to Firebase
```
Uploads the most recent data file (amc8_data.json) to Firebase

```
Upload amc10_data.json
```
Uploads a specific data file to Firebase

```
Ingest data
```
Alternative way to upload data

### Search Commands

```
Search for geometry problems
```
Searches through Firebase for problems related to geometry

```
Find combinatorics
```
Finds problems about combinatorics

```
Search probability
```
Searches for probability problems

### Utility Commands

```
List
```
Shows available competitions and local data files

```
Help
```
Displays help message with examples

```
Exit
```
Quits the agent

## 🎯 Supported Competitions

| Competition | ID | Problems per Exam |
|------------|-------|-------------------|
| AMC 8 | `amc8` | 25 |
| AMC 10 | `amc10` | 25 |
| AMC 12 | `amc12` | 25 |
| AIME | `aime` | 15 |

## 🔥 Command Parsing

The agent intelligently parses your input:

### Competition Detection
- Detects: `amc 8`, `amc8`, `AMC 8`, `amc10`, `amc12`, `aime`
- Case-insensitive and flexible spacing

### Year Detection
- **Range**: `2020-2024` (scrapes all years from 2020 to 2024)
- **Multiple**: `2021,2022,2023` (scrapes specific years)
- **Single**: `2023` (scrapes just 2023)
- **All**: If no year specified, scrapes all available years

### Problem Number Detection
- **Range**: `problems 1-10` (scrapes problems 1 through 10)
- **Multiple**: `problems 5,7,9` (scrapes specific problems)
- **All**: If no problems specified, scrapes all problems

## 📁 Output Files

Scraped data is saved as JSON files:

- `amc8_data.json` - AMC 8 problems
- `amc10_data.json` - AMC 10 problems
- `amc12_data.json` - AMC 12 problems
- `aime_data.json` - AIME problems

### Data Format

```json
{
  "competitionId": "amc8",
  "competitionName": "American Mathematics Competition 8",
  "exams": [
    {
      "year": 2024,
      "problems": [
        {
          "problemNumber": 1,
          "problemText": "What is 2 + 2?",
          "choices": {
            "A": "3",
            "B": "4",
            "C": "5",
            "D": "6",
            "E": "7"
          },
          "correctAnswer": "B",
          "solutionText": "2 + 2 = 4",
          "topic": "Arithmetic"
        }
      ]
    }
  ]
}
```

## 🔥 Firebase Integration

### Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Download service account key (Settings → Service Accounts → Generate New Private Key)
4. Save as `serviceAccountKey.json` in the scraper directory

### Upload Process

```bash
# Start agent
npm run agent

# Scrape data
🤖 > Scrape AMC 8 2023

# Upload to Firebase
🤖 > Upload to Firebase
```

### Firestore Structure

```
artifacts/{appId}/public/data/
  competitions/
    amc8/
      name: "American Mathematics Competition 8"
      totalExams: number
      exams/ (subcollection)
        {year}/
          year: 2023
          totalProblems: 25
          problems/ (subcollection)
            {problemNumber}/
              problemNumber: 1
              problemText: "..."
              choices: {...}
              correctAnswer: "B"
              solutionText: "..."
              topic: "Geometry"
```

## 🔍 Search Functionality

Search through Firebase data using natural language:

```
🤖 > Search for geometry problems
```

The search will:
- Look through all competitions in Firebase
- Search in problem text, solution text, and topics
- Display matching results with problem numbers and previews

### Detected Topics

The agent recognizes these topics:
- Geometry
- Algebra
- Number Theory
- Combinatorics
- Probability

## 🛠️ Advanced Usage

### Custom App ID

By default, data is uploaded to the `amc8-learning-app` path. You can customize this in the code by modifying the `appId` parameter.

### Multiple Competition Types

Scrape different competitions in the same session:

```
🤖 > Scrape AMC 8 2024
🤖 > Scrape AMC 10 2024
🤖 > Scrape AMC 12 2024
🤖 > List
```

### Verification

After scraping, verify your data:

```
🤖 > List
```

This shows all local JSON files with their statistics.

## 💡 Tips

1. **Start Small**: Test with a single year first before scraping everything
2. **Check Output**: Use `List` to verify what data you have locally
3. **Firebase Optional**: You can scrape without Firebase - search features require it
4. **Resume Failed Scrapes**: The agent handles errors gracefully and continues
5. **Natural Language**: Don't worry about exact syntax - the agent is flexible!

## 🐛 Troubleshooting

### "Firebase not initialized"
- Ensure `serviceAccountKey.json` exists in the scraper directory
- Check that the file is valid JSON
- Upload features will be disabled without Firebase, but scraping still works

### "File not found" when uploading
- Make sure you scraped data first
- Check the filename matches what you scraped (e.g., `amc8_data.json`)
- Use `List` to see available files

### Scraping returns no problems
- The website structure may have changed
- Try a different year
- Check your internet connection

### Browser errors
- Playwright may need to install browsers: `npx playwright install`

## 🔄 Migration from Old Scraper

The new agent is backward compatible:

**Old way:**
```bash
npm run scrape
npm run ingest
```

**New way:**
```bash
npm run agent
🤖 > Scrape AMC 8
🤖 > Upload to Firebase
```

Both produce identical results! The agent adds flexibility and ease of use.

## 📝 Example Session

```
$ npm run agent

╔══════════════════════════════════════════════════════════════╗
║      🤖 AMC Interactive Download/Scraping Agent             ║
║                                                              ║
║      Type "help" for commands or describe what you need     ║
╚══════════════════════════════════════════════════════════════╝

✓ Firebase initialized

🤖 > Scrape AMC 8 2023-2024

🚀 Starting scrape: American Mathematics Competition 8
📅 Years: 2023, 2024
📝 Problems: all

📡 Fetching exam list...
✓ Found 2 exam years to scrape

📚 Scraping 2024 American Mathematics Competition 8...
  Problem 1... ✓
  Problem 2... ✓
  ...
  Problem 25... ✓
✓ Completed 2024: 25 problems

📚 Scraping 2023 American Mathematics Competition 8...
  Problem 1... ✓
  Problem 2... ✓
  ...
  Problem 25... ✓
✓ Completed 2023: 25 problems

✅ Scraping complete!
📁 Saved to: amc8_data.json
📊 Total problems: 50

🤖 > Upload to Firebase

📤 Uploading amc8_data.json to Firebase...

✓ Competition document created

📅 Uploading 2024... ✓ (25 problems)
📅 Uploading 2023... ✓ (25 problems)

✅ Upload complete!

🤖 > Search for geometry problems

🔍 Searching for: "geometry"

📝 AMC8 2024 - Problem 15
   Topic: Geometry
   A square has side length 10. What is the area of the square...

📝 AMC8 2023 - Problem 12
   Topic: Geometry
   A circle has radius 5. Find the circumference...

Found 8 matching problems

🤖 > Exit

👋 Goodbye!
```

## 🎓 Learning the Commands

Don't worry about memorizing syntax! The agent is designed to understand natural language. Just describe what you want to do, and it will figure it out. Start with simple commands like:

- "Scrape AMC 8"
- "List"
- "Help"

Then try more complex queries as you get comfortable!

## 🚀 Future Enhancements

Potential features for future versions:
- Resume interrupted scrapes
- Parallel scraping for faster downloads
- Export to different formats (CSV, PDF)
- Offline search without Firebase
- Problem difficulty classification
- Auto-categorization by topic
- Batch operations

---

**Happy Scraping! 📚✨**
