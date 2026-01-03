import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Flag } from 'lucide-react';
import ProblemDisplay from './ProblemDisplay';

const TestView = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(40 * 60); // 40 minutes in seconds
  const [testStarted, setTestStarted] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [markedProblems, setMarkedProblems] = useState({});

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

        let problemList = snapshot.docs.map(doc => ({
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

  const handleSubmit = useCallback(() => {
    setTestSubmitted(true);
    navigate(`/results/${year}`, {
      state: {
        answers,
        problems,
        timeUsed: 40 * 60 - timeRemaining
      }
    });
  }, [answers, navigate, problems, timeRemaining, year]);

  useEffect(() => {
    if (!testStarted || testSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, testSubmitted]);

  useEffect(() => {
    if (timeRemaining === 0 && !testSubmitted && testStarted) {
      handleSubmit();
    }
  }, [timeRemaining, testSubmitted, testStarted, handleSubmit]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (choice) => {
    setAnswers({
      ...answers,
      [currentProblemIndex]: choice
    });
  };

  const toggleMark = useCallback(() => {
    setMarkedProblems(prev => ({
      ...prev,
      [currentProblemIndex]: !prev[currentProblemIndex]
    }));
  }, [currentProblemIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'm') {
        toggleMark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMark]);

  if (!loading && problems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">
          No problems found for {year}. Please ensure data has been ingested.
        </div>
      </div>
    );
  }

  const currentProblem = problems[currentProblemIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading test...</div>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {year} AMC 8 Mock Exam
          </h1>
          <div className="space-y-4 text-gray-700 mb-8">
            <p className="text-lg">You are about to begin a timed mock exam.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Time limit: 40 minutes</li>
              <li>Number of problems: {problems.length}</li>
              <li>You can navigate between problems freely</li>
              <li>Your answers are saved automatically</li>
              <li>The timer will start when you click "Begin Test"</li>
            </ul>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setTestStarted(true)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md transition-colors duration-200"
            >
              Begin Test
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timer Bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            {year} AMC 8 Mock Exam
          </h1>
          <div className="flex items-center gap-6">
            <div className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
              ⏱ {formatTime(timeRemaining)}
            </div>
            <button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Problem Navigation Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen p-4 sticky top-16">
          <h2 className="font-bold text-gray-900 mb-4">Problems</h2>
          <div className="grid grid-cols-5 gap-2">
            {problems.map((problem, index) => (
              <button
                key={index}
                onClick={() => setCurrentProblemIndex(index)}
                className={`w-10 h-10 rounded-md font-medium transition-colors duration-200 relative ${currentProblemIndex === index
                  ? 'bg-blue-600 text-white'
                  : answers[index]
                    ? 'bg-green-100 text-green-800 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {index + 1}
                {markedProblems[index] && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full shadow-sm" />
                )}
              </button>
            ))}
          </div>
          <div className="mt-6 text-sm text-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-gray-100 rounded relative">
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              </div>
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>Unanswered</span>
            </div>
          </div>
        </div>

        {/* Problem Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Problem {currentProblem.problemNumber}
                </h2>
                <button
                  onClick={toggleMark}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all duration-200 ${markedProblems[currentProblemIndex]
                    ? 'bg-amber-50 border-amber-500 text-amber-600'
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  title="Mark for review (Shortcut: M)"
                >
                  <Flag className={`w-4 h-4 ${markedProblems[currentProblemIndex] ? 'fill-amber-500' : ''}`} />
                  <span className="text-sm font-medium">Review</span>
                </button>
              </div>

              <ProblemDisplay
                content={currentProblem.problemHtml || currentProblem.problemText}
                isHtml={!!currentProblem.problemHtml}
                className="mb-6"
              />

              {/* Answer Choices - Simple A/B/C/D/E buttons */}
              <div className="mt-8">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Select your answer:</p>
                <div className="flex gap-3 flex-wrap">
                  {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                    const isSelected = answers[currentProblemIndex] === letter;

                    return (
                      <button
                        key={letter}
                        onClick={() => handleAnswerSelect(letter)}
                        className={`w-14 h-14 rounded-xl border-2 transition-all duration-200 flex items-center justify-center text-lg font-bold ${isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
                disabled={currentProblemIndex === 0}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentProblemIndex(Math.min(problems.length - 1, currentProblemIndex + 1))}
                disabled={currentProblemIndex === problems.length - 1}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestView;
