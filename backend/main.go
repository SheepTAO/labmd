package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// Global cache for heavy tasks (disk usage)
var cachedDiskInfo DiskStats

func main() {
	// 1. 初始化静态硬件信息 (CPU型号、线程数等)
	InitStaticHardwareInfo()

	// 2. 启动后台协程：定期扫描用户磁盘占用 (重型任务，每 5 分钟一次)
	go func() {
		for {
			fmt.Println("⏳ Starting background disk scan...")
			cachedDiskInfo = GetDiskUsage() // 来自 monitor_disk.go
			fmt.Println("✅ Disk scan completed.")
			time.Sleep(5 * time.Hour)
		}
	}()

	// 3. 配置 API 路由
	http.HandleFunc("/api/stats", handleStats)

	// 4. 配置静态文件服务 (前端页面)
	distPath := "../dist" // 假设 dist 在上级目录，或者你可以改为 "./dist"
	if _, err := os.Stat(distPath); !os.IsNotExist(err) {
		fs := http.FileServer(http.Dir(distPath))
		http.Handle("/", fs)
		fmt.Printf("✅ Serving frontend from %s\n", distPath)
	}

	// 5. 启动服务
	port := "8000"
	fmt.Printf("\n🚀 Hipp0 Backend running at http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Printf("Error: %s\n", err)
	}
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	// CORS header for development
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	// 获取实时数据 (CPU/RAM/GPU)
	realTimeData := GetRealTimeStats() // 来自 monitor_core.go

	// 组合数据：实时数据 + 缓存的磁盘数据
	response := struct {
		CPU     CPUStats   `json:"cpu"`
		RAM     RAMStats   `json:"ram"`
		GPUs    []GPUStats `json:"gpus"`
		Disk    DiskStats  `json:"disk"`
		Uptime  string     `json:"uptime"`
		Updated string     `json:"updated"`
	}{
		CPU:     realTimeData.CPU,
		RAM:     realTimeData.RAM,
		GPUs:    realTimeData.GPUs,
		Disk:    cachedDiskInfo, // 使用缓存的磁盘数据，防止卡顿
		Uptime:  realTimeData.Uptime,
		Updated: time.Now().Format("15:04:05"),
	}

	json.NewEncoder(w).Encode(response)
}
