import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProblemDisplay from './ProblemDisplay';

const PracticeView = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const problemsRef = collection(
          db,
          'competitions',
          'amc8',
          'exams',
          year,
          'problems'
        );

        const q = query(problemsRef, orderBy('problemNumber', 'asc'));
        const snapshot = await getDocs(q);

        const problemList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setProblems(problemList);
      } catch (error) {
        console.error('Error fetching problems:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [year]);

  const currentProblem = problems[currentProblemIndex];

  const choices = (currentProblem && Object.keys(currentProblem.choices || {}).length > 0)
    ? Object.entries(currentProblem.choices).sort(([a], [b]) => a.localeCompare(b))
    : ['A', 'B', 'C', 'D', 'E'].map(k => [k, '']);

  const handleAnswerSelect = (choice) => {
    setSelectedAnswer(choice);
    setAnswers({
      ...answers,
      [currentProblemIndex]: choice
    });
  };

  const handleNext = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
      setSelectedAnswer(answers[currentProblemIndex + 1] || null);
      setShowSolution(false);
    }
  };

  const handlePrevious = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(currentProblemIndex - 1);
      setSelectedAnswer(answers[currentProblemIndex - 1] || null);
      setShowSolution(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading problems...</div>
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">No problems found.</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Exams
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {year} AMC 8 - Practice Mode
          </h1>
          <div className="text-gray-600">
            Problem {currentProblemIndex + 1} of {problems.length}
          </div>
        </div>

        {/* Problem Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Problem {currentProblem.problemNumber}
          </h2>

          <ProblemDisplay
            content={currentProblem.problemHtml || currentProblem.problemText}
            isHtml={!!currentProblem.problemHtml}
            className="mb-6"
          />

          {/* Answer Choices */}
          <div className="space-y-3">
            {choices.map(([choice, text]) => {
              const isSelected = selectedAnswer === choice;
              const isCorrectAnswer = choice === currentProblem.correctAnswer;
              const showCorrect = selectedAnswer && isCorrectAnswer;
              const showIncorrect = isSelected && !isCorrectAnswer;

              return (
                <button
                  key={choice}
                  onClick={() => handleAnswerSelect(choice)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${showCorrect
                    ? 'border-green-500 bg-green-50'
                    : showIncorrect
                      ? 'border-red-500 bg-red-50'
                      : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <span className="font-semibold mr-3">{choice}.</span>
                  <span className={showCorrect || showIncorrect ? 'font-medium' : ''}>
                    <ProblemDisplay content={text} inline size="text-base" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {selectedAnswer && (
            <div className={`mt-6 p-4 rounded-lg ${selectedAnswer === currentProblem?.correctAnswer ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={`font-semibold ${selectedAnswer === currentProblem?.correctAnswer ? 'text-green-800' : 'text-red-800'}`}>
                {selectedAnswer === currentProblem?.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
              </p>
            </div>
          )}

          {/* Solution Section */}
          {selectedAnswer && (
            <div className="mt-6">
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showSolution ? 'Hide Solution' : 'Show Solution'}
              </button>

              {showSolution && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">Solution:</h3>
                  <ProblemDisplay
                    content={currentProblem.solutionHtml || currentProblem.solutionText}
                    isHtml={!!currentProblem.solutionHtml}
                  />
                  <p className="mt-4 font-semibold text-gray-900">
                    Correct Answer: {currentProblem.correctAnswer}
                  </p>
                </div>
              )}
            </div>
          )}


        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentProblemIndex === 0}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentProblemIndex === problems.length - 1}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Next
          </button>
        </div>
      </div>


    </div>
  );
};

export default PracticeView;
