import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProblemDisplay from './ProblemDisplay';
import SolutionSection from './SolutionSection';
import { addXP, updateStreak, checkAchievements, XP_VALUES, logMistake } from '../services/userService';

import { useAuth } from '../contexts/AuthContext';

const PracticeView = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [sessionPoints, setSessionPoints] = useState(0);
  const { currentUser } = useAuth();

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
    if (currentUser) {
      updateStreak(currentUser.uid);
    }
  }, [year, currentUser]);

  const currentProblem = problems[currentProblemIndex];

  // Simple A-E choices - always show all 5 options
  const answerOptions = ['A', 'B', 'C', 'D', 'E'];

  const handleAnswerSelect = (choice) => {
    const isFirstAttempt = !answers[currentProblemIndex];
    setSelectedAnswer(choice);
    setAnswers({
      ...answers,
      [currentProblemIndex]: choice
    });

    if (choice === currentProblem.correctAnswer && isFirstAttempt && currentUser) {
      addXP(currentUser.uid, XP_VALUES.PRACTICE_CORRECT, `practice_correct_${year}_${currentProblem.problemNumber}`);
      checkAchievements(currentUser.uid);
      setSessionPoints(prev => prev + XP_VALUES.PRACTICE_CORRECT);
    } else if (choice !== currentProblem.correctAnswer && isFirstAttempt && currentUser) {
      logMistake(currentUser.uid, { ...currentProblem, year });
    }
  };

  const handleNext = () => {
    // If moving from an unanswered problem, log it as a mistake
    if (!answers[currentProblemIndex] && currentUser) {
      logMistake(currentUser.uid, { ...currentProblem, year });
    }

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
          <div className="text-gray-600 flex items-center gap-4">
            {sessionPoints > 0 && <span className="text-amber-600 font-bold">+{sessionPoints} XP Earned</span>}
            <span>Problem {currentProblemIndex + 1} of {problems.length}</span>
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

          {/* Answer Choices - Simple A/B/C/D/E buttons */}
          <div className="mt-8">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Select your answer:</p>
            <div className="flex gap-3 flex-wrap">
              {answerOptions.map((letter) => {
                const isSelected = selectedAnswer === letter;
                const isCorrectSelection = isSelected && letter === currentProblem.correctAnswer;
                const isWrongSelection = isSelected && letter !== currentProblem.correctAnswer;

                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswerSelect(letter)}
                    className={`w-14 h-14 rounded-xl border-2 transition-all duration-200 flex items-center justify-center text-lg font-bold ${isCorrectSelection
                      ? 'border-green-500 bg-green-500 text-white'
                      : isWrongSelection
                        ? 'border-red-500 bg-red-500 text-white'
                        : isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {isCorrectSelection ? '✓' : isWrongSelection ? '✗' : letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback */}
          {selectedAnswer && (
            <div className={`mt-6 p-4 rounded-lg ${selectedAnswer === currentProblem?.correctAnswer ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={`font-semibold ${selectedAnswer === currentProblem?.correctAnswer ? 'text-green-800' : 'text-red-800'}`}>
                {selectedAnswer === currentProblem?.correctAnswer ? '✓ Correct!' : '✗ Incorrect. Try again or view the solution.'}
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
                <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                  <SolutionSection problem={currentProblem} />
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
