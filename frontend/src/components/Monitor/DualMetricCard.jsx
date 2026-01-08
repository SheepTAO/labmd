import { motion } from 'framer-motion';
import SmallInfoCard from './SmallInfoCard';

// --- Component: Dual Column Metric Card (Generalized) ---
const DualMetricCard = ({ 
    title, icon, 
    value, chartData, 
    rightTitle, rightValue, rightInfo,
    footerTitle, footerSubTitle,
    bottomCards = []
}) => {
    return (
      <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row gap-6 relative overflow-hidden group h-auto md:h-48">
        
        {/* Left: Core Load & History */}
        <div className="flex-1 flex flex-col justify-between relative z-10">
           <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/50">
                     {icon}
                  </div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">{title}</h3>
              </div>
              <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                     <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Load</span>
                     <span className="text-4xl font-black tracking-tighter leading-none text-slate-800 dark:text-slate-200">{value}</span>
                     <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-1">%</span>
                  </div>
              </div>
           </div>
           
           {/* Chart (Load) - Real Data */}
           <div className="relative z-10 mt-2">
             <div className="flex items-end gap-1 h-10 opacity-60">
               {chartData && chartData.map((h, i) => {
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
           </div>

           <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{footerTitle}</div>
              <div className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">{footerSubTitle}</div>
           </div>
        </div>

        {/* Right: Secondary Section + Bottom Cards */}
        <div className="w-full md:w-1/2 flex flex-col justify-center gap-4">
            
            {/* Top: Secondary Usage Bar */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 border border-slate-100 dark:border-slate-600">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{rightTitle}</span>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{rightValue}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-1">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${rightValue}%` }}
                       className="h-full bg-violet-500 dark:bg-violet-400 rounded-full"
                    />
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {rightInfo}
                    </span>
                </div>
            </div>

            {/* Bottom: Info Cards */}
            <div className="grid grid-cols-2 gap-3">
                {bottomCards.map((card, idx) => (
                    <SmallInfoCard key={idx} {...card} />
                ))}
            </div>
        </div>
      </div>
    );
};

export default DualMetricCard;
