package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	_ "net/http/pprof"
	"os"
	"sync"
	"time"
)

var Version = "dev"
var BuildTime = "unknown"
var AllowDev = "true"

// --- Global Variables ---
var (
	dataMutex      sync.RWMutex
	globalStats    SystemStats
	lastAccessTime time.Time
	isIdle         bool
	idleMutex      sync.RWMutex
	stateChangeCh  = make(chan bool, 1) // Signal channel for immediate state check
)

// --- Data Structures ---
type SystemStats struct {
	System  SystemInfo    `json:"system"`
	CPU     CPUStats      `json:"cpu"`
	RAM     RAMStats      `json:"ram"`
	GPU     GPUStats      `json:"gpu"`
	GPUs    []GPUStatsSeq `json:"gpus"`
	Disk    DiskStats     `json:"disk"`
	History HistoryStats  `json:"history"`
	Updated string        `json:"updated"`
}

type HistoryStats struct {
	CPULoad []int `json:"cpuLoad"`
	GPULoad []int `json:"gpuLoad"`
	RAMLoad []int `json:"ramLoad"`
}

// --- Main Function ---
func main() {
	// Check command line args
	showVersion := flag.Bool("version", false, "Show version info")
	flag.Parse()

	if *showVersion {
		fmt.Println(Version)
		return
	}

	// Determine paths based on mode
	var devMode = false
	configPath := ConfigPath
	if AllowDev == "true" && len(os.Args) > 1 && os.Args[1] == "dev" {
		devMode = true
		configPath = "../dev/config.json"
		fmt.Printf("Using Dev Config Path: %s\n", configPath)
	}

	// 0. Load Config
	LoadConfig(configPath)

	fmt.Printf("Initializing %s Backend (%s)...\n", globalConfig.ProjectName, Version)
	fmt.Printf("Paths: Dist=%s, Docs=%s\n", DistPath, globalConfig.DocsPath)
	fmt.Printf("Monitor: CRG=%ds/%ds, Disk=%.1fh, Idle=%ds\n",
		globalConfig.Monitor.IntervalCRG, globalConfig.Monitor.IdleIntervalCRG,
		globalConfig.Monitor.IntervalDisk,
		globalConfig.Monitor.IdleTimeout)

	// 1. Initialize Data
	globalStats.System = GetStaticSystemInfo()
	globalStats.History = HistoryStats{
		CPULoad: make([]int, globalConfig.Monitor.HistoryCPU),
		GPULoad: make([]int, globalConfig.Monitor.HistoryGPU),
		RAMLoad: make([]int, globalConfig.Monitor.HistoryRAM),
	}
	// Initialize as active
	lastAccessTime = time.Now()
	isIdle = false

	// Cleanup NVML on exit
	defer ShutdownNVML()

	// 2. Start High-Frequency Monitoring (CRG: CPU, RAM, GPU) with adaptive interval
	go func() {
		currentInterval := time.Duration(globalConfig.Monitor.IntervalCRG) * time.Second
		ticker := time.NewTicker(currentInterval)
		defer ticker.Stop()

		checkAndUpdate := func() {
			// Determine current state based on last access time
			idleMutex.RLock()
			timeSinceAccess := time.Since(lastAccessTime)
			idleMutex.RUnlock()

			// Check if IdleTimeout is 0 (never idle)
			idleTimeout := time.Duration(globalConfig.Monitor.IdleTimeout) * time.Second
			shouldBeIdle := idleTimeout > 0 && timeSinceAccess > idleTimeout

			// Update idle state and adjust interval if needed
			idleMutex.Lock()
			wasIdle := isIdle
			isIdle = shouldBeIdle
			idleMutex.Unlock()

			// Handle state transitions
			if wasIdle != shouldBeIdle {
				if shouldBeIdle {
					fmt.Printf("[Monitor] State: Active → Idle (no activity for %ds)\n", globalConfig.Monitor.IdleTimeout)
				} else {
					fmt.Printf("[Monitor] State: Idle → Active (new connection detected)\n")
				}

				var newInterval time.Duration
				if shouldBeIdle {
					newInterval = time.Duration(globalConfig.Monitor.IdleIntervalCRG) * time.Second
				} else {
					newInterval = time.Duration(globalConfig.Monitor.IntervalCRG) * time.Second
				}

				if newInterval != currentInterval {
					fmt.Printf("[Monitor] CRG interval changed: %ds → %ds\n", int(currentInterval.Seconds()), int(newInterval.Seconds()))
					ticker.Reset(newInterval)
					currentInterval = newInterval
				}
			}

			updateRealTimeStats()
		}

		for {
			select {
			case <-ticker.C:
				// Regular periodic check
				checkAndUpdate()
			case <-stateChangeCh:
				// Immediate check triggered by external event (e.g., user access)
				checkAndUpdate()
			}
		}
	}()

	// 3. Start Low-Frequency Monitoring (Disk) - Fixed interval, not affected by idle state
	go func() {
		// Initial scan
		updateDiskStats()

		// Disk data changes slowly, use fixed interval (no idle adjustment)
		interval := time.Duration(globalConfig.Monitor.IntervalDisk * float64(time.Hour))
		fmt.Printf("[Monitor] Disk scan interval: %.1fh (fixed, no idle adjustment)\n", interval.Hours())
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			updateDiskStats()
		}
	}()

	// 4. Configure Web Routes
	http.HandleFunc("/api/stats", handleStats)
	http.HandleFunc("/api/config", handleConfig)
	http.HandleFunc("/api/docs/tree", handleDocsTree)
	http.HandleFunc("/api/docs/content", handleDocsContent)

	// 5. Configure Frontend Static Files
	// In dev mode, allow skipping frontend file check
	if devMode {
		fmt.Printf("Dev Mode: Skipping frontend file check (DistPath: %s)\n", DistPath)
	} else {
		if _, err := os.Stat(DistPath); os.IsNotExist(err) {
			fmt.Printf("[Error] Frontend directory not found '%s'\n", DistPath)
			os.Exit(1)
		}

		fs := http.FileServer(http.Dir(DistPath))
		http.Handle("/", fs)
		fmt.Printf("Frontend loaded: %s\n", DistPath)
	}

	// 6. Configure Docs File Server (Optional)
	docsPath := globalConfig.DocsPath

	if docsPath != "" {
		if _, err := os.Stat(docsPath); os.IsNotExist(err) {
			fmt.Printf("[warn] Docs directory not found: %s\n", docsPath)
		} else {
			// Mount raw docs directory (for assets/images)
			http.Handle("/raw/", http.StripPrefix("/raw/", http.FileServer(http.Dir(docsPath))))
			fmt.Printf("Raw Assets Server started: %s -> /raw/\n", docsPath)
		}
	} else {
		fmt.Printf("[warn] DocsPath not configured\n")
	}

	// 7. Start Server
	serverAddr := fmt.Sprintf(":%d", globalConfig.Port)
	fmt.Printf("Server running at: http://localhost:%d\n", globalConfig.Port)
	if err := http.ListenAndServe(serverAddr, nil); err != nil {
		fmt.Printf("Startup failed: %s\n", err)
	}
}

