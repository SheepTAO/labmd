import { useEffect, useRef, useState } from 'react';
import { Cpu, MemoryStick, Gpu, Rows3, Search, Users } from 'lucide-react';

const emptyResources = {
  cpu: { used: 0, available: 0, total: 0 },
  memory: { used: 0, available: 0, total: 0 },
  gpu: { used: 0, available: 0, total: 0 },
  history: { cpu: [], memory: [], gpu: [] },
};

const formatMemory = (value) => `${Math.round(value / 1024)}G`;

const EMPTY_HISTORY_POINTS = Array.from({ length: 12 }, () => ({ used: 0, available: 0, total: 0, timestamp: '' }));

const LINE_COLORS = {
  indigo: {
    available: '#6366f1',
    used: '#818cf8',
    total: '#94a3ff',
    grid: 'rgba(99, 102, 241, 0.14)',
  },
  emerald: {
    available: '#10b981',
    used: '#34d399',
    total: '#86efac',
    grid: 'rgba(16, 185, 129, 0.14)',
  },
  amber: {
    available: '#f59e0b',
    used: '#fbbf24',
    total: '#facc15',
    grid: 'rgba(245, 158, 11, 0.14)',
  },
};

const CARD_COLORS = {
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

const formatPointTime = (timestamp) => {
  if (!timestamp) {
    return 'No sample yet';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
};

const buildPolyline = (points, width, height, accessor, maxValue) => (
  points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((accessor(point) || 0) / maxValue) * height;
      return `${x},${y}`;
    })
    .join(' ')
);

const buildSummaryCards = (resources) => ([
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
    history: resources.history?.cpu || [],
    formatter: (value) => String(value),
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
    history: resources.history?.memory || [],
    formatter: (value) => formatMemory(value),
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
    history: resources.history?.gpu || [],
    formatter: (value) => String(value),
  },
]);

const ResourceTrendCard = ({ card, theme, history, formatter = (value) => String(value) }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const chartHeight = 118;
  const chartWidth = 520;
  const safeHistory = history?.length ? history : EMPTY_HISTORY_POINTS;
  const maxValue = Math.max(1, ...safeHistory.map((point) => point.total || 0));
  const hoveredPoint = hoveredIndex !== null ? safeHistory[hoveredIndex] : safeHistory[safeHistory.length - 1];
  const colors = LINE_COLORS[card.color];

  return (
    <div className={`rounded-2xl border p-5 ${theme.shell}`}>
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex items-center gap-3 shrink-0">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border shrink-0 ${theme.badge}`}>
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
            <span className="text-xl font-bold tracking-tight text-slate-500 dark:text-slate-300">{card.usedValue}</span>
            <span className="text-[8px] font-bold uppercase text-slate-500 dark:text-slate-500">{card.usedLabel}</span>
          </div>
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-xl font-bold tracking-tight text-slate-500 dark:text-slate-300">{card.totalValue}</span>
            <span className="text-[8px] font-bold uppercase text-slate-500 dark:text-slate-500">{card.totalLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 relative">
        <div className="mb-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.available }} />{card.freeLabel}</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.used }} />{card.usedLabel}</span>
        </div>

        <div className="relative h-[118px]">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="absolute inset-0 h-full w-full overflow-visible">
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                x2={chartWidth}
                y1={chartHeight * ratio}
                y2={chartHeight * ratio}
                stroke={colors.grid}
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}

            <polyline
              fill="none"
              stroke={colors.total}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 6"
              opacity="1"
              points={buildPolyline(safeHistory, chartWidth, chartHeight, (point) => point.total, maxValue)}
            />
            <polyline
              fill="none"
              stroke={colors.used}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={buildPolyline(safeHistory, chartWidth, chartHeight, (point) => point.used, maxValue)}
            />
            <polyline
              fill="none"
              stroke={colors.available}
              strokeWidth="3.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={buildPolyline(safeHistory, chartWidth, chartHeight, (point) => point.available, maxValue)}
            />

            {hoveredIndex !== null ? (() => {
              const x = safeHistory.length === 1 ? chartWidth / 2 : (hoveredIndex / (safeHistory.length - 1)) * chartWidth;
              const point = safeHistory[hoveredIndex];
              const availableY = chartHeight - ((point.available || 0) / maxValue) * chartHeight;
              return (
                <g>
                  <line x1={x} x2={x} y1="0" y2={chartHeight} stroke={colors.available} strokeOpacity="0.25" strokeWidth="1.5" />
                  <circle cx={x} cy={availableY} r="4" fill={colors.available} />
                </g>
              );
            })() : null}
          </svg>

          <div className="absolute inset-0 flex">
            {safeHistory.map((point, index) => (
              <button
                key={`${point.timestamp || 'empty'}-${index}`}
                type="button"
                aria-label={`${card.label} history point ${index + 1}`}
                className="flex-1 h-full bg-transparent"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
          </div>

          {hoveredIndex !== null ? (
            <div className="pointer-events-none absolute left-0 top-0 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-lg shadow-slate-200/70 backdrop-blur-sm dark:border-slate-500/80 dark:bg-slate-950 dark:text-slate-100 dark:shadow-black/60">
              <div className="font-semibold text-slate-700 dark:text-slate-50">{formatPointTime(hoveredPoint?.timestamp)}</div>
              <div className="mt-1 flex gap-3 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-100">{card.freeLabel}: {formatter(hoveredPoint?.available || 0)}</span>
                <span className="text-slate-500 dark:text-slate-300">{card.usedLabel}: {formatter(hoveredPoint?.used || 0)}</span>
                <span className="text-slate-500 dark:text-slate-300">{card.totalLabel}: {formatter(hoveredPoint?.total || 0)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const SlurmView = ({ config }) => {
  const [resources, setResources] = useState(emptyResources);
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');
  const tableContainerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const response = await fetch('/api/slurm/overview', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to load Slurm data');
        }

        const overview = await response.json();
        setResources(overview.resources || emptyResources);
        setJobs(overview.jobs || []);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch Slurm data:', err);
        setResources(emptyResources);
        setJobs([]);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, config.intervalSec * 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [config.intervalSec]);

  const summaryCards = buildSummaryCards(resources);

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
          <ResourceTrendCard
            key={card.label}
            card={card}
            theme={CARD_COLORS[card.color]}
            history={card.history}
            formatter={card.formatter}
          />
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
