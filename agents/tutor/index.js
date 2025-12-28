import { TutorAgent } from './TutorAgent.js';
import dotenv from 'dotenv';
dotenv.config();

const agent = new TutorAgent();

// Example usage for testing
if (process.argv[2] === 'test') {
    const mockProblem = {
        problemText: "What is 2 + 2?"
    };

    console.log("Testing Tutor Agent...");
    agent.getHint(mockProblem).then(hint => {
        console.log("Hint:", hint);
    }).catch(console.error);
}
