import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, Zap, LayoutDashboard, HardDrive, 
  Server, Layers, Database, Clock, Command, 
  MemoryStick, Gpu, Thermometer 
} from 'lucide-react';
import FloatingOrb from './FloatingOrb';
import HeaderBadge from './HeaderBadge';
import MetricCard from './MetricCard';
import DualMetricCard from './DualMetricCard';
import GPUSlotDetailed from './GPUSlotDetailed';

// --- Core Monitor View ---
const MonitorView = memo(({ stats }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* 1. Top: Hero Header (White Background + Dynamic Gradient Orb) */}
      <motion.section 
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-8 group"
      >
        
        {/* Dynamic Background Glow (Floating Orbs) - Independent Path + Instant Response */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[
              {
                id: 1,
                positionClass: "left-[5%]",
                animatePath: { x: [0, 40, -20, 30, 0], y: [0, -30, 20, -10, 0] },
                durations: { x: 23, y: 29 },
                colorClass: "bg-indigo-500",
                glowColorRGB: "99, 102, 241"
              },
              {
                id: 2,
                positionClass: "left-[95%]",
                animatePath: { x: [0, -30, 20, -40, 0], y: [0, 20, -30, 10, 0] },
                durations: { x: 27, y: 31 },
                colorClass: "bg-purple-500",
                glowColorRGB: "168, 85, 247"
              },
              {
                id: 3,
                positionClass: "left-1/2",
                animatePath: { x: [0, 40, -40, 20, 0], y: [0, -20, 40, -20, 0] },
                durations: { x: 25, y: 33 },
                colorClass: "bg-cyan-500",
                glowColorRGB: "6, 182, 212"
              }
            ].map(orb => (
              <FloatingOrb key={orb.id} {...orb} isHovered={isHovered} />
            ))}
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-6">
             <div className="p-4 bg-white/80 dark:bg-slate-700/80 backdrop-blur-md border border-indigo-50 dark:border-indigo-900/50 rounded-2xl shadow-sm text-indigo-600 dark:text-indigo-400">
                <Server size={32} strokeWidth={1.5} />
             </div>
             <div>
               <div className="flex items-center gap-3 mb-1">
                 <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-slate-900 dark:text-slate-100">
                   {stats.system.hostname}
                 </h2>
               </div>
               <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium flex items-center gap-3 mt-2">
                 <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">{stats.system.os}</span>
                 <span className="text-slate-300 dark:text-slate-600">|</span>
                 <span className="font-mono text-slate-500 dark:text-slate-400">{stats.system.kernel}</span>
               </p>
             </div>
           </div>
           
           {/* Right Info Capsule (White Glassmorphism) */}
           <div className="flex flex-wrap gap-3">
              <HeaderBadge icon={<Clock size={14}/>} label="Uptime" value={stats.system.uptime || "--"} />
              <HeaderBadge icon={<Command size={14}/>} label="Avg Load" value={stats.system.loadAvg || 0.0} />
           </div>
        </div>
      </motion.section>

      {/* 2. Middle: Info-Rich Cards (Dynamic Waveform) */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
           <LayoutDashboard size={18} className="text-slate-400 dark:text-slate-500" />
           <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resource Overview</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            <MetricCard 
              title="CPU" 
              value={stats.cpu.load} 
              unit="%" 
              icon={<Cpu size={24} />} 
              accent="indigo"
              chartData={stats.history.cpuLoad}
              valueLabel="Load"
              footerTitle={`${stats.cpu.cores} Cores ${stats.cpu.threads} Threads`}
              footerSubTitle={stats.cpu.model}
            />
            <MetricCard 
              title="Mem" 
              value={stats.ram.total > 0 ? Math.round(stats.ram.used/stats.ram.total*100) : 0} 
              unit="%" 
              icon={<MemoryStick size={24} />} 
              accent="cyan"
              chartData={stats.history.ramLoad}
              valueLabel="Used"
              footerTitle={`${stats.ram.used}G / ${stats.ram.total}G`}
              footerSubTitle={stats.ram.type}
            />
            <DualMetricCard 
               title="GPU"
               icon={<Gpu size={24} />}
               value={stats.gpu.avgUtil} 
               chartData={stats.history.gpuLoad}
               rightTitle="VRAM Usage"
               rightValue={stats.gpu.memTotal > 0 ? Math.round(stats.gpu.memUsed/stats.gpu.memTotal*100) : 0}
               rightInfo={`${stats.gpu.memUsed}M / ${stats.gpu.memTotal}M`}
               footerTitle={stats.gpu.cuda}
               footerSubTitle={stats.gpu.name}
               bottomCards={[
                 { label: "PWR", value: `${stats.gpu.powerTotal}W`, icon: <Zap size={12}/>, color: "emerald" },
                 { label: "TMP", value: `${stats.gpu.avgTemp}°C`, icon: <Thermometer size={12}/>, color: "amber" }
               ]}
            />
            <MetricCard 
              title="Disk" 
              value={stats.disk.total > 0 ? Math.round(stats.disk.used/stats.disk.total*100) : 0} 
              unit="%" 
              icon={<HardDrive size={24} />} 
              accent="rose"
              variant="progress"
              valueLabel="Used"
              footerTitle={`Free ${((stats.disk.total - stats.disk.used)/1000).toFixed(1)}T`}
              footerSubTitle={`Total ${(stats.disk.total/1000).toFixed(1)}T`}
            />
        </div>
      </section>

      {/* 3. Bottom: Details (More Prominent Power & Fan) */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left: GPU Matrix (2/3) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Layers size={20} className="text-slate-400 dark:text-slate-500" /> 
                GPU Matrix
              </h3>
           </div>
           
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 flex-1">
              {/* Auto Responsive Grid Layout: Min Width 240px, Auto Fill */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                 {stats.gpus && stats.gpus.map((gpu) => (
                   <GPUSlotDetailed key={gpu.id} data={gpu} />
                 ))}
              </div>
           </div>
        </div>

        {/* Right: Data Distribution (1/3) */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Database size={20} className="text-slate-400 dark:text-slate-500" /> 
                Data Distribution
              </h3>
           </div>
           
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 h-full flex flex-col gap-8">
              {/* Partitions */}
              <div>
                <div className="flex justify-between items-end mb-4">
                   <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mount Points</div>
                </div>
                <div className="space-y-5">
                  {stats.disk.partitions.map((p) => {
                    const usage = p.used / p.total * 100;
                    let colorClass = 'bg-emerald-500';
                    if (usage >= 60) colorClass = 'bg-amber-500';
                    if (usage >= 85) colorClass = 'bg-rose-500';
                    
                    return (
                    <div key={p.path}>
                      <div className="flex justify-between text-sm mb-2 font-semibold">
                          <span className="text-slate-700 dark:text-slate-300">{p.label} <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">({p.path})</span></span>
                          <span className="text-slate-600 dark:text-slate-400">{Math.round(usage)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${colorClass}`} 
                            style={{width: `${usage}%`}}
                          ></div>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right font-mono">{p.used}GB / {p.total}GB</div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100 dark:bg-slate-700"></div>

              {/* User Tag Cloud */}
              <div className="flex-1">
                 <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Space Consumers</div>
                 <div className="flex flex-wrap gap-2">
                    {stats.disk.users.map((user, idx) => (
                      <div key={user.name} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-default group">
                         <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{user.name}</span>
                         <span className="text-xs font-mono text-slate-400 dark:text-slate-500 border-l border-slate-300 dark:border-slate-600 pl-2 ml-1">{user.used}G</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </section>
    </motion.div>
  );
});

export default MonitorView;
