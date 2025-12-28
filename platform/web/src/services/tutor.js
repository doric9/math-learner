import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
let model = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });
}

// Conversational tutor - responds to student questions
export const chatWithTutor = async (problem, conversationHistory, userMessage) => {
  if (!model) throw new Error("Gemini API not initialized");

  // Build conversation context
  const conversationContext = conversationHistory
    .map(msg => `${msg.role === 'student' ? 'Student' : 'Tutor'}: ${msg.content}`)
    .join('\n\n');

  const systemPrompt = `You are an expert math tutor helping a student solve an AMC 8 math problem through Socratic dialogue.

Problem:
${problem.problemText || problem.problemHtml}

${problem.choices ? `Answer choices:\n${Object.entries(problem.choices).map(([key, val]) => `${key}. ${val}`).join('\n')}` : ''}

TUTORING GUIDELINES:
- Guide the student with questions and hints, don't give direct answers
- If the student is stuck, ask guiding questions like "What do you notice about...?" or "What happens if...?"
- Break down complex problems into smaller steps
- Encourage mathematical thinking and reasoning
- If the student asks for a hint, provide a progressive hint based on where they are
- If they're on the right track, encourage them and ask what to do next
- If they make an error, gently guide them to discover it themselves
- Only reveal the full solution if explicitly asked "show me the solution" or after multiple struggles
- Be encouraging, patient, and supportive
- Keep responses concise and focused

Previous conversation:
${conversationContext}

Student's new message: ${userMessage}

Respond as the tutor:`;

  const result = await model.generateContent(systemPrompt);
  return result.response.text();
};

// Generate a hint for the current problem state
export const getHint = async (problem, previousHints = []) => {
  if (!model) throw new Error("Gemini API not initialized");

  const prompt = `
    You are an expert math tutor helping a student solve an AMC 8 math problem.

    Problem:
    ${problem.problemText || problem.problemHtml}

    The student is stuck. They have received the following hints so far:
    ${previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}

    Please provide a small, progressive hint to help them move forward.
    Do NOT give the answer.
    Do NOT solve the whole problem.
    Just give the next logical step or a guiding question.
    Keep it short and encouraging.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const explainSolution = async (problem) => {
  if (!model) throw new Error("Gemini API not initialized");

  const prompt = `
    You are an expert math tutor.

    Problem:
    ${problem.problemText || problem.problemHtml}

    Please provide a clear, step-by-step explanation of the solution.
    Explain the concepts used.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
};
