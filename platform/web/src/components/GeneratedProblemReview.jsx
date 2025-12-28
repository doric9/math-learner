import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateSimilarProblem } from '../services/gemini';
import ProblemDisplay from './ProblemDisplay';
import { Loader2, Check, X, RefreshCw } from 'lucide-react';

const GeneratedProblemReview = ({ originalProblem, onClose }) => {
    const [generatedProblem, setGeneratedProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    // Initial generation on mount
    useState(() => {
        handleGenerate();
    }, []);

    async function handleGenerate() {
        setLoading(true);
        setError(null);
        try {
            const result = await generateSimilarProblem(originalProblem);
            setGeneratedProblem(result);
        } catch (err) {
            setError('Failed to generate problem. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleApprove = async () => {
        if (!generatedProblem) return;
        setSaving(true);
        try {
            await addDoc(collection(db, 'generated_problems'), {
                ...generatedProblem,
                originalProblemId: originalProblem.id || 'unknown',
                sourceExam: originalProblem.examId || 'unknown', // Assuming we have this context
                status: 'approved',
                createdAt: new Date().toISOString()
            });
            onClose();
            alert('Problem approved and saved to the bank!');
        } catch (err) {
            console.error('Error saving problem:', err);
            setError('Failed to save problem.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-2xl font-bold text-gray-900">Review Generated Problem</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-4" />
                            <p className="text-gray-600">Consulting Gemini to create a similar problem...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-600 mb-4">{error}</p>
                            <button
                                onClick={handleGenerate}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Original Problem */}
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h3 className="font-bold text-gray-700 mb-2">Original Problem</h3>
                                <div className="bg-gray-50 p-4 rounded-lg text-sm h-64 overflow-y-auto">
                                    <ProblemDisplay
                                        content={originalProblem.problemHtml || originalProblem.problemText}
                                        isHtml={!!originalProblem.problemHtml}
                                    />
                                </div>
                                <div className="space-y-2 mt-4">
                                    {originalProblem.choices && Object.entries(originalProblem.choices).map(([key, val]) => (
                                        <div key={key} className="flex gap-2 text-sm text-gray-600">
                                            <span className="font-bold">{key}.</span>
                                            <ProblemDisplay content={val} inline size="text-sm" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Generated Problem */}
                            <div className="border rounded-lg p-4 bg-blue-50 border-blue-100">
                                <h3 className="font-bold text-blue-700 mb-2">Generated Variant</h3>
                                <div className="bg-blue-50 p-4 rounded-lg text-sm h-64 overflow-y-auto border border-blue-100">
                                    <ProblemDisplay content={generatedProblem.problemText} />

                                    <div className="mt-4 grid grid-cols-1 gap-2">
                                        {generatedProblem.choices && Object.entries(generatedProblem.choices).map(([key, val]) => (
                                            <div key={key} className="flex gap-2 text-sm text-gray-700">
                                                <span className="font-bold">{key}.</span>
                                                <ProblemDisplay content={val} inline size="text-sm" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-3 rounded border border-blue-100 text-sm mt-4">
                                    <p className="font-bold text-gray-700 mb-1">Solution:</p>
                                    <ProblemDisplay content={generatedProblem.solution} size="text-sm" className="text-gray-600" />
                                    <p className="mt-2 font-bold text-green-600 flex items-center gap-1">
                                        Correct Answer: <ProblemDisplay content={generatedProblem.correctAnswer} inline size="text-sm" />
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!loading && !error && (
                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                        <button
                            onClick={handleGenerate}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                            <RefreshCw size={18} />
                            Regenerate
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 shadow-sm"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                            Approve & Save
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeneratedProblemReview;
