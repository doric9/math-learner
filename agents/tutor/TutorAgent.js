import { GoogleGenerativeAI } from "@google/generative-ai";

export class TutorAgent {
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
        if (!this.apiKey) {
            console.warn("TutorAgent: GEMINI_API_KEY not set.");
        }
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    }

    async getHint(problem, currentStep = 0, previousHints = []) {
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
      
      Hint #${previousHints.length + 1}:
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error("Error generating hint:", error);
            throw error;
        }
    }

    async explainSolution(problem) {
        const prompt = `
      You are an expert math tutor.
      
      Problem:
      ${problem.problemText || problem.problemHtml}
      
      Please provide a clear, step-by-step explanation of the solution.
      Explain the concepts used.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error("Error generating explanation:", error);
            throw error;
        }
    }
}
