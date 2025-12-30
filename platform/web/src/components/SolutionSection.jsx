import React, { useState } from 'react';
import ProblemDisplay from './ProblemDisplay';
import { Youtube, Lightbulb, ChevronRight, Video } from 'lucide-react';

const SolutionSection = ({ problem }) => {
    const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
    const { solutions = [], videoSolutions = [], solutionText, solutionHtml } = problem;

    // Combine solutions if we have them, otherwise use the fallback single solution
    const allSolutions = solutions.length > 0
        ? solutions
        : [{ title: 'Solution', text: solutionText, html: solutionHtml }];

    const currentSolution = allSolutions[activeSolutionIndex];
    const hasMultipleSolutions = allSolutions.length > 1;

    if (!currentSolution && videoSolutions.length === 0) return null;

    return (
        <div className="space-y-6">
            {/* Title & Navigation */}
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="text-amber-500" size={20} />
                    {currentSolution?.title || 'Solution'}
                </h3>

                {hasMultipleSolutions && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">
                            {activeSolutionIndex + 1} of {allSolutions.length}
                        </span>
                        <button
                            onClick={() => setActiveSolutionIndex((activeSolutionIndex + 1) % allSolutions.length)}
                            className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full transition-colors"
                        >
                            Show Another Approach <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Solution Content */}
            <div className="bg-white rounded-xl">
                <ProblemDisplay
                    content={currentSolution?.html || currentSolution?.text}
                    isHtml={!!currentSolution?.html}
                />
            </div>

            {/* Video Solutions */}
            {videoSolutions.length > 0 && (
                <div className="mt-8 border-t pt-6">
                    <h4 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Video className="text-indigo-600" size={18} />
                        Video Explanations
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {videoSolutions.map((video, idx) => (
                            <a
                                key={idx}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                    <Youtube size={20} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-gray-800 truncate">{video.title || `Video Solution ${idx + 1}`}</p>
                                    <p className="text-xs text-gray-500 font-medium truncate">{video.url.replace('https://', '')}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SolutionSection;
