import { useState } from 'react';
import { generateSimilarProblem } from '../services/gemini';

const AIGeneratorModal = ({ problem, onClose }) => {
  const [generating, setGenerating] = useState(false);
  const [generatedProblem, setGeneratedProblem] = useState(null);
  const [error, setError] = useState(null);

  const generateProblem = async () => {
    setGenerating(true);
    setError(null);

    try {
      setError("The AI Problem Generator is currently being refactored for a more sophisticated batch-mode workflow and is temporarily disabled. Please check back soon!");
      // Future implementation will use a generator-validator architecture in batch mode.
    } catch (err) {
      console.error('Error generating problem:', err);
      setError(err.message || 'Failed to generate problem. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">AI Problem Generator</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {!generatedProblem && !generating && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-6">
              Generate a new problem similar to Problem {problem.problemNumber} using AI.
            </p>
            <button
              onClick={generateProblem}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
            >
              ✨ Generate Problem
            </button>
          </div>
        )}

        {generating && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600">Generating problem...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              onClick={generateProblem}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Try Again
            </button>
          </div>
        )}

        {generatedProblem && (
          <div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-800 font-medium">
                ✨ AI-Generated Problem (similar to Problem {problem.problemNumber})
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Problem:</h3>
              <p className="text-gray-800 text-lg leading-relaxed">
                {generatedProblem.problemText}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Choices:</h3>
              <div className="space-y-2">
                {Object.entries(generatedProblem.choices || {}).map(([choice, text]) => (
                  <div key={choice} className="p-3 bg-gray-50 rounded">
                    <span className="font-semibold mr-2">{choice}.</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Solution:</h3>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-gray-800 leading-relaxed mb-3">
                  {generatedProblem.solutionText}
                </p>
                <p className="font-semibold text-gray-900">
                  Correct Answer: {generatedProblem.correctAnswer}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={generateProblem}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Generate Another
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIGeneratorModal;
