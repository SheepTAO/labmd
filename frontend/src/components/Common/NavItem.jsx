import { cloneElement } from 'react';

// --- Side Nav Item ---
const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm ${
      active 
        ? 'text-white bg-indigo-600 dark:bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-950/50' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
    }`}
  >
    {cloneElement(icon, { size: 18 })}
    {label}
  </button>
);

export default NavItem;
