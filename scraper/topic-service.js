import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const CATEGORIES = ["Arithmetic", "Algebra", "Geometry", "Number Theory", "Counting"];

export async function classifyBatch(problems) {
    if (!problems.length) return [];

    const prompt = `Classify these AMC 8 math problems into one or more of these categories: ${CATEGORIES.join(", ")}.
Return the response as a JSON array of strings, where each string represents the categories for the corresponding problem in order, separated by commas if multiple.
Example: ["Arithmetic", "Geometry, Algebra", "Counting"]

Problems:
${problems.map((p, i) => `${i + 1}. ${p.problemText || p.problemHtml}`).join('\n\n')}

Return ONLY the JSON array.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Extract JSON if it's wrapped in markdown
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
    } catch (error) {
        console.error('Error classifying batch:', error);
        return problems.map(() => 'General');
    }
}
