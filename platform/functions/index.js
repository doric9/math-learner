const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Helper: Check if user is on the AI allowlist
async function isUserAllowed(email) {
    if (!email) return false;
    const configDoc = await admin.firestore().doc('config/aiAccess').get();
    if (!configDoc.exists) return false;
    const allowedUsers = configDoc.data()?.allowedUsers || [];
    return allowedUsers.includes(email);
}

// Define the secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Tutor Chat Function
exports.chatWithTutor = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    // Check if user is on the AI allowlist
    if (!(await isUserAllowed(request.auth.token.email))) {
        throw new HttpsError("permission-denied", "AI features are not enabled for your account.");
    }

    const { problem, conversationHistory, userMessage } = request.data;

    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const conversationContext = conversationHistory
        .map(msg => `${msg.role === 'student' ? 'Student' : 'Tutor'}: ${msg.content}`)
        .join('\n\n');

    const systemPrompt = `You are an expert math tutor helping a student solve an AMC 8 math problem through Socratic dialogue.

Problem:
${problem.problemText || problem.problemHtml}

${problem.choices ? `Answer choices:\n${Object.entries(problem.choices).map(([key, val]) => `${key}. ${val}`).join('\n')}` : ''}

Correct Answer: ${problem.correctAnswer}

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
- Use LaTeX notation for math expressions (wrap in $ for inline, $$ for block)

Previous conversation:
${conversationContext}

Student's new message: ${userMessage}

Respond as the tutor:`;

    try {
        const result = await model.generateContent(systemPrompt);
        return { text: result.response.text() };
    } catch (error) {
        console.error("Error in tutor chat:", error);
        throw new HttpsError("internal", "Failed to get tutor response.");
    }
});

// Hint Generation Function
exports.getHint = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    // Check if user is on the AI allowlist
    if (!(await isUserAllowed(request.auth.token.email))) {
        throw new HttpsError("permission-denied", "AI features are not enabled for your account.");
    }

    const { problem, previousHints = [] } = request.data;
    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

    try {
        const result = await model.generateContent(prompt);
        return { hint: result.response.text() };
    } catch (error) {
        console.error("Error generating hint:", error);
        throw new HttpsError("internal", "Failed to generate hint.");
    }
});

// Solution Explanation Function
exports.explainSolution = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    // Check if user is on the AI allowlist
    if (!(await isUserAllowed(request.auth.token.email))) {
        throw new HttpsError("permission-denied", "AI features are not enabled for your account.");
    }

    const { problem } = request.data;
    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    You are an expert math tutor.

    Problem:
    ${problem.problemText || problem.problemHtml}

    Please provide a clear, step-by-step explanation of the solution.
    Explain the concepts used.
  `;

    try {
        const result = await model.generateContent(prompt);
        return { explanation: result.response.text() };
    } catch (error) {
        console.error("Error explaining solution:", error);
        throw new HttpsError("internal", "Failed to explain solution.");
    }
});
