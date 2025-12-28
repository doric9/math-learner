import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';
import { cleanText } from '../utils/textUtils';

const ProblemDisplay = ({ content, isHtml = false, className = '', inline = false, size = 'text-lg' }) => {
    const containerRef = useRef(null);
    const Component = inline ? 'span' : 'div';

    useEffect(() => {
        if (isHtml && containerRef.current) {
            renderMathInElement(containerRef.current, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        }
    }, [content, isHtml]);

    if (!content) return null;

    if (isHtml) {
        const cleanedHtml = cleanText(content);

        return (
            <Component
                ref={containerRef}
                className={`${!inline ? 'prose max-w-none' : ''} ${size} text-gray-800 ${className}`}
                dangerouslySetInnerHTML={{ __html: cleanedHtml }}
            />
        );
    }

    const cleanedContent = cleanText(content);

    return (
        <Component className={`${!inline ? 'prose max-w-none prose-slate' : ''} ${size} ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ node, ...props }) => inline ? <span {...props} /> : <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 last:mb-0" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 last:mb-0" {...props} />,
                    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                    code: ({ node, inline: isInline, ...props }) =>
                        isInline
                            ? <code className="bg-slate-200/50 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                            : <code className="block bg-slate-200/50 p-3 rounded-lg text-sm font-mono overflow-x-auto my-3" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-slate-300 pl-4 italic my-3" {...props} />,
                }}
            >
                {cleanedContent}
            </ReactMarkdown>
        </Component>
    );
};

export default ProblemDisplay;