func updateRealTimeStats() {
	cpu := GetCPURealTime()
	ram := GetRAMRealTime()
	gpu, gpus := GetGPURealTime()

	dataMutex.Lock()
	defer dataMutex.Unlock()

	globalStats.CPU = cpu
	globalStats.RAM = ram
	globalStats.GPU = gpu
	globalStats.GPUs = gpus
	globalStats.Updated = time.Now().Format("15:04:05")
	globalStats.System.Uptime = GetUptime()
	globalStats.System.LoadAvg = GetLoadAvg()

	// Update History (FIFO Queue)
	updateHistory := func(queue []int, val int) []int {
		return append(queue[1:], val)
	}

	globalStats.History.CPULoad = updateHistory(globalStats.History.CPULoad, cpu.Load)
	globalStats.History.RAMLoad = updateHistory(globalStats.History.RAMLoad, int(ram.Used/ram.Total*100))
	globalStats.History.GPULoad = updateHistory(globalStats.History.GPULoad, gpu.AvgUtil)
}

func updateDiskStats() {
	disk := GetDiskUsage()

	dataMutex.Lock()
	defer dataMutex.Unlock()
	globalStats.Disk = disk
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	// Update last access time
	idleMutex.Lock()
	wasIdle := isIdle
	lastAccessTime = time.Now()
	idleMutex.Unlock()

	// If was idle, signal CRG goroutine to immediately check state and update
	if wasIdle {
		select {
		case stateChangeCh <- true: // Non-blocking send
		default: // Skip if channel full (update already pending)
		}
	}

	dataMutex.RLock()
	defer dataMutex.RUnlock()

	json.NewEncoder(w).Encode(globalStats)
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(globalConfig)
}
