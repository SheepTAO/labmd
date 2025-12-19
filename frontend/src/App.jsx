import React, { useState, useEffect } from 'react';
import { 
  Cpu, Activity, Zap, BookOpen, 
  Shield, Database, LayoutDashboard, 
  HardDrive, Box, Clock,
  Server, Layers, Terminal, Network, Command,
  Sparkles, Fan, Thermometer, MemoryStick, CircuitBoard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. 模拟数据 ---
const generateMockData = () => {
  return {
    system: {
      hostname: "hipp0-node",
      os: "Ubuntu 22.04 LTS",
      kernel: "5.15.0-91-generic",
      ip: "10.0.1.15",
      uptime: "14d 02h 15m"
    },
    uptime: "14d 02h 15m",
    cpu: {
      load: Math.floor(Math.random() * 30) + 10,
      model: "AMD EPYC 7742",
      cores: 64,
      threads: 128,
    },
    ram: { used: 128, total: 512, type: "DDR4 ECC" },
    disk: {
      total: 12000, 
      used: 4500,
      partitions: [
        { path: '/', used: 50, total: 500, label: "System" },
        { path: '/home', used: 1200, total: 4000, label: "Users" },
        { path: '/data', used: 3250, total: 7500, label: "Datasets" },
      ],
      users: [ 
        { name: 'wuwei', used: 450 },
        { name: 'student_a', used: 320 },
        { name: 'student_b', used: 180 },
        { name: 'guest', used: 50 },
        { name: 'new_user', used: 10 },
      ]
    },
    updated: new Date().toLocaleTimeString(),
    gpus: Array.from({ length: 8 }).map((_, i) => ({ 
      id: i,
      util: Math.floor(Math.random() * 100),
      memUtil: Math.floor(Math.random() * 80),
      memUsed: Math.floor(Math.random() * 24), 
      memTotal: 24, // L20 应该是 24GB 或 48GB，这里模拟 24G
      temp: Math.floor(Math.random() * 30) + 40,
      power: Math.floor(Math.random() * 150) + 50, 
      fan: Math.floor(Math.random() * 50) + 30 // L20 是被动散热，这个值通常是机箱风扇转速映射
    }))
  };
};

const App = () => {
  const [activeTab, setActiveTab] = useState('monitor');
  const [stats, setStats] = useState(generateMockData());
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:8000/api/stats' 
          : '/api/stats';
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        // 数据适配
        if (typeof data.cpu === 'number') {
           data.cpu = { load: data.cpu, model: "AMD EPYC 7742", cores: 64, threads: 128 };
        }
        if (data.gpus) {
            data.gpus = data.gpus.map(g => ({
                ...g,
                memUtil: g.mem, 
                memUsed: Math.round(g.mem * 0.8), // 简单估算
                memTotal: 24,
                power: g.power || 150,
                fan: g.fan || 30
            }));
        }
        if (!data.disk.partitions) {
            data.disk = { 
                total: 1000, used: 500, 
                partitions: data.disk || [], 
                users: [{name: 'admin', used: 100}] 
            };
        }
        if (!data.system) {
            data.system = { 
              hostname: "hipp0-node", 
              os: "Ubuntu 22.04 LTS", 
              kernel: "5.15.0-generic", 
              ip: "192.168.1.10", 
              uptime: data.uptime || "Unknown" 
            };
        }

        setStats(data);
        setIsLive(true);
      } catch (err) {
        setIsLive(false);
        setStats(generateMockData());
      }
    };
    const timer = setInterval(fetchData, 2000);
    fetchData(); 
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* 侧边栏 */}
      <aside className="w-72 bg-white/80 border-r border-slate-100 flex flex-col fixed h-full z-30 hidden xl:flex backdrop-blur-sm">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <Box size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-slate-900 tracking-tight leading-none">Hipp0</h1>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 block">Wuwei Lab</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
             <div className={`px-4 py-3 rounded-xl border flex items-center justify-between ${isLive ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-amber-50/50 border-amber-100 text-amber-700'}`}>
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                   {isLive ? 'System Online' : 'Reconnecting'}
                </span>
                <Activity size={14} />
             </div>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2">
          <div className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</div>
          <NavItem 
            icon={<LayoutDashboard />} 
            label="Monitor Dashboard" 
            active={activeTab === 'monitor'} 
            onClick={() => setActiveTab('monitor')} 
          />
          <NavItem 
            icon={<BookOpen />} 
            label="Lab Wiki & Docs" 
            active={activeTab === 'wiki'} 
            onClick={() => setActiveTab('wiki')} 
          />
        </nav>

        <div className="p-6 border-t border-slate-100 mx-6">
           <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
             <Shield size={12} className="text-indigo-500"/> 
             <span>Protected by FireWall</span>
           </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 xl:ml-72 p-4 md:p-8 lg:p-12 overflow-y-auto bg-slate-50/50">
        <div className="max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'monitor' ? (
              <MonitorView stats={stats} key="monitor" />
            ) : (
              <WikiView key="wiki" />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// --- 核心监控视图 ---
const MonitorView = ({ stats }) => {
  const avgGpuUtil = stats.gpus && stats.gpus.length > 0
    ? Math.round(stats.gpus.reduce((acc, curr) => acc + curr.util, 0) / stats.gpus.length)
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* 1. Top: Hero Header (白色背景 + 动态渐变圆球) */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm p-8 group">
        
        {/* 动态背景光晕 (Floating Orbs) */}
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-200/40 blur-[80px] rounded-full pointer-events-none"
        />
        <motion.div 
          animate={{ x: [0, -30, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-40 w-72 h-72 bg-purple-200/40 blur-[80px] rounded-full pointer-events-none"
        />
        <motion.div 
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-100/50 blur-[80px] rounded-full pointer-events-none"
        />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-6">
             <div className="p-4 bg-white/80 backdrop-blur-md border border-indigo-50 rounded-2xl shadow-sm text-indigo-600">
                <Server size={32} strokeWidth={1.5} />
             </div>
             <div>
               <div className="flex items-center gap-3 mb-1">
                 <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-slate-900">
                   {stats.system ? stats.system.hostname : "Hipp0-Node"}
                 </h2>
                 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider">
                   Active
                 </span>
               </div>
               <p className="text-slate-500 text-sm md:text-base font-medium flex items-center gap-3 mt-2">
                 <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{stats.system ? stats.system.os : "Linux"}</span>
                 <span className="text-slate-300">|</span>
                 <span className="font-mono text-slate-500">{stats.system ? stats.system.ip : "127.0.0.1"}</span>
               </p>
             </div>
           </div>
           
           {/* 右侧信息胶囊 (白色玻璃态) */}
           <div className="flex flex-wrap gap-3">
              <HeaderBadge icon={<Clock size={14}/>} label="Uptime" value={stats.uptime || "Unknown"} />
              <HeaderBadge icon={<Command size={14}/>} label="Avg Load" value="2.45" />
           </div>
        </div>
      </section>

      {/* 2. Middle: Info-Rich Cards (动态波形图) */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
           <LayoutDashboard size={18} className="text-slate-400" />
           <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Resource Overview</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard 
              title="CPU Load" 
              value={stats.cpu.load} 
              unit="%" 
              icon={<Cpu size={24} />} 
              accent="indigo"
              chartData={Array.from({length: 10}, () => Math.floor(Math.random() * 40) + stats.cpu.load - 20)}
              details={`${stats.cpu.threads} Threads`}
              subDetails={(stats.cpu.model || "Unknown CPU").replace("Processor", "")}
            />
            <MetricCard 
              title="GPU Avg" 
              value={avgGpuUtil} 
              unit="%" 
              // 图标修改：CircuitBoard 代替 Zap
              icon={<CircuitBoard size={24} />} 
              accent="violet"
              chartData={Array.from({length: 10}, () => Math.floor(Math.random() * 40) + avgGpuUtil - 20)}
              details={`${stats.gpus ? stats.gpus.length : 0} x L20`}
              subDetails="NVIDIA Data Center GPU"
            />
            <MetricCard 
              title="Memory" 
              value={Math.round(stats.ram.used/stats.ram.total*100)} 
              unit="%" 
              // 图标修改：MemoryStick 代替 Database
              icon={<MemoryStick size={24} />} 
              accent="cyan"
              chartData={Array.from({length: 10}, () => Math.floor(Math.random() * 10) + (stats.ram.used/stats.ram.total*100) - 5)}
              details={`${stats.ram.used}G / ${stats.ram.total}G`}
              subDetails="DDR4 ECC Registered"
            />
            <MetricCard 
              title="Storage" 
              value={Math.round(stats.disk.used/stats.disk.total*100)} 
              unit="%" 
              icon={<HardDrive size={24} />} 
              accent="rose"
              chartData={[40, 40, 41, 41, 41, 42, 42, 42, 42, Math.round(stats.disk.used/stats.disk.total*100)]}
              details={`${(stats.disk.used/1000).toFixed(1)}T / ${(stats.disk.total/1000).toFixed(1)}T`}
              subDetails="NVMe RAID Array"
            />
        </div>
      </section>

      {/* 3. Bottom: Details (更醒目的功耗与风扇) */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* 左侧: GPU Matrix (2/3) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Layers size={20} className="text-slate-400" /> 
                GPU Matrix
              </h3>
              <span className="text-xs font-mono font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                NVIDIA L20
              </span>
           </div>
           
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/40 flex-1">
              {/* 紧凑型 Grid 布局 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                 {stats.gpus && stats.gpus.map((gpu) => (
                   <GPUSlotDetailed key={gpu.id} data={gpu} />
                 ))}
              </div>
           </div>
        </div>

        {/* 右侧: Data Distribution (1/3) */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <HardDrive size={20} className="text-slate-400" /> 
                Data Distribution
              </h3>
           </div>
           
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/40 h-full flex flex-col gap-8">
              {/* Partitions */}
              <div>
                <div className="flex justify-between items-end mb-4">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mount Points</div>
                </div>
                <div className="space-y-5">
                  {stats.disk.partitions.map((p) => (
                    <div key={p.path}>
                      <div className="flex justify-between text-sm mb-2 font-semibold">
                          <span className="text-slate-700">{p.label} <span className="text-slate-400 font-normal ml-1">({p.path})</span></span>
                          <span className="text-slate-600">{Math.round(p.used/p.total*100)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${p.path === '/' ? 'bg-indigo-500' : p.path === '/data' ? 'bg-violet-500' : 'bg-rose-500'}`} 
                            style={{width: `${p.used/p.total*100}%`}}
                          ></div>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 text-right font-mono">{p.used}GB / {p.total}GB</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full h-px bg-slate-100"></div>

              {/* User Tag Cloud */}
              <div className="flex-1">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Space Consumers</div>
                 <div className="flex flex-wrap gap-2">
                    {stats.disk.users.map((user, idx) => (
                      <div key={user.name} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:bg-white hover:shadow-md hover:border-indigo-200 transition-all cursor-default group">
                         <div className={`w-2 h-2 rounded-full ${idx < 3 ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                         <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700">{user.name}</span>
                         <span className="text-xs font-mono text-slate-400 border-l border-slate-300 pl-2 ml-1">{user.used}G</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </section>
    </motion.div>
  );
};

// --- 组件: 头部信息徽章 (透明玻璃态) ---
const HeaderBadge = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-xl px-4 py-2 shadow-sm">
     <div className="text-indigo-500 opacity-80">{icon}</div>
     <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider opacity-70 leading-none mb-0.5">{label}</div>
        <div className="text-sm font-bold text-slate-700 leading-none font-mono">{value}</div>
     </div>
  </div>
);

// --- 组件: 增强版指标卡片 (动态波形) ---
const MetricCard = ({ title, value, unit, icon, accent, details, subDetails, chartData }) => {
  const accents = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    violet: "text-violet-600 bg-violet-50 border-violet-100",
    cyan: "text-cyan-600 bg-cyan-50 border-cyan-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
  };
  const theme = accents[accent];
  
  // 动态颜色：根据数值变色
  const getValueColor = (val) => {
     if (val < 60) return 'text-slate-800'; 
     if (val < 85) return 'text-amber-600'; 
     return 'text-rose-600'; 
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-48 justify-between relative overflow-hidden group">
      
      <div className="flex justify-between items-start relative z-10">
        <div className={`p-3 rounded-2xl ${theme}`}>
          {icon}
        </div>
        <div className="text-right">
            <span className={`text-4xl font-black tracking-tighter leading-none ${getValueColor(value)}`}>{value}</span>
            <span className="text-sm font-bold text-slate-400 ml-1">{unit}</span>
        </div>
      </div>
      
      {/* 动态波形图 (Simulated Live Activity) */}
      <div className="flex items-end gap-1 h-10 mt-2 opacity-60 relative z-10">
         {chartData.map((h, i) => {
            const barHeight = Math.max(10, Math.min(100, h));
            return (
              <motion.div 
                key={i}
                initial={{ height: `${barHeight}%` }}
                animate={{ height: [`${barHeight}%`, `${Math.max(10, barHeight + (Math.random() * 20 - 10))}%`, `${barHeight}%`] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                className={`flex-1 rounded-t-sm ${i === chartData.length - 1 ? 'bg-indigo-500' : 'bg-slate-200'}`} 
              />
            );
         })}
      </div>

      <div className="relative z-10 border-t border-slate-100 pt-3">
        <div className="text-sm font-bold text-slate-700 truncate">{details}</div>
        <div className="text-xs font-medium text-slate-400 truncate">{subDetails}</div>
      </div>
    </div>
  );
};

// --- 组件: GPU Slot (紧凑优化 + 新图标) ---
const GPUSlotDetailed = ({ data }) => {
  const getColor = (val) => {
    if (val < 40) return 'bg-emerald-400';
    if (val < 80) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  return (
    // 紧凑化调整: rounded-2xl -> rounded-xl, p-4 -> p-3
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:bg-white transition-all group relative overflow-hidden">
      {/* Header mb-3 -> mb-2 */}
      <div className="flex justify-between items-center mb-2 relative z-10">
         <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">#{data.id}</span>
            <span className={`w-2 h-2 rounded-full ${data.util > 0 ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
         </div>
         <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 group-hover:border-indigo-200 flex items-center gap-1">
            <Thermometer size={10} /> {data.temp}°C
         </span>
      </div>
      
      {/* Stats Grid space-y-3 -> space-y-2 */}
      <div className="space-y-2 relative z-10">
         
         {/* Core Util */}
         <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Core Load</span>
                <span className="text-xs font-black text-slate-700">{data.util}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
               <div className={`h-full rounded-full transition-all duration-500 ${getColor(data.util)}`} style={{width: `${data.util}%`}}></div>
            </div>
         </div>

         {/* Memory Util */}
         <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">VRAM <span className="text-slate-300 font-normal">({data.memUsed}G)</span></span>
                <span className="text-xs font-bold text-slate-600">{data.memUtil}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-400 rounded-full transition-all duration-500" style={{width: `${data.memUtil}%`}}></div>
            </div>
         </div>

         {/* Extra Info Row: 增强显示 + pt-2 -> pt-1.5 */}
         <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 mt-2">
             {/* Power */}
             <div className="flex flex-col items-start bg-amber-50/50 p-1.5 rounded border border-amber-100/50" title="Power Usage">
                <span className="text-[9px] font-bold text-amber-400 uppercase flex items-center gap-1"><Zap size={8} fill="currentColor" /> PWR</span>
                <span className="text-xs font-mono font-bold text-slate-700">{data.power}W</span>
             </div>
             {/* Fan */}
             <div className="flex flex-col items-start bg-blue-50/50 p-1.5 rounded border border-blue-100/50" title="Fan Speed">
                <span className="text-[9px] font-bold text-blue-400 uppercase flex items-center gap-1"><Fan size={8} className="animate-spin" /> FAN</span>
                <span className="text-xs font-mono font-bold text-slate-700">{data.fan}%</span>
             </div>
         </div>
      </div>
    </div>
  );
};

// --- Side Nav Item ---
const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm ${
      active 
        ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-200' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    {React.cloneElement(icon, { size: 18 })}
    {label}
  </button>
);

// --- Wiki View ---
const WikiView = () => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm"
  >
    <h2 className="text-2xl font-bold text-slate-900 mb-4">Documentation</h2>
    <p className="text-slate-500">Wiki content goes here...</p>
  </motion.div>
);

export default App;