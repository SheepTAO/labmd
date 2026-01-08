// --- Component: Header Info Badge (Transparent Glassmorphism) ---
const HeaderBadge = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-slate-100 dark:border-slate-600 rounded-xl px-5 py-3 shadow-sm">
     <div className="text-indigo-500 dark:text-indigo-400 opacity-80">{icon}</div>
     <div>
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider opacity-70 leading-none mb-1">{label}</div>
        <div className="text-lg font-bold text-slate-700 dark:text-slate-300 leading-none font-mono">{value}</div>
     </div>
  </div>
);

export default HeaderBadge;
