import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, BookOpen, Menu, X,
  CircuitBoard, Tag,
  Folder, FolderOpen, ChevronRight, ChevronDown, FileText,
  LayoutPanelTop, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { processStats, processConfig } from './utils/dataProcessing';
import NavItem from './components/Common/NavItem';
import ThemeToggle from './components/Common/ThemeToggle';
import MonitorView from './components/Monitor/MonitorView';
import DocsView from './components/Docs/DocsView';

const App = () => {
  const [activeTab, setActiveTab] = useState('monitor');
  // Initialize with empty state
  const [config, setConfig] = useState(processConfig(null));
  const [stats, setStats] = useState(processStats(null, processConfig(null)));
  const [isLive, setIsLive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Docs State (Lifted Up)
  const [fileTree, setFileTree] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});

  // Theme State
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('theme') || 'auto');

  // Apply theme
  useEffect(() => {
    const applyTheme = (isDark) => {
      document.documentElement.classList.toggle('dark', isDark);
    };

    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      const listener = (e) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(themeMode === 'dark');
    }
  }, [themeMode]);

  const cycleTheme = useCallback(() => {
    const modes = ['light', 'dark', 'auto'];
    const nextMode = modes[(modes.indexOf(themeMode) + 1) % modes.length];
    setThemeMode(nextMode);
    localStorage.setItem('theme', nextMode);
  }, [themeMode]);

  // Fetch App config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          const processedConfig = processConfig(data);
          setConfig(processedConfig);
          // Update page title with projectName
          document.title = processedConfig.projectName;
        }
      } catch (err) {
        console.error('Failed to fetch config:', err);
      }
    };
    fetchConfig();
  }, []);

  // --- Core Connection Logic (Data Engine) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('API Error');
        
        const rawData = await res.json();
        const cleanData = processStats(rawData, config);

        // --- Update Interface ---
        setStats(cleanData);
        setIsLive(true);
      } catch (err) {
        console.error('Fetch Error:', err);
        setStats(processStats(null, config));
        setIsLive(false);
      }
    };
    const timer = setInterval(fetchData, config.intervalCRG * 1000);
    fetchData(); 
    return () => clearInterval(timer);
  }, [config.intervalCRG]);

  const handleSelectFile = useCallback(async (node) => {
    setSelectedFile(node);
    setDocLoading(true);
    setMobileMenuOpen(false);
    try {
      const res = await fetch(`/api/docs/content?path=${encodeURIComponent(node.path)}`);
      
      if (res.ok) {
        const text = await res.text();
        setContent(text);
      } else {
        setContent("Error loading content: File not found.");
      }
    } catch (err) {
      console.error("Failed to fetch content", err);
      setContent("Error loading content.");
    } finally {
      setDocLoading(false);
    }
  }, []);

  // Fetch Docs Tree
  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch('/api/docs/tree');
      const data = await res.json();
      setFileTree(data);
      
      // Auto-select first document (backend already sorted: default doc first, then files, then dirs)
      if (data && data.children && data.children.length > 0 && !selectedFile) {
        // Find first file (not directory)
        const firstFile = data.children.find(node => node.type === 'file');
        if (firstFile) {
          handleSelectFile(firstFile);
        }
      }
    } catch (err) {
      console.error("Failed to fetch docs tree", err);
    }
  }, [selectedFile, handleSelectFile]);

  useEffect(() => {
    if (activeTab === 'docs') {
      fetchTree();
    }
  }, [activeTab, fetchTree]);

  const toggleFolder = useCallback((path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  }, []);

  // Sidebar Content Renderer (shared between mobile and desktop)
  const renderSidebarContent = () => (
    <>
      <div className="p-8 pb-4 shrink-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30">
            <CircuitBoard size={24} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-2xl text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">{config.projectName}</h1>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mt-1 block leading-tight break-words">{config.labName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mb-6">
          {/* Server Status - Rectangle */}
          <div className={`flex-1 px-4 py-2.5 rounded-xl border-2 transition-colors flex items-center gap-3 ${isLive ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30'}`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className={`text-sm font-bold tracking-wide ${isLive ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {isLive ? 'Online' : 'Offline'}
            </span>
            <Activity size={16} className={`ml-auto ${isLive ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}`} />
          </div>
          
          {/* Theme Toggle Button */}
          <ThemeToggle theme={themeMode} onToggle={cycleTheme} />
        </div>
      </div>
      
      {/* Menu section - fixed, no scroll */}
      <nav className="px-6 space-y-2 shrink-0">
        <div className="px-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Menu</div>
        <NavItem 
          icon={<LayoutPanelTop />} 
          label="Monitor Dashboard" 
          active={activeTab === 'monitor'} 
          onClick={() => { setActiveTab('monitor'); setMobileMenuOpen(false); }} 
        />
        <NavItem 
          icon={<BookOpen />} 
          label="Lab Docs" 
          active={activeTab === 'docs'} 
          onClick={() => { setActiveTab('docs'); setMobileMenuOpen(false); }} 
        />
      </nav>
      
      {/* File Tree - independent scrollable area */}
      {activeTab === 'docs' ? (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6">
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-1 mt-2 mb-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700/50"
            >
              {renderTree(fileTree)}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1"></div>
      )}

      <div className="p-3 border-t border-slate-200 dark:border-slate-700 mx-4 shrink-0">
        <div className="text-xs font-medium flex items-center justify-between gap-3">
          <a 
            href="https://github.com/SheepTAO/labmd"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
            title="View project on GitHub"
          >
            <Tag size={12} className="text-indigo-400 dark:text-indigo-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"/> 
            <span>{config.version}</span>
          </a>
          {config.admin?.name && (
            <a 
              href={`mailto:${config.admin.email}`}
              className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors group"
              title={`Contact ${config.admin.name}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0">
                <circle cx="12" cy="8" r="5"/>
                <path d="M20 21a8 8 0 1 0-16 0"/>
              </svg>
              <span className="truncate">{config.admin.name}</span>
            </a>
          )}
        </div>
      </div>
    </>
  );

  // Recursive Tree Renderer
  const renderTree = (node, level = 0) => {
    if (!node) return null;
    
    // Root container
    if (node.name === 'root') {
      return (
        <div className="space-y-1 mt-2">
          {node.children && node.children.map(child => renderTree(child, level))}
        </div>
      );
    }

    const isDir = node.type === 'dir';
    const isExpanded = expandedFolders[node.path];
    const isSelected = selectedFile?.path === node.path;
    const paddingLeft = level * 8 + 8;

    if (isDir) {
      return (
        <div key={node.path} className="mb-1">
          <div 
            onClick={() => toggleFolder(node.path)}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-slate-600 dark:text-slate-300 font-bold text-xs select-none group transition-colors"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            <div className="flex items-center gap-2">
              {isExpanded ? <FolderOpen size={14} className="text-indigo-500 dark:text-indigo-400"/> : <Folder size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-400 dark:group-hover:text-indigo-500"/>}
              <span>{node.name}</span>
            </div>
            {isExpanded ? <ChevronDown size={12} className="text-slate-400 dark:text-slate-500"/> : <ChevronRight size={12} className="text-slate-400 dark:text-slate-500"/>}
          </div>
          
          {isExpanded && (
            <div className="mt-1 space-y-1">
               {node.children && node.children.map(child => renderTree(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // Check if this file is the default document (homepage)
    const isDefaultDoc = config.defaultDoc && node.path === config.defaultDoc;

    return (
      <div 
        key={node.path}
        onClick={() => handleSelectFile(node)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-all ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'}`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {isDefaultDoc ? (
          <Home size={14} className={`shrink-0 ${isSelected ? "text-indigo-500 dark:text-indigo-400" : "text-amber-500 dark:text-amber-400"}`} />
        ) : (
          <FileText size={14} className={`shrink-0 ${isSelected ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
        )}
        <span className="truncate">{node.name.replace(/\.md$/i, '')}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex font-sans text-slate-800 dark:text-slate-200 selection:bg-indigo-100 dark:selection:bg-indigo-900/30 selection:text-indigo-700 dark:selection:text-indigo-400 transition-colors duration-300">
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMobileMenuOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 xl:hidden text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-40 xl:hidden"
            />
            <motion.aside 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-72 bg-white dark:bg-[#1e293b] border-r border-slate-100 dark:border-slate-700/50 flex flex-col fixed h-full z-50 xl:hidden shadow-2xl"
            >
               <div className="p-4 flex justify-end">
                 <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 transition-colors">
                   <X size={20} />
                 </button>
               </div>
               {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-72 bg-white/90 dark:bg-[#1e293b]/90 border-r border-slate-100 dark:border-slate-700/50 flex flex-col fixed h-full z-30 hidden xl:flex backdrop-blur-sm">
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 xl:ml-72 overflow-y-auto overflow-x-hidden bg-slate-50/50 dark:bg-[#0f172a]/50 h-screen transition-colors duration-300">
        <div className="w-full h-full">
          <AnimatePresence mode="wait">
            {activeTab === 'monitor' ? (
              <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto">
                 <MonitorView stats={stats} key="monitor" />
              </div>
            ) : (
              <DocsView 
                key="docs" 
                selectedFile={selectedFile} 
                content={content} 
                loading={docLoading} 
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;