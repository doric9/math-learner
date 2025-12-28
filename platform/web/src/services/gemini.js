import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API
// Note: In a real production app, you should proxy this through a backend
// to avoid exposing your API key in the client bundle.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
let model = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });
} else {
  console.warn("VITE_GEMINI_API_KEY is not set. Gemini features will be disabled.");
}

export const generateSimilarProblem = async (originalProblem) => {
  if (!model) {
    throw new Error("Gemini API is not initialized. Please check your API key.");
  }

  const prompt = `
    You are an expert math problem creator for the AMC 8 competition.
    I will provide you with an existing AMC 8 math problem.
    Your task is to create a *new*, *similar* problem that tests the same mathematical concepts and difficulty level, but with different numbers, context, or slight variation in logic.
    
    Original Problem:
    ${originalProblem.problemText || originalProblem.problemHtml}
    
    Original Choices (if any):
    ${JSON.stringify(originalProblem.choices)}

    Please output the result strictly in JSON format with the following structure:
    {
      "problemText": "The text of the new problem (use LaTeX for math)",
      "choices": {
        "A": "Choice A",
        "B": "Choice B",
        "C": "Choice C",
        "D": "Choice D",
        "E": "Choice E"
      },
      "correctAnswer": "The correct choice letter (e.g., 'A')",
      "solution": "A detailed step-by-step solution explaining how to solve the problem."
    }
    
    Do not include any markdown formatting like \`\`\`json. Just the raw JSON string.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown formatting if the model ignores the instruction
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error generating similar problem:", error);
    throw error;
  }
};
