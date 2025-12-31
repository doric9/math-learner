import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, collectionGroup, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProblemDisplay from './ProblemDisplay';
import SolutionSection from './SolutionSection';
import { addXP, updateStreak, checkAchievements, XP_VALUES, logMistake } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ArrowLeft, Brain, Target, Award, ChevronRight } from 'lucide-react';

const TopicDrillView = () => {
    const { topicName } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [problems, setProblems] = useState([]);
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showSolution, setShowSolution] = useState(false);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [sessionPoints, setSessionPoints] = useState(0);
    const [difficulty, setDifficulty] = useState('All'); // All, Foundation (1-10), Advanced (11-25)

    useEffect(() => {
        const fetchTopicProblems = async () => {
            setLoading(true);
            try {
                console.log(`[TopicDrill] Searching for topic: "${topicName}"`);

                // 1. Fetch all available exams
                const examsRef = collection(db, 'competitions', 'amc8', 'exams');
                const examsSnap = await getDocs(examsRef);
                const years = examsSnap.docs.map(doc => doc.id);
                console.log(`[TopicDrill] Found ${years.length} exam years to scan.`);

                // 2. Fetch problems for all years in parallel
                const allProblemsPromises = years.map(async (year) => {
                    const problemsRef = collection(db, 'competitions', 'amc8', 'exams', year, 'problems');
                    const pSnap = await getDocs(problemsRef);
                    const yearProblems = [];

                    pSnap.forEach(doc => {
                        const data = doc.data();
                        const rawTopic = data.topic || '';

                        // Robust matching: Case-insensitive and trimmed
                        const searchTopic = topicName.trim().toLowerCase();
                        const docTopic = rawTopic.toLowerCase();

                        if (docTopic.includes(searchTopic)) {
                            yearProblems.push({
                                id: doc.id,
                                ...data,
                                examYear: year
                            });
                        }
                    });
                    return yearProblems;
                });

                const results = await Promise.all(allProblemsPromises);
                let combinedProblems = results.flat();

                console.log(`[TopicDrill] Match found: ${combinedProblems.length} problems for "${topicName}"`);

                // Shuffle
                combinedProblems = combinedProblems.sort(() => Math.random() - 0.5);

                setProblems(combinedProblems);
            } catch (error) {
                console.error('[TopicDrill] Error fetching topic problems:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTopicProblems();
        if (currentUser) {
            updateStreak(currentUser.uid);
        }
    }, [topicName, currentUser]);

    const filteredProblems = problems.filter(p => {
        if (difficulty === 'Foundation') return p.problemNumber <= 10;
        if (difficulty === 'Advanced') return p.problemNumber > 10;
        return true;
    });

    const currentProblem = filteredProblems[currentProblemIndex];
    const answerOptions = ['A', 'B', 'C', 'D', 'E'];

    const handleAnswerSelect = (choice) => {
        if (selectedAnswer && choice !== selectedAnswer) return; // Prevent changing after selection in this mode

        const isFirstAttempt = !answers[currentProblemIndex];
        setSelectedAnswer(choice);
        setAnswers({
            ...answers,
            [currentProblemIndex]: choice
        });

        if (choice === currentProblem.correctAnswer && isFirstAttempt && currentUser) {
            addXP(currentUser.uid, XP_VALUES.PRACTICE_CORRECT, `topic_drill_${topicName}_${currentProblem.examYear}_${currentProblem.problemNumber}`);
            checkAchievements(currentUser.uid);
            setSessionPoints(prev => prev + XP_VALUES.PRACTICE_CORRECT);
        } else if (choice !== currentProblem.correctAnswer && isFirstAttempt && currentUser) {
            logMistake(currentUser.uid, { ...currentProblem, year: currentProblem.examYear });
        }
    };

    const handleNext = () => {
        if (currentProblemIndex < filteredProblems.length - 1) {
            setCurrentProblemIndex(currentProblemIndex + 1);
            setSelectedAnswer(null);
            setShowSolution(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing {topicName} Hub...</p>
            </div>
        );
    }

    if (filteredProblems.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <Target className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-2xl font-black text-slate-900">No Problems Found</h2>
                <p className="text-slate-500 max-w-md mt-2">We couldn't find any {difficulty !== 'All' ? difficulty : ''} problems for "{topicName}" in the vault yet.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Back to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Brain className="w-4 h-4 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none">Topic Drill Mode</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{topicName}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        {['All', 'Foundation', 'Advanced'].map(t => (
                            <button
                                key={t}
                                onClick={() => { setDifficulty(t); setCurrentProblemIndex(0); setSelectedAnswer(null); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${difficulty === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* HUD */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Problem</span>
                        <span className="text-xl font-black text-slate-900">{currentProblemIndex + 1} / {filteredProblems.length}</span>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin</span>
                        <span className="text-xl font-black text-slate-900">{currentProblem.examYear}</span>
                    </div>
                    <div className="bg-indigo-600 p-4 rounded-3xl border border-indigo-700 shadow-lg shadow-indigo-100 flex flex-col items-center">
                        <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">XP Gained</span>
                        <span className="text-xl font-black text-white">{sessionPoints}</span>
                    </div>
                </div>

                {/* Problem Card */}
                <div className="bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10 group-hover:bg-indigo-100 transition-all"></div>

                    <div className="flex justify-between items-start mb-8">
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                            Problem #{currentProblem.problemNumber}
                        </div>
                        {selectedAnswer && (
                            <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${selectedAnswer === currentProblem.correctAnswer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {selectedAnswer === currentProblem.correctAnswer ? '✓ Correct' : '✗ Incorrect'}
                            </div>
                        )}
                    </div>

                    <ProblemDisplay
                        content={currentProblem.problemHtml || currentProblem.problemText}
                        isHtml={!!currentProblem.problemHtml}
                        className="text-lg text-slate-800 leading-relaxed mb-10"
                    />

                    {/* Answer choices */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                        {answerOptions.map((letter) => {
                            const isSelected = selectedAnswer === letter;
                            const isCorrect = letter === currentProblem.correctAnswer;

                            let style = "bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-600 hover:bg-white";
                            if (selectedAnswer) {
                                if (isSelected) {
                                    style = isCorrect ? "bg-green-500 border-green-500 text-white" : "bg-red-500 border-red-500 text-white";
                                } else if (isCorrect) {
                                    style = "bg-green-100 border-green-200 text-green-700";
                                } else {
                                    style = "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
                                }
                            }

                            return (
                                <button
                                    key={letter}
                                    onClick={() => handleAnswerSelect(letter)}
                                    className={`h-16 rounded-2xl border-2 font-black text-xl transition-all ${style}`}
                                >
                                    {letter}
                                </button>
                            );
                        })}
                    </div>

                    {selectedAnswer && (
                        <div className="mt-12 pt-8 border-t border-slate-100">
                            <button
                                onClick={() => setShowSolution(!showSolution)}
                                className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-xs hover:gap-3 transition-all"
                            >
                                {showSolution ? 'Hide Explanation' : 'View Explanation'} <Sparkles size={14} />
                            </button>

                            {showSolution && (
                                <div className="mt-6 bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                    <SolutionSection problem={currentProblem} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-end">
                    <button
                        onClick={handleNext}
                        disabled={!selectedAnswer || currentProblemIndex === filteredProblems.length - 1}
                        className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 disabled:opacity-30 disabled:grayscale transition-all hover:translate-x-1"
                    >
                        {currentProblemIndex === filteredProblems.length - 1 ? 'End Session' : 'Next Challenge'}
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopicDrillView;
