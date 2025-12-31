import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDueMistakes, resolveMistake, repairMistakeJournal, backfillMistakes } from '../services/userService';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle, XCircle, Brain, Sparkles, ArrowRight } from 'lucide-react';
import ProblemDisplay from './ProblemDisplay';
import SolutionSection from './SolutionSection';
import confetti from 'canvas-confetti';

const MistakeJournalView = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const targetProblemId = location.state?.problemId;
    const [dueMistakes, setDueMistakes] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fetchingFullData, setFetchingFullData] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [showSolution, setShowSolution] = useState(false);
    const [solvedCount, setSolvedCount] = useState(0);
    const [problemDetails, setProblemDetails] = useState({}); // Cache for full problem data
    const [isSyncing, setIsSyncing] = useState(false);

    if (!currentUser && !loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-slate-600 font-bold mb-4">Please log in to view your journal.</p>
                    <button onClick={() => navigate('/login')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Login</button>
                </div>
            </div>
        );
    }

    const fetchMistakes = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const mistakes = await getDueMistakes(currentUser.uid);
            setDueMistakes(mistakes);

            // If we came from a specific problem link, find its index
            if (targetProblemId) {
                const idx = mistakes.findIndex(m => m.id === targetProblemId);
                if (idx !== -1) {
                    setCurrentIdx(idx);
                }
            }
        } catch (error) {
            console.error("Error fetching mistakes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        fetchMistakes();
    }, [currentUser]);

    const currentMistake = dueMistakes[currentIdx];

    // Effect to fetch full problem data if content is missing
    useEffect(() => {
        async function fetchFullDetails() {
            if (!currentMistake) return;

            // If we already have the essential content, skip fetching
            if (currentMistake.problemHtml || currentMistake.problemText) {
                setProblemDetails(currentMistake);
                return;
            }

            // Otherwise, fetch from the main competitions repo and trigger a permanent repair
            setFetchingFullData(true);
            try {
                const year = (currentMistake.year || currentMistake.examYear)?.toString();
                const problemNum = currentMistake.problemNumber?.toString();

                if (!year || !problemNum) {
                    console.error("Missing year or problem number for repair", currentMistake);
                    setProblemDetails(currentMistake);
                    return;
                }

                const problemRef = doc(db, 'competitions', 'amc8', 'exams', year, 'problems', problemNum);
                const problemSnap = await getDoc(problemRef);

                if (problemSnap.exists()) {
                    setProblemDetails({
                        ...currentMistake,
                        ...problemSnap.data()
                    });

                    // Trigger a background repair for ALL missing content while we are here
                    repairMistakeJournal(currentUser.uid).catch(err => console.error("Auto-repair failed:", err));
                } else {
                    console.error("Problem details not found in competition repo");
                    setProblemDetails(currentMistake);
                }
            } catch (error) {
                console.error("Error fetching problem details:", error);
                setProblemDetails(currentMistake);
            } finally {
                setFetchingFullData(false);
            }
        }
        fetchFullDetails();
    }, [currentMistake, currentUser]);

    const handleAnswerSelect = (choice) => {
        if (isCorrect) return; // Prevent changing after correct
        setSelectedAnswer(choice);
        const correct = choice === problemDetails.correctAnswer;
        setIsCorrect(correct);

        if (correct) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            resolveMistake(currentUser.uid, currentMistake.id);
            setSolvedCount(prev => prev + 1);
        }
    };

    const nextMistake = () => {
        if (currentIdx < dueMistakes.length - 1) {
            setCurrentIdx(prev => prev + 1);
            resetState();
        } else {
            // Re-fetch to see if more due or if all done
            fetchMistakes();
            setCurrentIdx(0);
            resetState();
        }
    };

    const resetState = () => {
        setSelectedAnswer(null);
        setIsCorrect(null);
        setShowSolution(false);
    };

    const handleSyncMistakes = async () => {
        if (!currentUser) return;
        setIsSyncing(true);
        try {
            const res = await backfillMistakes(currentUser.uid);
            const repairRes = await repairMistakeJournal(currentUser.uid);

            if (res.success || repairRes.success) {
                const updated = await getDueMistakes(currentUser.uid);
                setDueMistakes(updated);
                const msg = res.count > 0
                    ? `Successfully synced ${res.count} past mistakes and verified content!`
                    : repairRes.count > 0
                        ? `Verified and repaired ${repairRes.count} mistakes in your journal!`
                        : "All mistakes are already synced and up to date.";
                alert(msg);
            } else {
                alert(`Sync failed: ${res.error || repairRes.error}`);
            }
        } catch (error) {
            console.error("Sync error:", error);
            alert("An error occurred during synchronization.");
        }
        setIsSyncing(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-bold">Opening your journal...</p>
            </div>
        </div>
    );

    if (dueMistakes.length === 0) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                    <CheckCircle size={40} />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">You're all caught up!</h1>
                <p className="text-slate-500 mb-8 font-medium">No mistakes are due for review. Come back tomorrow to keep your mastery streak alive!</p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        Back to Dashboard
                    </button>
                    <button
                        onClick={handleSyncMistakes}
                        disabled={isSyncing}
                        className="w-full py-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors border border-indigo-200 disabled:opacity-50"
                    >
                        {isSyncing ? 'Syncing...' : 'Sync & Repair Journal'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-2"
                    >
                        <ArrowLeft size={18} /> Back Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-black text-sm">
                            <Brain size={16} />
                            Mastery Mode
                        </div>
                        <span className="text-slate-400 font-bold text-sm">
                            {currentIdx + 1} / {dueMistakes.length} Reviews
                        </span>
                    </div>
                </div>

                {solvedCount > 0 && solvedCount === dueMistakes.length && (
                    <div className="bg-green-500 text-white p-4 rounded-2xl mb-6 font-bold text-center flex items-center justify-center gap-3">
                        <Sparkles size={20} />
                        You've cleared all pending reviews for now!
                    </div>
                )}

                <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 mb-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 bg-indigo-50 text-indigo-600 rounded-bl-3xl font-black text-xs uppercase tracking-widest">
                        Refine Mastery
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs">
                            AMC 8
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">{problemDetails.year || problemDetails.examYear} Problem {problemDetails.problemNumber}</h2>
                    </div>
                    {fetchingFullData ? (
                        <div className="py-20 text-center">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Retrieving Problem Details...</p>
                        </div>
                    ) : (
                        <>
                            <ProblemDisplay
                                content={problemDetails.problemHtml || problemDetails.problemText || "Problem content not found."}
                                isHtml={!!problemDetails.problemHtml}
                                className="mb-8 text-slate-700 leading-relaxed text-lg"
                            />

                            {/* Simple Choices */}
                            <div className="mt-8">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Your Answer:</p>
                                <div className="flex gap-3 flex-wrap">
                                    {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                                        const isSelected = selectedAnswer === letter;
                                        const isCorrectChoice = letter === problemDetails.correctAnswer;

                                        let buttonClass = "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
                                        if (isSelected) {
                                            buttonClass = isCorrectChoice
                                                ? "border-green-500 bg-green-500 text-white shadow-lg shadow-green-100"
                                                : "border-red-500 bg-red-500 text-white shadow-lg shadow-red-100";
                                        }

                                        return (
                                            <button
                                                key={letter}
                                                onClick={() => handleAnswerSelect(letter)}
                                                disabled={isCorrect}
                                                className={`w-16 h-16 rounded-2xl border-2 transition-all flex items-center justify-center text-xl font-black ${buttonClass} ${isCorrect ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                                            >
                                                {isSelected && isCorrectChoice ? <CheckCircle size={24} /> : isSelected && !isCorrectChoice ? <XCircle size={24} /> : letter}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {isCorrect === false && (
                        <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600 mt-1">
                                <XCircle size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-red-900">Not quite yet.</p>
                                <p className="text-sm text-red-700 font-medium">Take another look at the logic. You can view the solution if you're stuck!</p>
                            </div>
                        </div>
                    )}

                    {isCorrect === true && (
                        <div className="mt-6 p-6 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-green-900 text-lg">Mastery Improved!</p>
                                    <p className="text-green-700 font-medium">Keep going to achieve total recall.</p>
                                </div>
                            </div>
                            <button
                                onClick={nextMistake}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                            >
                                Next Mastery Item <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {selectedAnswer && (
                        <div className="mt-8 border-t border-slate-100 pt-6">
                            <button
                                onClick={() => setShowSolution(!showSolution)}
                                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-2 transition-all p-2 -ml-2 rounded-lg hover:bg-indigo-50"
                            >
                                {showSolution ? "Hide Solution" : "I need a reminder (Show Solution)"}
                            </button>

                            {showSolution && (
                                <div className="mt-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <SolutionSection problem={problemDetails} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-widest justify-center">
                    <BookOpen size={14} />
                    Spaced Repetition active for this session
                </div>
            </div>
        </div>
    );
};

export default MistakeJournalView;
