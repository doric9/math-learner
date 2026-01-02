import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { chatWithTutorStream } from '../services/tutor';
import { Send, BookOpen, ArrowRight, ArrowLeft, Sparkles, CheckCircle, XCircle, PartyPopper, Star } from 'lucide-react';
import ProblemDisplay from './ProblemDisplay';
import confetti from 'canvas-confetti';
import { addXP, updateStreak, checkAchievements, XP_VALUES, logMistake } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

const GuidedPracticeView = () => {
    const { year } = useParams();
    const navigate = useNavigate();
    const [problems, setProblems] = useState([]);
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sessionPoints, setSessionPoints] = useState(0);
    const { currentUser } = useAuth();

    // Conversational Chat State
    const [conversation, setConversation] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [streamingText, setStreamingText] = useState('');

    // Answer State
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [answerSubmitted, setAnswerSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [attemptedAnswers, setAttemptedAnswers] = useState([]);


    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation, isTyping, streamingText]);

    useEffect(() => {
        const fetchProblems = async () => {
            try {
                const problemsRef = collection(db, 'competitions', 'amc8', 'exams', year, 'problems');
                const q = query(problemsRef, orderBy('problemNumber', 'asc'));
                const snapshot = await getDocs(q);
                setProblems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

    // Add welcome message when problem loads
    useEffect(() => {
        if (problems.length > 0 && conversation.length === 0) {
            setConversation([{
                role: 'tutor',
                content: "Hi! I'm your AI math tutor. 👋\n\nI'm here to help you work through this problem step by step. You can:\n• Select an answer choice below\n• Ask me for hints\n• Share your thinking\n\nWhat would you like to start with?"
            }]);
        }
    }, [problems, currentProblemIndex]);

    const currentProblem = problems[currentProblemIndex];

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    };

    const handleAnswerSelect = (choice) => {
        if (answerSubmitted) return;
        if (attemptedAnswers.includes(choice)) return; // Don't re-select something we already tried
        setSelectedAnswer(choice);
    };


    const handleAnswerSubmit = () => {
        if (!selectedAnswer || answerSubmitted) return;

        const correct = selectedAnswer === currentProblem.correctAnswer;
        setIsCorrect(correct);

        if (correct) {
            setAnswerSubmitted(true);
            triggerConfetti();
            if (currentUser) {
                addXP(currentUser.uid, XP_VALUES.PRACTICE_CORRECT, `guided_correct_${year}_${currentProblem.problemNumber}`);
                checkAchievements(currentUser.uid);
                setSessionPoints(prev => prev + XP_VALUES.PRACTICE_CORRECT);
            }
            setConversation(prev => [...prev, {
                role: 'tutor',
                content: "🎉 **Excellent work!** That's absolutely correct!\n\nYou chose **" + selectedAnswer + "**, which is the right answer. Would you like me to walk through the solution to reinforce your understanding, or are you ready to move to the next problem?"
            }]);
        } else {
            if (currentUser && attemptedAnswers.length === 0) {
                logMistake(currentUser.uid, { ...currentProblem, year });
            }
            setAttemptedAnswers(prev => [...prev, selectedAnswer]);
            setSelectedAnswer(null); // Clear selection for retry
            setConversation(prev => [...prev, {
                role: 'tutor',
                content: "Hmm, that's not quite right. You chose **" + selectedAnswer + "**, but let's think about this differently.\n\nDon't worry – making mistakes is part of learning! I've marked that choice for you. Would you like to **try another answer**, or should I give you a **hint** to help you find the correct path?"
            }]);
        }
    };


    const handleSendMessage = async () => {
        if (!userInput.trim() || isTyping) return;

        const userMessage = userInput.trim();
        setUserInput('');

        // Add user message to conversation
        const newConversation = [
            ...conversation,
            { role: 'student', content: userMessage }
        ];
        setConversation(newConversation);
        setIsTyping(true);
        setStreamingText('');

        if (currentUser) {
            addXP(currentUser.uid, XP_VALUES.GUIDED_STEP, `guided_interaction_${year}_${currentProblem.problemNumber}`);
            setSessionPoints(prev => prev + XP_VALUES.GUIDED_STEP);
        }

        try {
            // Get AI response with streaming
            let fullResponse = '';
            const stream = chatWithTutorStream(currentProblem, newConversation, userMessage);

            for await (const chunk of stream) {
                fullResponse += chunk;
                setStreamingText(fullResponse);
            }

            setConversation([
                ...newConversation,
                { role: 'tutor', content: fullResponse }
            ]);
            setStreamingText('');
        } catch (error) {
            console.error("Error getting tutor response:", error);
            setConversation([
                ...newConversation,
                { role: 'tutor', content: "Sorry, I encountered an error. Please try again." }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleNextProblem = () => {
        // If moving from an unanswered problem, log it as a mistake
        if (!answerSubmitted && currentUser) {
            logMistake(currentUser.uid, { ...currentProblem, year });
        }

        if (currentProblemIndex < problems.length - 1) {
            setCurrentProblemIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setAnswerSubmitted(false);
            setIsCorrect(false);
            setConversation([{
                role: 'tutor',
                content: "Great! Let's move on to the next problem. 📝\n\nTake a moment to read it carefully. When you're ready, select an answer or ask me for help!"
            }]);
            setAttemptedAnswers([]);
        }
    };


    const handlePrevProblem = () => {
        if (currentProblemIndex > 0) {
            setCurrentProblemIndex(prev => prev - 1);
            setSelectedAnswer(null);
            setAnswerSubmitted(false);
            setIsCorrect(false);
            setConversation([{
                role: 'tutor',
                content: "Let's go back to the previous problem. What would you like to work on?"
            }]);
            setAttemptedAnswers([]);
        }
    };


    const quickActions = [
        { text: "Give me a hint", icon: "💡" },
        { text: "I don't know where to start", icon: "🤔" },
        { text: "Explain my mistake", icon: "❓" },
        { text: "Walk through the solution", icon: "📖" }
    ];

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-lg font-bold text-slate-600">Loading problems...</div>
            </div>
        </div>
    );

    if (!currentProblem) return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <div className="text-center">
                <div className="text-xl font-bold text-slate-600 mb-4">No problems found.</div>
                <button
                    onClick={() => navigate('/')}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => navigate('/')}
                            className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-2"
                        >
                            <ArrowLeft size={18} /> Back to Exams
                        </button>
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-black text-slate-900">{year} AMC 8</h1>
                            <div className="flex items-center gap-4">
                                {sessionPoints > 0 && (
                                    <span className="flex items-center gap-1 text-amber-600 font-black text-sm">
                                        <Star size={14} fill="currentColor" /> +{sessionPoints} XP
                                    </span>
                                )}
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                                    Problem {currentProblem.problemNumber} / {problems.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Problem Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">
                                {currentProblem.problemNumber}
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Problem {currentProblem.problemNumber}</h2>
                        </div>

                        <ProblemDisplay
                            content={currentProblem.problemHtml || currentProblem.problemText}
                            isHtml={!!currentProblem.problemHtml}
                            className="mb-8 text-slate-700 leading-relaxed"
                        />

                        {/* Answer Choices - Simple A/B/C/D/E buttons */}
                        <div className="mt-8">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Select your answer:</p>
                            <div className="flex gap-3 flex-wrap">
                                {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                                    const isSelected = selectedAnswer === letter;
                                    const showCorrect = answerSubmitted && isCorrect && letter === currentProblem.correctAnswer;
                                    const isAttempted = attemptedAnswers.includes(letter);

                                    return (
                                        <button
                                            key={letter}
                                            onClick={() => handleAnswerSelect(letter)}
                                            disabled={answerSubmitted || isAttempted}
                                            className={`w-14 h-14 rounded-2xl border-2 transition-all flex items-center justify-center text-lg font-black ${showCorrect
                                                ? 'border-green-500 bg-green-500 text-white'
                                                : isAttempted
                                                    ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                                                } ${answerSubmitted || isAttempted ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                            {showCorrect ? <CheckCircle size={20} /> : isAttempted ? <XCircle size={20} className="opacity-50" /> : letter}
                                        </button>
                                    );

                                })}
                            </div>
                        </div>

                        {/* Submit Button */}
                        {!answerSubmitted && selectedAnswer && (
                            <button
                                onClick={handleAnswerSubmit}
                                className="w-full mt-4 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} /> Submit Answer
                            </button>
                        )}

                        {/* Success Banner */}
                        {answerSubmitted && isCorrect && (
                            <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-2xl p-6 flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                    <PartyPopper className="text-white" size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-green-800 text-lg">Correct! 🎉</p>
                                    <p className="text-green-600 font-medium">Great job solving this problem!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                    <button
                        onClick={handlePrevProblem}
                        disabled={currentProblemIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
                    >
                        <ArrowLeft size={20} /> Previous
                    </button>
                    <button
                        onClick={handleNextProblem}
                        disabled={currentProblemIndex === problems.length - 1}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg shadow-indigo-100"
                    >
                        Next <ArrowRight size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Sidebar */}
            <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col h-screen sticky top-0">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900">AI Tutor</h2>
                            <p className="text-xs font-bold text-indigo-600">Powered by Gemini</p>
                        </div>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {conversation.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[90%] rounded-2xl ${message.role === 'student'
                                    ? 'bg-indigo-600 text-white px-5 py-3'
                                    : 'bg-slate-50 border border-slate-200 text-slate-700 px-5 py-4'
                                    }`}
                            >
                                <ProblemDisplay
                                    content={message.content}
                                    size="text-[15px]"
                                    className={`leading-[1.7] ${message.role === 'student' ? 'text-white [&_strong]:text-white [&_em]:text-white/90' : 'text-slate-700 [&_strong]:text-slate-900'}`}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Streaming Response */}
                    {isTyping && streamingText && (
                        <div className="flex justify-start">
                            <div className="max-w-[90%] bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
                                <ProblemDisplay
                                    content={streamingText}
                                    size="text-[15px]"
                                    className="leading-[1.7] text-slate-700 [&_strong]:text-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    {/* Typing Indicator */}
                    {isTyping && !streamingText && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 rounded-2xl px-4 py-3">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setUserInput(action.text);
                                    inputRef.current?.focus();
                                }}
                                className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all font-bold text-slate-600"
                            >
                                <span className="mr-1">{action.icon}</span>
                                {action.text}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask a question or share your thinking..."
                            disabled={isTyping}
                            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:cursor-not-allowed font-medium"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!userInput.trim() || isTyping}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default GuidedPracticeView;
