import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- Code Block Component with Copy ---
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group my-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 max-w-full overflow-visible">
        {/* Floating Language Label / Copy Button */}
        <div className="absolute right-2.5 top-2.5 z-20">
            <button
                onClick={handleCopy}
                className={`
                  group/btn relative flex items-center justify-center px-2.5 py-1.5 rounded-lg transition-colors duration-200 border
                  ${copied 
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-slate-50 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }
                `}
            >
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  {copied ? 'Copied' : language}
                </span>
                
                {/* Tooltip */}
                {!copied && (
                   <div className="absolute top-full right-0 mt-2 px-2.5 py-1.5 bg-slate-200/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 text-xs rounded-md opacity-0 group-hover/btn:opacity-100 pointer-events-none whitespace-nowrap transition-opacity backdrop-blur-sm shadow-lg border border-slate-300/50 dark:border-slate-600/50 z-50">
                      Click to Copy
                   </div>
                )}
            </button>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <SyntaxHighlighter
            {...props}
            style={oneDark}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '0.75rem 1rem 0.75rem 1rem',
              borderRadius: '0',
              background: 'transparent',
              fontSize: '1.125rem',
              lineHeight: '1.4',
              textShadow: 'none', // Remove text shadow
            }}
            codeTagProps={{
              style: { 
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                background: 'transparent',
                backgroundColor: 'transparent',
                textShadow: 'none' // Remove text shadow
              }
            }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  // Inline code
  return (
    <code 
      className={`
        ${className}
        px-1.5 py-0.5 rounded-md font-medium text-[0.9em]
        bg-slate-100 dark:bg-slate-800
        text-slate-800 dark:text-slate-200
        border border-slate-200 dark:border-slate-700
      `} 
      {...props}
    >
      {children}
    </code>
  );
};

export default CodeBlock;
