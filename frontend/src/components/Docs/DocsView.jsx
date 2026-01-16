import { useState, useEffect, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import { RefreshCw, BookOpen, User, Clock, ListTree, ListCollapse, X } from 'lucide-react';
import 'katex/dist/katex.min.css';
import CodeBlock from './CodeBlock';

// --- Independent Table of Contents Component ---
// Separated to prevent re-rendering the heavy Markdown content when creating active highlight
const TableOfContents = memo(({ headings, isMobile = false, onClose }) => {
  const [activeId, setActiveId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const tocContainerRef = useRef(null);

  useEffect(() => {
    if (headings.length === 0) return;
    
    // Set initial active state
    setActiveId(headings[0]?.id);

    const observer = new IntersectionObserver(
      (entries) => {
        // Filter intersecting entries and find the topmost one
        const intersecting = entries.filter(e => e.isIntersecting && e.target.id);
        if (intersecting.length > 0) {
          // Sort by position - pick the one closest to the top
          intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const topEntry = intersecting[0];
          setActiveId(topEntry.target.id);
        }
      },
      {
        root: null,
        // Adjust rootMargin to trigger earlier/smoother
        // -80% bottom means we trigger when the header is in the top 20% of screen
        rootMargin: '0px 0px -80% 0px', 
        threshold: 0
      }
    );

    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  // Auto-scroll TOC to keep active item visible
  useEffect(() => {
    if (!activeId || !tocContainerRef.current) return;
    
    const activeButton = tocContainerRef.current.querySelector(`[data-heading-id="${activeId}"]`);
    if (!activeButton) return;
    
    // Get the sticky header height to account for offset
    const stickyHeader = tocContainerRef.current.querySelector('button');
    const headerHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
    
    // Calculate if the active button is hidden behind the sticky header
    const containerRect = tocContainerRef.current.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    
    // If button is behind the sticky header, scroll it into view with offset
    if (buttonRect.top < containerRect.top + headerHeight) {
      tocContainerRef.current.scrollBy({
        top: buttonRect.top - containerRect.top - headerHeight - 10,
        behavior: 'smooth'
      });
    } else if (buttonRect.bottom > containerRect.bottom) {
      // If button is below visible area, scroll it up
      activeButton.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest'
      });
    }
  }, [activeId]);

  const scrollToHeading = (id) => {
    const element = document.getElementById(id);
    if (element) {
      setActiveId(id);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Close mobile drawer after selecting
      if (isMobile && onClose) {
        onClose();
      }
    }
  };

  if (headings.length === 0) return null;

  // Find the minimum heading level (top level in this document)
  const topLevel = Math.min(...headings.map(h => h.level));

  // Find the top-level parent heading for the current active heading
  const getTopLevelParent = (activeHeadingId) => {
    const activeIndex = headings.findIndex(h => h.id === activeHeadingId);
    if (activeIndex === -1) return null;
    
    // If already top level, return itself
    if (headings[activeIndex].level === topLevel) {
      return headings[activeIndex].id;
    }
    
    // Search backwards for the first top-level heading
    for (let i = activeIndex - 1; i >= 0; i--) {
      if (headings[i].level === topLevel) {
        return headings[i].id;
      }
    }
    return null;
  };

  const containerClasses = isMobile
    ? "w-80 bg-white dark:bg-slate-800 h-full overflow-y-auto custom-scrollbar"
    : "hidden 2xl:block w-64 flex-shrink-0 h-screen sticky top-0 pr-2 overflow-y-auto custom-scrollbar";

  return (
    <div ref={tocContainerRef} className={containerClasses}>
      {/* Scrollable Content with Sticky Header */}
      <div className={`relative ${isMobile ? 'px-6' : 'pl-6 border-l border-slate-200 dark:border-slate-800'}`}>
        {/* Sticky Header - visually integrated */}
        <div className="sticky top-0 z-10 py-4 flex items-center justify-between bg-transparent">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            {isExpanded ? (
              <ListCollapse size={16} className="text-slate-600 dark:text-slate-400" />
            ) : (
              <ListTree size={16} className="text-slate-600 dark:text-slate-400" />
            )}
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Table of Contents
            </h4>
          </button>
          {isMobile && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
            >
              <X size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
          )}
        </div>

        <ul className="space-y-0.5 relative py-6">
          {headings
            .filter(h => isExpanded || h.level === topLevel) // Show all when expanded, only top level when collapsed
            .map((h, i) => {
            // When collapsed, highlight the top-level parent of the active heading
            const isActive = isExpanded 
              ? activeId === h.id 
              : h.id === getTopLevelParent(activeId);
            
            // Fixed font-weight to prevent layout shift
            let textClass = "font-medium";
            let colorClass = "text-slate-600 dark:text-slate-300";
            
            if (h.level === 1) {
              textClass = "font-semibold";
              colorClass = isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-slate-100";
            } else if (h.level === 2) {
              colorClass = isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-200";
            } else {
              colorClass = isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-300";
            }

            return (
              <li key={i} className="relative group">
                {/* Active Indicator Pille - Animated Sliding Marker */}
                {isActive && (
                  <motion.div
                    layoutId="toc-marker"
                    className="absolute -left-[25px] top-1.5 bottom-1.5 w-[3px] rounded-full bg-indigo-600 dark:bg-indigo-400"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                
                <button 
                  onClick={() => scrollToHeading(h.id)}
                  data-heading-id={h.id}
                  className={`text-left w-full transition-colors duration-200 py-1 text-xs leading-relaxed block
                    hover:text-indigo-500 dark:hover:text-indigo-300
                    ${textClass} ${colorClass}
                  `}
                  style={{ 
                    // Subtle indentation
                    paddingLeft: h.level === 1 ? '0px' : `${(h.level - 1) * 12}px` 
                  }}
                >
                  {h.text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});

// --- Docs View ---
const DocsView = memo(({ selectedFile, content, loading }) => {
  const [headings, setHeadings] = useState([]);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    // Extract headings from rendered DOM to get actual IDs generated by rehypeSlug
    if (contentRef.current && content) {
      const headingElements = contentRef.current.querySelectorAll('h1, h2, h3');
      const extractedHeadings = Array.from(headingElements).map(el => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent,
        id: el.id
      }));
      setHeadings(extractedHeadings);
    }
  }, [content]);

  // Image URL Transformer
  const transformImageUri = (uri) => {
    if (uri.startsWith('http') || uri.startsWith('/')) {
      return uri;
    }
    // Construct path relative to the current document
    // selectedFile.path is like "folder/doc.md"
    // Backend serves files at /raw/folder/image.png
    const docDir = selectedFile?.path.split('/').slice(0, -1).join('/');
    const finalUrl = docDir ? `/raw/${docDir}/${uri}` : `/raw/${uri}`;
    return finalUrl;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-full flex flex-col"
    >
      <div className="flex-1 flex">
        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 lg:p-16 relative min-w-0">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 gap-2 h-96">
              <RefreshCw className="animate-spin" /> Loading...
            </div>
          ) : selectedFile ? (
            <div className="max-w-5xl mx-auto">
              {/* Metadata Header */}
              <div className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                        <User size={14} className="text-indigo-500 dark:text-indigo-400"/>
                        <span>Created by <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedFile.owner || 'Unknown'}</span></span>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Clock size={14} className="text-indigo-500 dark:text-indigo-400"/>
                        <span>Updated <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedFile.modTime || 'Unknown'}</span></span>
                    </div>
                  </div>
              </div>

              <article ref={contentRef} className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-sans prose-headings:scroll-mt-20
                
                /* H1: Bold + Left Accent + Comfortable Size */
                prose-h1:text-3xl prose-h1:font-bold prose-h1:tracking-tight
                prose-h1:text-slate-900 dark:prose-h1:text-slate-50
                prose-h1:border-l-[5px] prose-h1:border-indigo-500 prose-h1:pl-4
                prose-h1:mt-10 prose-h1:mb-6 prose-h1:leading-tight

                /* H2: Semibold + Subtle Left Border + Medium Size */
                prose-h2:text-2xl prose-h2:font-semibold prose-h2:tracking-tight
                prose-h2:text-slate-900 dark:prose-h2:text-slate-100
                prose-h2:border-l-[3px] prose-h2:border-slate-300 dark:prose-h2:border-slate-600 prose-h2:pl-3
                prose-h2:mt-8 prose-h2:mb-4 prose-h2:leading-snug

                /* H3: Semibold + Standard Size */
                prose-h3:text-lg prose-h3:font-semibold prose-h3:tracking-tight
                prose-h3:text-slate-800 dark:prose-h3:text-slate-200
                prose-h3:mt-6 prose-h3:mb-3 prose-h3:leading-snug

                /* Body Text */
                prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4 prose-p:break-words
                
                /* Strong: Medium weight (clearly different from headings) */
                prose-strong:font-medium prose-strong:text-slate-700 dark:prose-strong:text-slate-300
                prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500 dark:hover:prose-a:text-indigo-300 prose-a:no-underline hover:prose-a:underline prose-a:break-all
                prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent prose-pre:shadow-none prose-pre:border-none prose-pre:overflow-visible
                prose-code:before:content-none prose-code:after:content-none prose-code:text-slate-800 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-img:rounded-xl prose-img:my-8 prose-img:max-w-full prose-img:mx-auto prose-img:block
                prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 dark:prose-blockquote:border-indigo-600 prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-950/30 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-lg prose-blockquote:not-italic prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300 prose-blockquote:my-4
                prose-ul:list-disc prose-ul:pl-6 prose-ul:marker:text-indigo-400 dark:prose-ul:marker:text-indigo-500
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:marker:text-indigo-500 dark:prose-ol:marker:text-indigo-400
                prose-li:mb-2 prose-li:text-slate-600 dark:prose-li:text-slate-300
                prose-table:border-collapse prose-table:w-full
                prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:text-slate-900 dark:prose-th:text-slate-100 prose-th:p-3 prose-th:border dark:prose-th:border-slate-700
                prose-td:p-3 prose-td:border dark:prose-td:border-slate-700 prose-td:text-slate-700 dark:prose-td:text-slate-300
                prose-hr:border-slate-200 dark:prose-hr:border-slate-700
              ">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeSlug, rehypeKatex]}
                    urlTransform={transformImageUri}
                    components={{
                      code: CodeBlock
                    }}
                  >
                    {content}
                  </ReactMarkdown>
              </article>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 min-h-[60vh]">
                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-sm border border-slate-100 dark:border-slate-700">
                  <BookOpen size={48} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-3">No Documentation Available</h3>
                <p className="text-slate-400 dark:text-slate-500 max-w-sm text-center leading-relaxed">Please create Markdown files in the configured docs directory to get started.</p>
            </div>
          )}
        </div>

        {/* Desktop TOC Sidebar */}
        {!loading && selectedFile && headings.length > 0 && (
          <TableOfContents headings={headings} />
        )}
      </div>

      {/* Mobile TOC Button */}
      {!loading && selectedFile && headings.length > 0 && (
        <button
          onClick={() => setMobileTocOpen(true)}
          className="fixed bottom-6 right-6 2xl:hidden p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-30"
          title="Table of Contents"
        >
          <ListTree size={20} />
        </button>
      )}

      {/* Mobile TOC Drawer */}
      <AnimatePresence>
        {mobileTocOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileTocOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-40 2xl:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full z-50 2xl:hidden shadow-2xl"
            >
              <TableOfContents 
                headings={headings} 
                isMobile={true}
                onClose={() => setMobileTocOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default DocsView;
