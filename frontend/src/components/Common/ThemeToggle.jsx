import { Sun, Moon, SunMoon } from 'lucide-react';

const ThemeToggle = ({ theme, onToggle }) => {
  const themes = [
    { 
      id: 'light', 
      icon: Sun, 
      label: 'Light',
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      border: 'border-amber-300'
    },
    { 
      id: 'dark', 
      icon: Moon, 
      label: 'Dark',
      color: 'dark:text-indigo-400',
      bg: 'dark:bg-indigo-950/30',
      border: 'dark:border-indigo-800/50'
    },
    { 
      id: 'auto', 
      icon: SunMoon, 
      label: 'Auto',
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
      border: 'border-slate-300 dark:border-slate-700'
    }
  ];

  const currentTheme = themes.find(t => t.id === theme);
  const Icon = currentTheme.icon;

  return (
    <div className="relative group">
      <button
        onClick={onToggle}
        className={`
          w-11 h-11 rounded-xl
          flex items-center justify-center
          ${currentTheme.bg}
          ${currentTheme.border}
          ${currentTheme.color}
          border-2
          transition-colors duration-200
        `}
        title={`Theme: ${currentTheme.label}`}
      >
        <Icon size={20} strokeWidth={2.5} />
      </button>

      {/* Hover Tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-medium">
        {currentTheme.label}
      </div>
    </div>
  );
};

export default ThemeToggle;
