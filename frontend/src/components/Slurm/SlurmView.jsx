import { useEffect, useRef, useState } from 'react';
import { Cpu, MemoryStick, Gpu, Rows3, Search, Users } from 'lucide-react';

const emptyResources = {
  cpu: { used: 0, available: 0, total: 0 },
  memory: { used: 0, available: 0, total: 0 },
  gpu: { used: 0, available: 0, total: 0 },
};

const formatMemory = (value) => {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(0)}G`;
  }
  return `${value}M`;
};

const getStateClasses = (state) => {
  const normalized = (state || '').toUpperCase();

  if (normalized.includes('RUN')) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  if (normalized.includes('PEND')) {
    return 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/60';
  }
  if (normalized.includes('COMP')) {
    return 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800/60';
  }
  if (normalized.includes('FAIL') || normalized.includes('CANCEL') || normalized.includes('TIMEOUT')) {
    return 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/60';
  }

  return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600/70';
};

const compareJobsById = (a, b) => {
  const aID = Number.parseInt(a.id, 10);
  const bID = Number.parseInt(b.id, 10);
  if (Number.isNaN(aID) || Number.isNaN(bID)) {
    return String(a.id).localeCompare(String(b.id));
  }
  return aID - bID;
};

const SlurmView = ({ config }) => {
  const [resources, setResources] = useState(emptyResources);
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const tableContainerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [resourcesRes, jobsRes] = await Promise.all([
          fetch('/api/slurm/resources'),
          fetch('/api/slurm/jobs'),
        ]);

        if (!resourcesRes.ok || !jobsRes.ok) {
          throw new Error('Failed to load Slurm data');
        }

        const [resourcesData, jobsData] = await Promise.all([
          resourcesRes.json(),
          jobsRes.json(),
        ]);

        if (!cancelled) {
          setResources(resourcesData);
          setJobs(jobsData);
        }
      } catch (err) {
        console.error('Failed to fetch Slurm data:', err);
        if (!cancelled) {
          setResources(emptyResources);
          setJobs([]);
        }
      }
    };

    fetchData();
    const timer = setInterval(fetchData, config.intervalSec * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [config.intervalSec]);

  const summaryCards = [
    {
      label: 'CPU',
      freeValue: resources.cpu.available,
      freeLabel: 'Idle',
      usedValue: resources.cpu.used,
      usedLabel: 'Used',
      totalValue: resources.cpu.total,
      totalLabel: 'Total',
      icon: <Cpu size={24} />,
      color: 'indigo',
    },
    {
      label: 'MEM',
      freeValue: formatMemory(resources.memory.available),
      freeLabel: 'Free',
      usedValue: formatMemory(resources.memory.used),
      usedLabel: 'Used',
      totalValue: formatMemory(resources.memory.total),
      totalLabel: 'Total',
      icon: <MemoryStick size={24} />,
      color: 'emerald',
    },
    {
      label: 'GPU',
      freeValue: resources.gpu.available,
      freeLabel: 'Idle',
      usedValue: resources.gpu.used,
      usedLabel: 'Used',
      totalValue: resources.gpu.total,
      totalLabel: 'Total',
      icon: <Gpu size={24} />,
      color: 'amber',
    },
  ];

  const cardColors = {
    indigo: {
      shell: 'bg-indigo-50/80 border-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-700/55 dark:text-indigo-400 shadow-md shadow-indigo-100/60 dark:shadow-slate-950/30',
      badge: 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-700/55',
    },
    emerald: {
      shell: 'bg-emerald-50/80 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-700/55 dark:text-emerald-400 shadow-md shadow-emerald-100/60 dark:shadow-slate-950/30',
      badge: 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-700/55',
    },
    amber: {
      shell: 'bg-amber-50/80 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-700/55 dark:text-amber-400 shadow-md shadow-amber-100/60 dark:shadow-slate-950/30',
      badge: 'bg-white dark:bg-slate-800 border-amber-100 dark:border-amber-700/55',
    },
  };

  const filteredJobs = jobs
    .filter((job) => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) {
        return true;
      }
      return job.name.toLowerCase().includes(normalizedQuery) || job.user.toLowerCase().includes(normalizedQuery);
    })
    .sort(compareJobsById);

  const tableMaxHeight = `${Math.max(config.defaultJobs, 1) * 49 + 52}px`;
  const tableHeight = filteredJobs.length > config.defaultJobs ? tableMaxHeight : 'auto';

  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [query, jobs]);

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-8">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${cardColors[card.color].shell}`}>
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex items-center gap-3 shrink-0">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border shrink-0 ${cardColors[card.color].badge}`}>
                  {card.icon}
                </div>
                <div className="text-lg font-extrabold uppercase">{card.label}</div>
              </div>

              <div className="flex-1" />

              <div className="flex items-baseline gap-4 shrink-0">
                <div className="flex items-baseline gap-2 whitespace-nowrap">
                  <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">{card.freeValue}</span>
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">{card.freeLabel}</span>
                </div>
                <div className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-1xl font-bold tracking-tight text-slate-500 dark:text-slate-300">{card.usedValue}</span>
                  <span className="text-[8px] font-bold uppercase text-slate-500 dark:text-slate-500">{card.usedLabel}</span>
                </div>
                <div className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-1xl font-bold tracking-tight text-slate-500 dark:text-slate-300">{card.totalValue}</span>
                  <span className="text-[8px] font-bold uppercase text-slate-500 dark:text-slate-500">{card.totalLabel}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-600/70 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-600/70 bg-white dark:bg-slate-800 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Rows3 size={18} className="text-slate-400 dark:text-slate-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Job Queue</h3>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-2 ml-2">
              <Users size={14} />
              {`${filteredJobs.length} jobs`}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:ml-auto">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by job name or user"
                className="w-full sm:w-56 rounded-xl border border-slate-200 dark:border-slate-600/70 bg-slate-50 dark:bg-slate-900/50 pl-10 pr-4 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-300 dark:focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div
          ref={tableContainerRef}
          className="overflow-y-auto overflow-x-auto bg-white dark:bg-slate-800"
          style={{ height: tableHeight, maxHeight: tableMaxHeight }}
        >
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-300">
              <tr>
                {['Job ID', 'Name', 'User', 'Partition', 'State', 'Nodes', 'Time', 'CPUs', 'GPUs', 'Memory', 'Reason / Nodes'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left font-bold whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    No matching Slurm jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="border-t border-slate-100 dark:border-slate-600/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{job.id}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 min-w-[320px] whitespace-nowrap">{job.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.user}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.partition}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getStateClasses(job.state)}`}>
                        {job.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.nodes}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.time}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.cpus}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.gpus || '--'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{job.memory}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{job.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SlurmView;
