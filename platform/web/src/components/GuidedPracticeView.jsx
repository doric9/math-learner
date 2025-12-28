import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { chatWithTutor } from '../services/tutor';
import { Send, BookOpen, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import ProblemDisplay from './ProblemDisplay';

const GuidedPracticeView = () => {
    const { year } = useParams();
    const navigate = useNavigate();
    const [problems, setProblems] = useState([]);
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Conversational Chat State
    const [conversation, setConversation] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation, isTyping]);

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
    }, [year]);

    // Add welcome message when problem loads
    useEffect(() => {
        if (problems.length > 0 && conversation.length === 0) {
            setConversation([{
                role: 'tutor',
                content: "Hi! I'm your AI math tutor. I'm here to help you work through this problem step by step. Feel free to ask me questions, request hints, or share your thinking. What would you like to start with?"
            }]);
        }
    }, [problems, currentProblemIndex]);

    const currentProblem = problems[currentProblemIndex];

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

        try {
            // Get AI response
            const tutorResponse = await chatWithTutor(currentProblem, newConversation, userMessage);

            setConversation([
                ...newConversation,
                { role: 'tutor', content: tutorResponse }
            ]);
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
        if (currentProblemIndex < problems.length - 1) {
            setCurrentProblemIndex(prev => prev + 1);
            setConversation([{
                role: 'tutor',
                content: "Great! Let's move on to the next problem. Take a moment to read it, and let me know when you're ready to start or if you have any questions!"
            }]);
        }
    };

    const handlePrevProblem = () => {
        if (currentProblemIndex > 0) {
            setCurrentProblemIndex(prev => prev - 1);
            setConversation([{
                role: 'tutor',
                content: "Let's go back to the previous problem. What would you like to work on?"
            }]);
        }
    };

    const quickActions = [
        { text: "Give me a hint", icon: "💡" },
        { text: "I don't know where to start", icon: "🤔" },
        { text: "Is my approach correct?", icon: "✓" },
        { text: "Show me the solution", icon: "📖" }
    ];

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="text-xl text-gray-600">Loading...</div>
        </div>
    );

    if (!currentProblem) return (
        <div className="flex justify-center items-center h-screen">
            <div className="text-xl text-gray-600">No problems found.</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                            ← Back to Exams
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">{year} AMC 8 - Guided Practice</h1>
                        <div className="text-gray-500">Problem {currentProblem.problemNumber} / {problems.length}</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Problem {currentProblem.problemNumber}</h2>
                        <ProblemDisplay
                            content={currentProblem.problemHtml || currentProblem.problemText}
                            isHtml={!!currentProblem.problemHtml}
                            className="mb-8"
                        />

                        {currentProblem.choices && Object.keys(currentProblem.choices).length > 0 && (
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(currentProblem.choices).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => (
                                    <div
                                        key={key}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                                    >
                                        <span className="font-bold mr-2">{key}.</span>
                                        <ProblemDisplay content={val} inline size="text-base" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={handlePrevProblem}
                            disabled={currentProblemIndex === 0}
                            className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                        >
                            <ArrowLeft size={20} /> Previous
                        </button>
                        <button
                            onClick={handleNextProblem}
                            disabled={currentProblemIndex === problems.length - 1}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Sidebar */}
            <div className="w-96 bg-white border-l shadow-lg flex flex-col h-screen sticky top-0">
                {/* Header */}
                <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-2 text-purple-700">
                        <Sparkles size={24} />
                        <div>
                            <h2 className="text-xl font-bold">AI Tutor</h2>
                            <p className="text-xs text-purple-600">Guided Learning Assistant</p>
                        </div>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {conversation.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'student'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                <ProblemDisplay
                                    content={message.content}
                                    className={`text-sm ${message.role === 'student' ? 'text-white' : 'text-gray-800'}`}
                                />
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Quick Actions */}
                {conversation.length <= 2 && (
                    <div className="px-4 py-2 border-t bg-gray-50">
                        <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setUserInput(action.text);
                                        inputRef.current?.focus();
                                    }}
                                    className="text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                                >
                                    <span className="mr-1">{action.icon}</span>
                                    {action.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t bg-white">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask a question or request a hint..."
                            disabled={isTyping}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!userInput.trim() || isTyping}
                            className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuidedPracticeView;
