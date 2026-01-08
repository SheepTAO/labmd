import { Zap, Fan, Thermometer } from 'lucide-react';

// --- Component: GPU Slot (Compact Optimization + New Icons) ---
const GPUSlotDetailed = ({ data }) => {
  const getColor = (val) => {
    if (val < 40) return 'bg-emerald-400';
    if (val < 80) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md hover:bg-white dark:hover:bg-slate-700 transition-all group relative overflow-hidden">
      {/* Header: ID + Name */}
      <div className="flex justify-between items-center mb-3 relative z-10">
         <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-700 transition-colors shrink-0">#{data.id}</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={data.name}>{data.name}</span>
         </div>
      </div>
      
      {/* Stats Grid */}
      <div className="space-y-3 relative z-10">
         
         {/* Core Util */}
         <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Core</span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{data.util}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
               <div className={`h-full rounded-full transition-all duration-500 ${getColor(data.util)}`} style={{width: `${data.util}%`}}></div>
            </div>
         </div>

         {/* Memory Util */}
         <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">VRAM</span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{data.memUsed}M <span className="text-slate-400 dark:text-slate-500 font-normal">/ {data.memTotal}M</span></span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-400 rounded-full transition-all duration-500" style={{width: `${data.memUtil}%`}}></div>
            </div>
         </div>

         {/* Footer: Power, Fan, Temp */}
         <div className="flex justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-600 mt-2">
             {/* Power */}
             <div className="flex-1 flex flex-col items-center bg-amber-50/50 dark:bg-amber-950/20 p-1 rounded border border-amber-100/50 dark:border-amber-900/30 min-w-0" title="Power Usage">
                <span className="text-[9px] font-bold text-amber-400 uppercase flex items-center gap-1 whitespace-nowrap"><Zap size={8} fill="currentColor" /> PWR</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{data.power}W</span>
             </div>
             {/* Fan */}
             <div className="flex-1 flex flex-col items-center bg-blue-50/50 dark:bg-blue-950/20 p-1 rounded border border-blue-100/50 dark:border-blue-900/30 min-w-0" title="Fan Speed">
                <span className="text-[9px] font-bold text-blue-400 uppercase flex items-center gap-1 whitespace-nowrap"><Fan size={8} className="animate-spin" /> FAN</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{data.fan}%</span>
             </div>
             {/* Temp */}
             <div className="flex-1 flex flex-col items-center bg-rose-50/50 dark:bg-rose-950/20 p-1 rounded border border-rose-100/50 dark:border-rose-900/30 min-w-0" title="Temperature">
                <span className="text-[9px] font-bold text-rose-400 uppercase flex items-center gap-1 whitespace-nowrap"><Thermometer size={8} /> TMP</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{data.temp}°</span>
             </div>
         </div>
      </div>
    </div>
  );
};

export default GPUSlotDetailed;
