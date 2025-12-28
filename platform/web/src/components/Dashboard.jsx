import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [topicStats, setTopicStats] = useState([]);
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

                // Process Real Topic Stats
                const stats = {
                    'Arithmetic': { total: 0, correct: 0 },
                    'Algebra': { total: 0, correct: 0 },
                    'Geometry': { total: 0, correct: 0 },
                    'Number Theory': { total: 0, correct: 0 },
                    'Counting': { total: 0, correct: 0 }
                };

                fetchedResults.forEach(result => {
                    const ans = result.answers || {};
                    const correctAns = result.correctAnswers || {};

                    // Only process results that have the answer mapping
                    if (Object.keys(correctAns).length > 0) {
                        Object.keys(correctAns).forEach(idxStr => {
                            const idx = parseInt(idxStr);
                            const pNum = idx + 1;

                            let topic = 'Arithmetic';
                            if (pNum >= 23) topic = 'Counting';
                            else if (pNum >= 19) topic = 'Number Theory';
                            else if (pNum >= 13) topic = 'Geometry';
                            else if (pNum >= 6) topic = 'Algebra';

                            stats[topic].total++;
                            if (ans[idx] === correctAns[idx]) {
                                stats[topic].correct++;
                            }
                        });
                    } else if (result.score !== undefined) {
                        // Fallback for older results: distributing score proportionally as a placeholder
                        // This prevents empty charts for existing data while they haven't taken new tests
                        const ratio = result.score / 25;
                        Object.keys(stats).forEach(topic => {
                            stats[topic].total += 5;
                            stats[topic].correct += 5 * ratio;
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

    // Prepare Data for Line Chart (Reverse to show oldest to newest)
    const scoreData = [...results].reverse().map(r => ({
        name: r.examYear,
        score: r.score
    }));

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 border-l-4 border-indigo-500">
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Exams Taken</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalExams}</dd>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 border-l-4 border-green-500">
                        <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{avgScore} <span className="text-sm text-gray-400">/ 25</span></dd>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg p-5 border-l-4 border-purple-500">
                        <dt className="text-sm font-medium text-gray-500 truncate">Mastery Level</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">
                            {avgScore >= 20 ? 'Expert' : avgScore >= 15 ? 'Advanced' : 'Apprentice'}
                        </dd>
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
