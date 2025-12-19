package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// --- 数据结构定义 ---

type GPUStat struct {
	ID   int    `json:"id"`
	Util int    `json:"util"`
	Mem  int    `json:"mem"`
	Temp int    `json:"temp"`
	Name string `json:"name"`
}

type RAMStat struct {
	Used  float64 `json:"used"`
	Total float64 `json:"total"`
}

type DiskStat struct {
	Path  string  `json:"path"`
	Used  float64 `json:"used"`  // GB
	Total float64 `json:"total"` // GB
	Usage int     `json:"usage"` // 百分比
}

type SystemStats struct {
	CPU     int        `json:"cpu"`
	RAM     RAMStat    `json:"ram"`
	Disk    []DiskStat `json:"disk"` // 新增：支持多个磁盘分区
	GPUs    []GPUStat  `json:"gpus"`
	Updated string     `json:"updated"`
}

// --- 核心逻辑 ---

// 1. 获取 CPU 使用率 (读取 /proc/stat)
// 注意：这里读取的是 'cpu' 行，代表所有核心的平均总负载
func getCPUUsage() int {
	readStat := func() (int, int) {
		data, err := os.ReadFile("/proc/stat")
		if err != nil {
			return 0, 0
		}
		lines := strings.Split(string(data), "\n")
		parts := strings.Fields(lines[0]) // cpu user nice system idle ...

		if len(parts) < 5 {
			return 0, 0
		}

		idle, _ := strconv.Atoi(parts[4])
		total := 0
		for _, v := range parts[1:] {
			val, _ := strconv.Atoi(v)
			total += val
		}
		return idle, total
	}

	idle1, total1 := readStat()
	time.Sleep(200 * time.Millisecond)
	idle2, total2 := readStat()

	totalDelta := float64(total2 - total1)
	idleDelta := float64(idle2 - idle1)

	if totalDelta == 0 {
		return 0
	}
	return int(100.0 * (1.0 - idleDelta/totalDelta))
}

// 2. 获取内存信息 (读取 /proc/meminfo)
// 注意：Linux 统一管理内存，这里显示的是系统总内存
func getRAMUsage() RAMStat {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return RAMStat{}
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	memStats := make(map[string]float64)

	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			key := strings.TrimSuffix(parts[0], ":")
			val, _ := strconv.ParseFloat(parts[1], 64)
			memStats[key] = val * 1024 // KB to Bytes
		}
	}

	total := memStats["MemTotal"]
	available := memStats["MemAvailable"]
	used := total - available

	return RAMStat{
		Used:  float64(int(used/(1024*1024*1024)*10)) / 10.0, // GB
		Total: float64(int(total/(1024*1024*1024)*10)) / 10.0,
	}
}

// 3. (新增) 获取磁盘使用率 (调用 df 命令)
// 我们重点监控根目录 / 和用户目录 /home (如果有挂载的话)
func getDiskUsage() []DiskStat {
	// -B1: 以字节为单位输出
	// output: 自定义输出列 (源, 大小, 已用, 可用, 百分比, 挂载点)
	// 但为了兼容性，直接用标准的 df -B1 也可以
	cmd := exec.Command("df", "-B1")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return []DiskStat{}
	}

	var disks []DiskStat
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")

	// 常见的需要监控的挂载点
	targetPaths := map[string]bool{
		"/":     true,
		"/home": true,
		"/data": true, // 假设可能有一个数据盘
	}

	for i, line := range lines {
		if i == 0 {
			continue
		} // 跳过标题行
		parts := strings.Fields(line)
		if len(parts) < 6 {
			continue
		}

		// df 输出格式: Filesystem 1B-blocks Used Available Use% Mounted on
		// parts[1]: Total, parts[2]: Used, parts[5]: Mounted on
		mountPoint := parts[len(parts)-1]

		if targetPaths[mountPoint] {
			total, _ := strconv.ParseFloat(parts[1], 64)
			used, _ := strconv.ParseFloat(parts[2], 64)

			// 转换为 GB
			totalGB := float64(int(total/(1024*1024*1024)*10)) / 10.0
			usedGB := float64(int(used/(1024*1024*1024)*10)) / 10.0

			usagePercent := 0
			if total > 0 {
				usagePercent = int((used / total) * 100)
			}

			disks = append(disks, DiskStat{
				Path:  mountPoint,
				Used:  usedGB,
				Total: totalGB,
				Usage: usagePercent,
			})
		}
	}
	return disks
}

// 4. 获取 GPU 信息 (调用 nvidia-smi)
func getGPUStats() []GPUStat {
	cmd := exec.Command("nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,name", "--format=csv,noheader,nounits")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return []GPUStat{}
	}

	var gpus []GPUStat
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")

	for i, line := range lines {
		parts := strings.Split(line, ", ")
		if len(parts) < 5 {
			continue
		}

		util, _ := strconv.Atoi(parts[0])
		memUsed, _ := strconv.Atoi(parts[1])
		memTotal, _ := strconv.Atoi(parts[2])
		temp, _ := strconv.Atoi(parts[3])
		name := parts[4]

		memPercent := 0
		if memTotal > 0 {
			memPercent = int(float64(memUsed) / float64(memTotal) * 100)
		}

		gpus = append(gpus, GPUStat{
			ID:   i,
			Util: util,
			Mem:  memPercent,
			Temp: temp,
			Name: name,
		})
	}
	return gpus
}

// --- HTTP 服务处理 ---

func statsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	stats := SystemStats{
		CPU:     getCPUUsage(),
		RAM:     getRAMUsage(),
		Disk:    getDiskUsage(), // 加入磁盘数据
		GPUs:    getGPUStats(),
		Updated: time.Now().Format("15:04:05"),
	}

	json.NewEncoder(w).Encode(stats)
}

func main() {
	http.HandleFunc("/api/stats", statsHandler)

	distPath := "./dist"
	if _, err := os.Stat(distPath); !os.IsNotExist(err) {
		fs := http.FileServer(http.Dir(distPath))
		http.Handle("/", fs)
		fmt.Println("✅ 已加载静态前端页面 (./dist)")
	} else {
		fmt.Println("⚠️ 未找到 ./dist 目录。请运行 'npm run build' 并将 dist 文件夹上传至此目录。")
		fmt.Println("   (当前仅 API 模式运行，前端请使用 'npm run dev' 调试)")
	}

	port := "8000"
	fmt.Printf("\n🚀 Hippo Wiki 服务启动中...\n")
	fmt.Printf("👉 访问地址: http://localhost:%s\n", port)

	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		fmt.Printf("启动失败: %s\n", err)
	}
}
