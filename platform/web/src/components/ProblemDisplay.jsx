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
        <Component className={`${!inline ? 'prose max-w-none' : ''} ${size} text-gray-800 ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ node, ...props }) => inline ? <span {...props} /> : <p className="mb-4 leading-relaxed" {...props} />,
                }}
            >
                {cleanedContent}
            </ReactMarkdown>
        </Component>
    );
};

export default ProblemDisplay;
