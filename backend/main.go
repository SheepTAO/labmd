package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
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
	flag.Usage = func() {
		fmt.Fprintf(flag.CommandLine.Output(), `LabMD - Lab Monitoring & Documentation

Usage:
  labmd <command>

Commands:
  server       Start the LabMD server
  info         Display configuration and system information
  version      Show version information
  help         Show this help message

Version: %s
Build Time: %s
`, Version, BuildTime)
	}

	if len(os.Args) < 2 {
		flag.Usage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "server":
		serverCmd := flag.NewFlagSet("server", flag.ExitOnError)
		skipFrontend := serverCmd.Bool("skip-frontend", false, "Skip frontend directory check (for local frontend development)")
		serverCmd.Usage = func() {
			fmt.Fprintf(serverCmd.Output(), "Usage: labmd server [options]\n\nStart the LabMD server\n\nOptions:\n")
			serverCmd.PrintDefaults()
		}
		serverCmd.Parse(os.Args[2:])
		LoadConfig(ConfigPath)
		runServer(*skipFrontend)

	case "info":
		infoCmd := flag.NewFlagSet("info", flag.ExitOnError)
		infoCmd.Usage = func() {
			fmt.Fprintf(infoCmd.Output(), "Usage: labmd info\n\nDisplay configuration and system information\n")
		}
		infoCmd.Parse(os.Args[2:])
		showInfo()

	case "version":
		versionCmd := flag.NewFlagSet("version", flag.ExitOnError)
		versionCmd.Usage = func() {
			fmt.Fprintf(versionCmd.Output(), "Usage: labmd version\n\nShow version information\n")
		}
		versionCmd.Parse(os.Args[2:])
		fmt.Println(Version)

	case "dev":
		if AllowDev != "true" {
			fmt.Fprintf(os.Stderr, "Unknown command: %s\n\n", os.Args[1])
			flag.Usage()
			os.Exit(1)
		}
		devCmd := flag.NewFlagSet("dev", flag.ExitOnError)
		devCmd.Parse(os.Args[2:])
		startServerDev()

	case "help", "-h", "--help":
		flag.Usage()

	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n\n", os.Args[1])
		flag.Usage()
		os.Exit(1)
	}
}

func showInfo() {
	log.SetOutput(io.Discard)
	LoadConfig(ConfigPath)

	fmt.Printf("=== LabMD Configuration ===\n")
	fmt.Printf("Version:        %s\n", Version)
	fmt.Printf("Build Time:     %s\n", BuildTime)
	fmt.Printf("Project Name:   %s\n", globalConfig.ProjectName)
	fmt.Printf("Lab Name:       %s\n", globalConfig.LabName)

	fmt.Printf("=== Paths ===\n")
	fmt.Printf("Config:         %s\n", ConfigPath)
	fmt.Printf("Frontend Dist:  %s\n", DistPath)
	fmt.Printf("Documentation:  %s\n", globalConfig.DocsPath)

	fmt.Printf("=== Monitor Settings ===\n")
	fmt.Printf("CRG Interval:   %ds (Active) / %ds (Idle)\n",
		globalConfig.Monitor.IntervalCRG, globalConfig.Monitor.IdleIntervalCRG)
	fmt.Printf("Disk Interval:  %.1fh\n", globalConfig.Monitor.IntervalDisk)
	fmt.Printf("Idle Timeout:   %ds\n", globalConfig.Monitor.IdleTimeout)
	fmt.Printf("History Size:   CPU=%d, GPU=%d, RAM=%d\n",
		globalConfig.Monitor.HistoryCPU, globalConfig.Monitor.HistoryGPU, globalConfig.Monitor.HistoryRAM)

	fmt.Printf("=== System Overview ===\n")
	sys := GetStaticSystemInfo()
	fmt.Printf("Hostname:     %s\n", sys.Hostname)
	fmt.Printf("OS:           %s\n", sys.OS)
	fmt.Printf("Kernel:       %s\n", sys.Kernel)

	cpu := GetCPURealTime()
	if cpu.Model != "" {
		fmt.Printf("CPU:          %s\n", cpu.Model)
		fmt.Printf("CPU Cores:    %d cores / %d threads\n", cpu.Cores, cpu.Threads)
	}

	ram := GetRAMRealTime()
	fmt.Printf("RAM:          %.1fGB\n", ram.Total)

	gpu, _ := GetGPURealTime()
	if gpu.Name != "" && gpu.Name != "No GPU" {
		fmt.Printf("GPU:          %s\n", gpu.Name)
		fmt.Printf("GPU Memory:   %dMB\n", gpu.MemTotal)
		fmt.Printf("CUDA:         %s\n", gpu.CUDA)
	}

	disk := GetDiskUsage(true)
	if disk.Total > 0 {
		fmt.Printf("Disk:         %.2fTB / %.2fTB (%.1f%%)\n",
			float64(disk.Used)/1000, float64(disk.Total)/1000,
			float64(disk.Used)/float64(disk.Total)*100)
	}
}

