import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import ProblemDisplay from './ProblemDisplay';
import SolutionSection from './SolutionSection';
import { addXP, updateStreak, XP_VALUES } from '../services/userService';


const ResultsView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { year } = useParams();
  const { answers = {}, problems = [], timeUsed = 0 } = location.state || {};
  const { currentUser } = useAuth();
  const saveAttempted = useRef(false);

  // Early return if no problems (e.g. direct access)
  if (!problems.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">No test results found.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Calculate results
  const results = problems.map((problem, index) => {
    const userAnswer = answers[index];
    const isCorrect = userAnswer === problem.correctAnswer;
    const isAnswered = userAnswer !== undefined;

    return {
      problem,
      userAnswer,
      isCorrect,
      isAnswered
    };
  });

  const correctCount = results.filter(r => r.isCorrect).length;
  const incorrectCount = results.filter(r => r.isAnswered && !r.isCorrect).length;
  const unansweredCount = results.filter(r => !r.isAnswered).length;
  const totalProblems = problems.length;
  const percentage = Math.round((correctCount / totalProblems) * 100);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  useEffect(() => {
    const saveResults = async () => {
      if (!currentUser || saveAttempted.current || problems.length === 0) return;

      saveAttempted.current = true;

      try {
        // Save test results
        await addDoc(collection(db, 'users', currentUser.uid, 'results'), {
          examYear: year,
          mode: 'test',
          score: correctCount,
          totalQuestions: totalProblems,
          correctCount,
          incorrectCount,
          unansweredCount,
          timeUsed,
          date: serverTimestamp(),
          answers: answers,
          correctAnswers: problems.reduce((acc, p, idx) => {
            acc[idx] = p.correctAnswer;
            return acc;
          }, {})
        });

        // Update streak and XP via service
        await updateStreak(currentUser.uid);

        // Award XP for each correct answer
        const totalXP = (correctCount * XP_VALUES.MOCK_TEST_CORRECT) + XP_VALUES.MOCK_TEST_COMPLETION;
        await addXP(currentUser.uid, totalXP, `mock_test_${year}_completion`);

        console.log("Results, streak and XP saved successfully");
      } catch (error) {
        console.error("Error saving results:", error);
      }
    };

    saveResults();
  }, [currentUser, year, correctCount, totalProblems, incorrectCount, unansweredCount, timeUsed, answers, problems.length]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Test Results - {year} AMC 8
          </h1>

          {/* Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-700">{correctCount}</div>
              <div className="text-sm text-green-600">Correct</div>
            </div>
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-700">{incorrectCount}</div>
              <div className="text-sm text-red-600">Incorrect</div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-400 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-gray-700">{unansweredCount}</div>
              <div className="text-sm text-gray-600">Unanswered</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{percentage}%</div>
              <div className="text-sm text-blue-600">Score</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              Final Score: {correctCount} / {totalProblems}
            </div>
            {timeUsed > 0 && (
              <div className="text-gray-600">
                Time Used: {formatTime(timeUsed)}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Question-by-Question Breakdown
          </h2>

          <div className="space-y-6">
            {results.map((result, index) => (
              <div
                key={index}
                className={`border-l-4 p-4 rounded-r-lg ${result.isCorrect
                  ? 'border-green-500 bg-green-50'
                  : result.isAnswered
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-400 bg-gray-50'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-gray-900 text-lg">
                    Problem {result.problem.problemNumber}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${result.isCorrect
                      ? 'bg-green-200 text-green-800'
                      : result.isAnswered
                        ? 'bg-red-200 text-red-800'
                        : 'bg-gray-200 text-gray-800'
                      }`}
                  >
                    {result.isCorrect ? '✓ Correct' : result.isAnswered ? '✗ Incorrect' : 'Not Answered'}
                  </span>
                </div>

                <ProblemDisplay
                  content={result.problem.problemHtml || result.problem.problemText}
                  isHtml={!!result.problem.problemHtml}
                  className="mb-4"
                />

                <div className="grid grid-cols-1 gap-2 mb-4">
                  {Object.entries(result.problem.choices || {}).sort(([a], [b]) => a.localeCompare(b)).map(([choice, text]) => {
                    const isUserAnswer = choice === result.userAnswer;
                    const isCorrectAnswer = choice === result.problem.correctAnswer;

                    return (
                      <div
                        key={choice}
                        className={`p-3 rounded-lg ${isCorrectAnswer
                          ? 'bg-green-100 border-2 border-green-500'
                          : isUserAnswer
                            ? 'bg-red-100 border-2 border-red-500'
                            : 'bg-white border border-gray-300'
                          }`}
                      >
                        <span className="font-semibold mr-2">{choice}.</span>
                        <ProblemDisplay content={text} inline size="text-base" />
                        {isCorrectAnswer && <span className="ml-2 text-green-700 font-semibold">✓ Correct Answer</span>}
                        {isUserAnswer && !isCorrectAnswer && (
                          <span className="ml-2 text-red-700 font-semibold">Your Answer</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Solution */}
                <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                  <SolutionSection problem={result.problem} />
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(`/test/${year}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-md transition-colors duration-200"
          >
            Retake Test
          </button>
          <button
            onClick={() => navigate(`/practice/${year}`)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-md transition-colors duration-200"
          >
            Practice Mode
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-md transition-colors duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
