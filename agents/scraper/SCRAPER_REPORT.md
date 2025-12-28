# AMC 8 Web Scraper - LaTeX Parsing Results

## Summary

Option 2 (parsing LaTeX from image alt-text) was tested and achieved **mixed results**.

### Success Rates

Scraped **50 problems** from 2 exam years (2024-2025):

| Metric | Success Rate | Details |
|--------|-------------|---------|
| **Answer Choices** | **96%** (48/50) | ✅ Excellent |
| **Correct Answers** | **4%** (2/50) | ❌ Poor |
| **Problem Text** | **100%** (50/50) | ⚠️ Incomplete |
| **Solutions** | **100%** (50/50) | ⚠️ Incomplete |

## What Works Well ✅

### 1. Answer Choice Extraction (96% success)
The scraper successfully extracts and parses answer choices from LaTeX images:

**Example:**
```json
"choices": {
  "A": "40",
  "B": "50",
  "C": "60",
  "D": "75",
  "E": "80"
}
```

Clean, readable, and properly formatted!

### 2. Page Navigation (100% success)
- Successfully found all 26 exam years
- Navigated to individual problem pages
- Extracted problem structure correctly

## What Needs Improvement ⚠️

### 1. Missing Math Content in Text
Numbers and equations in problem text appear as blank spaces because they're LaTeX images:

**Example:**
```
"When Annika and  of her friends play Buffalo Shuffle-o, each player is dealt  cards."
```
Should be: "When Annika and **3** of her friends play Buffalo Shuffle-o, each player is dealt **12** cards."

### 2. Missing Correct Answers (4% success)
Only 2 out of 50 problems had answers extracted. The solutions don't consistently state the answer in a parseable format.

**Successful extraction example:**
```
"The answer is A"  → correctly extracted as "A"
```

**Failed extraction example:**
```
"Therefore, the final answer is 10."  → answer not extracted
```

## Technical Details

### LaTeX Parsing Capabilities

The scraper successfully handles:
- ✅ Bold text: `\textbf{...}`
- ✅ Fractions: `\frac{a}{b}` → `(a/b)`
- ✅ Math operators: `\times` → `×`, `\div` → `÷`
- ✅ Superscripts: `x^2` → `x^2`
- ✅ Multiple choice formatting
- ✅ Spacing commands: `\qquad`, `\quad`

Cannot handle:
- ❌ Inline math in paragraphs (each number is a separate LaTeX image)
- ❌ Complex diagrams and figures
- ❌ Tables
- ❌ Inconsistent answer formats in solutions

### Files Generated

1. **scraper-final.js** - Production-ready scraper
2. **amc8_data_final.json** - Sample data (50 problems, 2 years)

## Recommendations

### For Production Use

**Option A: Use scraped data as-is**
- Pros: Answer choices work great (96%)
- Cons: Problem text incomplete, no correct answers

**Option B: Manual enhancement**
- Run scraper to get structure
- Manually fill in missing numbers/equations
- Manually add correct answers
- Best for small datasets

**Option C: Hybrid approach**
- Use scraper for answer choices (excellent)
- Use another data source for problem text
- Cross-reference for validation

### Quick Wins

To improve correct answer extraction:
1. Add more answer patterns:
   - "the answer is X"
   - "we get X"
   - "therefore X"
   - Look at final sentence of solution
2. Check for boxed answers: `\boxed{X}`
3. Look for answer in last paragraph

## Sample Data Quality

From 2025 AMC 8 Problem 1:
```json
{
  "problemNumber": 1,
  "problemText": "The eight-pointed star... What percent of the entire  grid is covered by the star?",
  "choices": {
    "A": "40",
    "B": "50",
    "C": "60",
    "D": "75",
    "E": "80"
  },
  "correctAnswer": "",
  "solutionText": "Each of the unshaded triangles has base length  and height ..."
}
```

**Quality**: Answer choices perfect ✅, but problem text and solution have missing numbers ⚠️

## Conclusion

**LaTeX parsing from alt-text is partially successful:**
- ✅ **Great for answer choices** - 96% success rate
- ❌ **Poor for problem text** - missing inline math
- ❌ **Poor for correct answers** - inconsistent formatting

### Recommendation
Use the scraper to get the **structure and answer choices**, then either:
1. Manually fill gaps for critical content
2. Find an alternative data source with plain text
3. Use AI to fill in missing content based on context

For a **demonstration/MVP**, the current data is usable if users can tolerate incomplete problem text.