func startServerDev() {
	fmt.Println("Starting in Dev Mode...")
	configPath := "../dev/config.json"
	log.Printf("Using Dev Config Path: %s", configPath)
	LoadConfig(configPath)
	runServer(true)
}

func runServer(skipFrontendCheck bool) {

	log.Printf("Initializing %s Backend (%s)...", globalConfig.ProjectName, Version)
	log.Printf("Paths: Dist=%s, Docs=%s", DistPath, globalConfig.DocsPath)
	log.Printf("Monitor: CRG=%ds/%ds, Disk=%.1fh, Idle=%ds",
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
					log.Printf("Monitor state: Active → Idle (no activity for %ds)", globalConfig.Monitor.IdleTimeout)
				} else {
					log.Printf("Monitor state: Idle → Active (new connection detected)")
				}

				var newInterval time.Duration
				if shouldBeIdle {
					newInterval = time.Duration(globalConfig.Monitor.IdleIntervalCRG) * time.Second
				} else {
					newInterval = time.Duration(globalConfig.Monitor.IntervalCRG) * time.Second
				}

				if newInterval != currentInterval {
					log.Printf("Monitor CRG interval changed: %ds → %ds", int(currentInterval.Seconds()), int(newInterval.Seconds()))
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
		log.Printf("Monitor disk scan interval: %.1fh (fixed, no idle adjustment)", interval.Hours())
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
	if skipFrontendCheck {
		log.Printf("Skipping frontend directory check (use local frontend on different port)")
	} else {
		if _, err := os.Stat(DistPath); os.IsNotExist(err) {
			log.Fatalf("[ERROR] Frontend directory not found: %s", DistPath)
		}

		fs := http.FileServer(http.Dir(DistPath))
		http.Handle("/", fs)
		log.Printf("Frontend loaded: %s", DistPath)
	}

	// 6. Configure Docs File Server (Optional)
	docsPath := globalConfig.DocsPath

	if docsPath != "" {
		if _, err := os.Stat(docsPath); os.IsNotExist(err) {
			log.Printf("[WARN] Docs directory not found: %s", docsPath)
		} else {
			// Mount raw docs directory (for assets/images)
			http.Handle("/raw/", http.StripPrefix("/raw/", http.FileServer(http.Dir(docsPath))))
			log.Printf("Raw Assets Server started: %s -> /raw/", docsPath)
		}
	} else {
		log.Printf("[WARN] DocsPath not configured")
	}

	// 7. Start Server
	serverAddr := fmt.Sprintf(":%d", globalConfig.Port)
	log.Printf("Server running at: http://localhost:%d", globalConfig.Port)
	if err := http.ListenAndServe(serverAddr, nil); err != nil {
		log.Fatalf("[ERROR] Server startup failed: %v", err)
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
	disk := GetDiskUsage(false)

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
