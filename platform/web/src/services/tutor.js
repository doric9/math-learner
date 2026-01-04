import { functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';

// Conversational tutor - responds to student questions
export const chatWithTutor = async (problem, conversationHistory, userMessage) => {
  const chatWithTutorFn = httpsCallable(functions, 'chatWithTutor');

  try {
    const result = await chatWithTutorFn({
      problem,
      conversationHistory,
      userMessage
    });
    return result.data.text;
  } catch (error) {
    console.error("Error in tutor chat function:", error);
    throw error;
  }
};

// Streaming version - Callables don't natively support streaming.
// Temporarily fallback to non-streaming or we could use another approach.
// For now, let's keep the API signature but return the whole thing at once.
export const chatWithTutorStream = async function* (problem, conversationHistory, userMessage) {
  const text = await chatWithTutor(problem, conversationHistory, userMessage);
  yield text;
};

// Generate a hint for the current problem state
export const getHint = async (problem, previousHints = []) => {
  const getHintFn = httpsCallable(functions, 'getHint');

  try {
    const result = await getHintFn({ problem, previousHints });
    return result.data.hint;
  } catch (error) {
    console.error("Error getting hint function:", error);
    throw error;
  }
};

export const explainSolution = async (problem) => {
  const explainSolutionFn = httpsCallable(functions, 'explainSolution');

  try {
    const result = await explainSolutionFn({ problem });
    return result.data.explanation;
  } catch (error) {
    console.error("Error explaining solution function:", error);
    throw error;
  }
};
