// Process App Config from backend
export const processConfig = (data) => ({
    projectName: data?.projectName || "LabDash",
    labName: data?.labName || "Lab Dashboard",
    version: data?.version || "version",
    intervalCRG: data?.monitor?.intervalCRGSec || 2,
    historyCPU: data?.monitor?.historyCPU ?? 20,
    historyGPU: data?.monitor?.historyGPU ?? 20,
    historyRAM: data?.monitor?.historyRAM ?? 20,
    defaultDoc: data?.defaultDoc || "index.md",
    admin: data?.admin?.name ? {
        name: data.admin.name,
        email: data.admin.email
    } : null
});

// --- Data Normalization ---
const processSystem = (data) => ({
  hostname: data?.hostname || "--",
  os: data?.os || "--",
  kernel: data?.kernel || "--",
  uptime: data?.uptime || "--",
  loadAvg: data?.loadAvg || 0.0
});

const processCpu = (data) => ({
  load: data?.load || 0,
  model: data?.model || "--",
  cores: data?.cores || 0,
  threads: data?.threads || 0
});

const processRam = (data) => ({
  used: data?.used || 0,
  total: data?.total || 0,
  type: data?.type || "--"
});

const processGpu = (data) => ({
  name: data?.name || "--",
  cuda: data?.cuda || "--",
  memTotal: data?.memTotal || 0,
  memUsed: data?.memUsed || 0,
  avgUtil: data?.avgUtil || 0,
  avgMemUtil: data?.avgMemUtil || 0,
  powerTotal: data?.powerTotal || 0,
  avgTemp: data?.avgTemp || 0,
  maxTemp: data?.maxTemp || 0
});

const processHistory = (data, config) => ({
  cpuLoad: data?.cpuLoad ? data.cpuLoad : Array(config.historyCPU).fill(0),
  gpuLoad: data?.gpuLoad ? data.gpuLoad : Array(config.historyGPU).fill(0),
  ramLoad: data?.ramLoad ? data.ramLoad : Array(config.historyRAM).fill(0)
});

const processDisk = (data) => ({
  total: data?.total || 0,
  used: data?.used || 0,
  partitions: data?.partitions || [],
  users: data?.users || []
});

// --- Process Stats from backend ---
export const processStats = (data, config) => ({
  system: processSystem(data?.system),
  cpu: processCpu(data?.cpu),
  ram: processRam(data?.ram),
  gpu: processGpu(data?.gpu),
  gpus: data?.gpus || [],
  history: processHistory(data?.history, config),
  disk: processDisk(data?.disk)
});
