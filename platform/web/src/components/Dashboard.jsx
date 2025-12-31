import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Flame, Star, Zap, Award, Trophy, AlertTriangle, ArrowRight, BookOpen, CheckCircle } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../utils/badgeDefinitions';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { getDueMistakes, backfillMistakes, repairMistakeJournal } from '../services/userService';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [topicStats, setTopicStats] = useState([]);
    const [userStats, setUserStats] = useState({ xp: 0, level: 1, streak: 0 });
    const [dueMistakes, setDueMistakes] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchResults() {
            if (!currentUser) return;

            try {
                const q = query(
                    collection(db, 'users', currentUser.uid, 'results'),
                    orderBy('date', 'desc'),
                    limit(20)
                );
                const querySnapshot = await getDocs(q);
                const fetchedResults = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setResults(fetchedResults);

                const CATEGORIES = ["Arithmetic", "Algebra", "Geometry", "Number Theory", "Counting"];

                // 1. Identify unique years to fetch current topic mappings
                const uniqueYears = [...new Set(fetchedResults.map(r => r.examYear))];
                const topicMappings = {};

                // 2. Fetch topic mappings for each year (to ensure we use the backfilled AI topics)
                for (const year of uniqueYears) {
                    if (!year) continue;
                    const problemsRef = collection(db, 'competitions', 'amc8', 'exams', year.toString(), 'problems');
                    const problemsSnap = await getDocs(problemsRef);
                    topicMappings[year] = {};
                    problemsSnap.forEach(pDoc => {
                        const pData = pDoc.data();
                        topicMappings[year][pData.problemNumber - 1] = pData.topic || 'General';
                    });
                }

                // 3. Process Topic Stats using the LIVE mappings
                const stats = {
                    'Arithmetic': { total: 0, correct: 0 },
                    'Algebra': { total: 0, correct: 0 },
                    'Geometry': { total: 0, correct: 0 },
                    'Number Theory': { total: 0, correct: 0 },
                    'Counting': { total: 0, correct: 0 }
                };

                fetchedResults.forEach(result => {
                    const ans = result.answers || {};
                    const year = result.examYear;
                    const yearMapping = topicMappings[year] || {};

                    // If we have an answer mapping, use the indices
                    if (Object.keys(ans).length > 0) {
                        Object.keys(ans).forEach(idxStr => {
                            const idx = parseInt(idxStr);
                            const topicStr = yearMapping[idx] || 'General';

                            const problemTopics = topicStr.split(',').map(s => s.trim()).filter(s => CATEGORIES.includes(s));
                            const primaryTopics = problemTopics.length > 0 ? problemTopics : ['Arithmetic'];

                            primaryTopics.forEach(topic => {
                                if (stats[topic]) {
                                    stats[topic].total++;
                                    // Use the correct answers from the result snapshot if available, 
                                    // or fallback to checking the problem directly (though we don't have that here easily)
                                    const correctAns = result.correctAnswers || {};
                                    if (ans[idx] === correctAns[idx]) {
                                        stats[topic].correct++;
                                    }
                                }
                            });
                        });
                    }
                });

                const statsArray = Object.keys(stats).map(topic => ({
                    subject: topic,
                    A: Math.min(100, stats[topic].total > 0 ? Math.round((stats[topic].correct / stats[topic].total) * 100) : 0),
                    fullMark: 100
                }));
                setTopicStats(statsArray);

            } catch (error) {
                console.error("Error fetching results:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [currentUser]);

    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Please log in to view your dashboard.</p>
                <button onClick={() => navigate('/login')} className="ml-4 text-indigo-600 underline">Login</button>
            </div>
        );
    }

    const totalExams = results.length;
    const avgScore = totalExams > 0
        ? (results.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalExams).toFixed(1)
        : 0;

    // Fetch User Profile Stats
    useEffect(() => {
        async function fetchUserStats() {
            if (!currentUser) return;
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                setUserStats({
                    xp: data.xp || 0,
                    level: data.level || 1,
                    streak: data.streak?.current || 0,
                    badges: data.badges || []
                });
            }
        }
        fetchUserStats();
    }, [currentUser]);

    // Fetch Due Mistakes
    useEffect(() => {
        async function fetchDue() {
            if (!currentUser) return;
            try {
                const mistakes = await getDueMistakes(currentUser.uid);
                setDueMistakes(mistakes);
            } catch (error) {
                console.error("Error fetching due mistakes:", error);
            }
        }
        fetchDue();
    }, [currentUser]);

    // Level calculation for progress bar
    // Current Level: L
    // XP for L to L+1 is roughly based on calculateLevel: level = sqrt(xp/25) + 1
    // (L-1)^2 * 25 = XP min for level L
    const xpMin = Math.pow(userStats.level - 1, 2) * 25;
    const xpMax = Math.pow(userStats.level, 2) * 25;
    const levelProgress = xpMax > xpMin ? Math.min(100, ((userStats.xp - xpMin) / (xpMax - xpMin)) * 100) : 0;

    // Prepare Data for Line Chart (Reverse to show oldest to newest)
    const scoreData = [...results].reverse().map(r => ({
        name: r.examYear,
        score: r.score
    }));
    // Identify Weakest Topics
    const weakestTopics = [...topicStats]
        .filter(t => t.A < 80) // Consider topics with less than 80% accuracy
        .sort((a, b) => a.A - b.A)
        .slice(0, 3);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {currentUser.displayName || 'Student'}!
                    </h1>
                    <button
                        onClick={() => navigate('/')}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        &larr; Back to Exams
                    </button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 border-l-4 border-indigo-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <dt className="text-sm font-medium text-gray-500 truncate">Experience Points</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">{userStats.xp} XP</dd>
                            </div>
                            <Star className="text-amber-400 w-8 h-8" />
                        </div>
                        <div className="mt-3">
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-1">
                                <span>Level {userStats.level}</span>
                                <span>{userStats.xp} / {xpMax} XP</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 transition-all duration-1000"
                                    style={{ width: `${levelProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <dt className="text-sm font-medium text-gray-500 truncate">Day Streak</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">{userStats.streak} Days</dd>
                            </div>
                            <Flame className="text-orange-500 w-8 h-8" />
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">{avgScore}</dd>
                            </div>
                            <Zap className="text-green-500 w-8 h-8" />
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <dt className="text-sm font-medium text-gray-500 truncate">Badges Earned</dt>
                                <dd className="mt-1 text-3xl font-semibold text-gray-900">{userStats.badges?.length || 0}</dd>
                            </div>
                            <Award className="text-purple-500 w-8 h-8" />
                        </div>
                    </div>
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Score History */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Score History</h3>
                        <div className="h-64 w-full">
                            {scoreData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={scoreData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis domain={[0, 25]} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    No data available yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Topic Strength (Radar) */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Topic Strength</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={topicStats}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar name="Accuracy %" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Knowledge Gaps / Recommendations */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500 w-5 h-5" />
                            Knowledge Gaps
                        </h3>
                        {weakestTopics.length > 0 ? (
                            <div className="space-y-4">
                                {weakestTopics.map(topic => (
                                    <div key={topic.subject} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <h4 className="font-bold text-slate-900">{topic.subject}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-500"
                                                        style={{ width: `${topic.A}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">{topic.A}% Accuracy</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/practice/topic/${topic.subject}`)}
                                            className="flex items-center gap-1 text-xs font-black text-indigo-600 uppercase tracking-widest hover:gap-2 transition-all"
                                        >
                                            Drill Topic <ArrowRight size={14} />
                                        </button>
                                    </div>
                                ))}
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider text-center pt-2">
                                    Recommendations based on your last 20 exams
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-center">
                                <Zap className="text-green-500 w-10 h-10 mb-2" />
                                <p className="font-bold text-slate-900">Master Level Reached</p>
                                <p className="text-sm text-slate-500">You're crushing it across all topics!</p>
                            </div>
                        )}
                    </div>

                    {/* Mistakes to Review */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="text-indigo-500 w-5 h-5" />
                            Mistakes to Review
                        </h3>
                        {dueMistakes.length > 0 ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 mb-2">
                                    You have {dueMistakes.length} problems due for review today.
                                </p>
                                <div className="space-y-3">
                                    {dueMistakes.slice(0, 3).map(mistake => (
                                        <div key={mistake.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{mistake.year} Problem {mistake.problemNumber}</h4>
                                                <p className="text-xs text-indigo-600 font-medium">{mistake.topic}</p>
                                            </div>
                                            <button
                                                onClick={() => navigate('/mistake-journal', { state: { problemId: mistake.id } })}
                                                className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 hover:text-indigo-800 transition-all active:scale-90"
                                            >
                                                <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => navigate('/mistake-journal')}
                                    className="w-full mt-2 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                                >
                                    Open Mistake Journal
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
                                <CheckCircle className="w-10 h-10 mb-2 text-green-500" />
                                <p className="font-bold text-slate-900">All caught up!</p>
                                <p className="text-sm">No mistakes due for review today.</p>
                                <button
                                    onClick={async () => {
                                        setIsSyncing(true);
                                        try {
                                            const res = await backfillMistakes(currentUser.uid);
                                            // Also run a repair just in case some metadata-only mistakes were left over
                                            const repairRes = await repairMistakeJournal(currentUser.uid);

                                            if (res.success || repairRes.success) {
                                                const updated = await getDueMistakes(currentUser.uid);
                                                setDueMistakes(updated);
                                                const msg = (res.count > 0)
                                                    ? `Successfully synced ${res.count} past mistakes and verified content!`
                                                    : (repairRes.count > 0)
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
                                    }}
                                    disabled={isSyncing}
                                    className="mt-4 text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                                >
                                    {isSyncing ? 'Syncing...' : 'Sync Past Mistakes'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Achievements Section */}
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Award className="text-purple-500 w-6 h-6" />
                        My Achievements
                    </h3>
                    {userStats.badges?.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {userStats.badges.map(badgeId => {
                                const badge = BADGE_DEFINITIONS[badgeId];
                                if (!badge) return null;

                                // Map icon string to component
                                const IconComponent = {
                                    'Flame': Flame,
                                    'Star': Star,
                                    'Trophy': Trophy,
                                    'Zap': Zap
                                }[badge.icon] || Award;

                                return (
                                    <div key={badgeId} className={`flex items-start p-4 rounded-xl border-2 ${badge.borderColor} ${badge.bgColor} transition-all hover:scale-[1.02]`}>
                                        <div className={`p-2 rounded-lg bg-white shadow-sm mr-4 ${badge.color}`}>
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 leading-tight">{badge.name}</h4>
                                            <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Award className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No badges yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Complete exams and maintain streaks to earn badges!</p>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Recent Activity
                        </h3>
                    </div>
                    <ul className="divide-y divide-gray-200">
                        {loading ? (
                            <li className="px-4 py-4 text-center text-gray-500">Loading activity...</li>
                        ) : results.length === 0 ? (
                            <li className="px-4 py-8 text-center text-gray-500">
                                No recent activity. <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">Take a test</button> to see your progress!
                            </li>
                        ) : (
                            results.map((result) => (
                                <li key={result.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition duration-150 ease-in-out">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-indigo-600 truncate">
                                            {result.examYear} AMC 8 - {result.mode === 'test' ? 'Mock Exam' : 'Practice'}
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.score >= 15 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                Score: {result.score} / 25
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500">
                                                {new Date(result.date?.seconds * 1000).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
