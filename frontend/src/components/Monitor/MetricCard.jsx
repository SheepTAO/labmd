import { motion } from 'framer-motion';

// --- Component: Enhanced Metric Card (Dynamic Waveform) ---
const MetricCard = ({ title, value, unit, icon, accent, footerTitle, footerSubTitle, chartData, className="", valueLabel="", variant="chart" }) => {
  const accents = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20",
    cyan: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20",
  };
  const theme = accents[accent];
  
  // Value Color: Change color based on value
  const getValueColor = (val) => {
     if (val < 60) return 'text-slate-800'; 
     if (val < 85) return 'text-amber-600'; 
     return 'text-rose-600'; 
  };

  // Progress Bar Color: Green -> Orange -> Red
  const getProgressColor = (val) => {
     if (val < 60) return 'bg-emerald-500';
     if (val < 85) return 'bg-amber-500';
     return 'bg-rose-500';
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-48 justify-between relative overflow-hidden group ${className}`}>
      
      <div className="flex justify-between items-center relative z-10 mb-2">
        <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${theme}`}>
                {icon}
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">{title}</h3>
        </div>
        <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
               {valueLabel && <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">{valueLabel}</span>}
               <span className={`text-4xl font-black tracking-tighter leading-none ${getValueColor(value)}`}>{value}</span>
               <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-1">{unit}</span>
            </div>
        </div>
      </div>
      
      {/* Dynamic Content: Chart or Progress Bar */}
      <div className="relative z-10 mt-2">
         {variant === 'chart' && chartData && (
            <div className="flex items-end gap-1 h-10 opacity-60">
                {chartData.map((h, i) => {
                    const isLatest = i === chartData.length - 1;
                    return (
                    <motion.div 
                        key={i}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ 
                            height: `${Math.max(4, Math.min(100, h))}%`,
                            opacity: 1
                        }}
                        transition={{ 
                            height: { duration: 0.3, ease: "easeOut" },
                            opacity: { duration: 0.3 }
                        }}
                        className={`flex-1 rounded-t-sm ${isLatest ? 'bg-indigo-500' : 'bg-slate-200'}`} 
                    />
                    );
                })}
            </div>
         )}

         {variant === 'progress' && (
             <div className="h-10 flex items-center">
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                       transition={{ duration: 1 }}
                       className={`h-full rounded-full ${getProgressColor(value)}`}
                    />
                </div>
             </div>
         )}
      </div>

      <div className="relative z-10 border-t border-slate-100 dark:border-slate-700 pt-3">
        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{footerTitle}</div>
        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">{footerSubTitle}</div>
      </div>
    </div>
  );
};

export default MetricCard;
