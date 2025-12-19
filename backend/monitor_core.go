package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// --- 数据结构 ---

type CPUStats struct {
	Load    int    `json:"load"`
	Model   string `json:"model"`
	Cores   int    `json:"cores"`
	Threads int    `json:"threads"`
}

type RAMStats struct {
	Used  float64 `json:"used"`
	Total float64 `json:"total"`
	Type  string  `json:"type"`
}

type GPUStats struct {
	ID       int    `json:"id"`
	Util     int    `json:"util"`
	MemUtil  int    `json:"memUtil"`  // 百分比
	MemUsed  int    `json:"memUsed"`  // GB
	MemTotal int    `json:"memTotal"` // GB
	Temp     int    `json:"temp"`
	Power    int    `json:"power"` // Watts
	Fan      int    `json:"fan"`   // %
	Name     string `json:"name"`
}

type RealTimeData struct {
	CPU    CPUStats
	RAM    RAMStats
	GPUs   []GPUStats
	Uptime string
}

// 静态变量缓存 (CPU型号等不会变的信息)
var staticCPU CPUStats
var sysStartTime time.Time

func InitStaticHardwareInfo() {
	// 读取 /proc/uptime 获取真实的系统启动时间
	uptimeData, err := os.ReadFile("/proc/uptime")
	if err == nil {
		parts := strings.Fields(string(uptimeData))
		if len(parts) > 0 {
			uptimeSeconds, _ := strconv.ParseFloat(parts[0], 64)
			sysStartTime = time.Now().Add(-time.Duration(uptimeSeconds) * time.Second)
		}
	} else {
		sysStartTime = time.Now() // 备用方案
	}

	// 读取 /proc/cpuinfo 获取型号和线程数
	staticCPU.Model = "Unknown CPU"
	staticCPU.Cores = 1
	staticCPU.Threads = 1

	data, err := os.ReadFile("/proc/cpuinfo")
	if err == nil {
		lines := strings.Split(string(data), "\n")
		threadCount := 0
		for _, line := range lines {
			if strings.HasPrefix(line, "model name") {
				parts := strings.Split(line, ":")
				if len(parts) > 1 {
					staticCPU.Model = strings.TrimSpace(parts[1])
				}
			}
			if strings.HasPrefix(line, "processor") {
				threadCount++
			}
		}
		if threadCount > 0 {
			staticCPU.Threads = threadCount
			staticCPU.Cores = threadCount / 2 // 粗略估算物理核数
		}
	}
}

// 获取实时数据
func GetRealTimeStats() RealTimeData {
	return RealTimeData{
		CPU:    getCPURealTime(),
		RAM:    getRAMRealTime(),
		GPUs:   getGPURealTime(),
		Uptime: getUptime(),
	}
}

func getCPURealTime() CPUStats {
	// 读取 /proc/stat 计算负载
	cpu := staticCPU // 复制静态信息

	readStat := func() (int, int) {
		data, _ := os.ReadFile("/proc/stat")
		lines := strings.Split(string(data), "\n")
		if len(lines) == 0 {
			return 0, 0
		}
		parts := strings.Fields(lines[0])
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

	i1, t1 := readStat()
	time.Sleep(100 * time.Millisecond) // 采样间隔
	i2, t2 := readStat()

	totalDelta := float64(t2 - t1)
	idleDelta := float64(i2 - i1)
	if totalDelta > 0 {
		cpu.Load = int(100.0 * (1.0 - idleDelta/totalDelta))
	}
	return cpu
}

func getRAMRealTime() RAMStats {
	var ram RAMStats
	ram.Type = "DDR4 ECC" // 无法直接通过文件获取，通常硬编码或通过 dmidecode

	file, _ := os.Open("/proc/meminfo")
	defer file.Close()

	// 简单的解析逻辑
	// os.Open 返回的 *os.File 实现了 io.Reader 接口
	scanner, _ := io.ReadAll(file) // 读取全部（小文件）
	content := string(scanner)

	// Helper to parse KB
	parseMem := func(key string) float64 {
		idx := strings.Index(content, key)
		if idx == -1 {
			return 0
		}
		line := content[idx:]
		end := strings.Index(line, "\n")
		fields := strings.Fields(line[:end])
		if len(fields) < 2 {
			return 0
		}
		val, _ := strconv.ParseFloat(fields[1], 64)
		return val * 1024 // Bytes
	}

	total := parseMem("MemTotal:")
	available := parseMem("MemAvailable:")
	used := total - available

	ram.Total = float64(int(total/(1024*1024*1024)*10)) / 10.0 // GB
	ram.Used = float64(int(used/(1024*1024*1024)*10)) / 10.0   // GB
	return ram
}

func getGPURealTime() []GPUStats {
	// 更新后的 nvidia-smi 命令，包含功耗和风扇
	cmd := exec.Command("nvidia-smi", "--query-gpu=index,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,fan.speed,name", "--format=csv,noheader,nounits")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return []GPUStats{}
	}

	var gpus []GPUStats
	lines := strings.SplitSeq(strings.TrimSpace(out.String()), "\n")
	for line := range lines {
		parts := strings.Split(line, ", ")
		if len(parts) < 8 {
			continue
		}

		idx, _ := strconv.Atoi(parts[0])
		util, _ := strconv.Atoi(parts[1])
		memUsedMB, _ := strconv.Atoi(parts[2])
		memTotalMB, _ := strconv.Atoi(parts[3])
		temp, _ := strconv.Atoi(parts[4])
		power, _ := strconv.ParseFloat(parts[5], 64)
		fan, _ := strconv.Atoi(parts[6])
		name := parts[7]

		memUtil := 0
		if memTotalMB > 0 {
			memUtil = int(float64(memUsedMB) / float64(memTotalMB) * 100)
		}

		gpus = append(gpus, GPUStats{
			ID:       idx,
			Util:     util,
			MemUtil:  memUtil,
			MemUsed:  memUsedMB / 1024,  // GB
			MemTotal: memTotalMB / 1024, // GB
			Temp:     temp,
			Power:    int(power),
			Fan:      fan,
			Name:     name,
		})
	}
	return gpus
}

func getUptime() string {
	data, _ := os.ReadFile("/proc/uptime")
	parts := strings.Fields(string(data))
	if len(parts) > 0 {
		seconds, _ := strconv.ParseFloat(parts[0], 64)
		days := int(seconds) / 86400
		hours := int(seconds) % 86400 / 3600
		return fmt.Sprintf("%dd %02dh", days, hours)
	}
	return "Unknown"
}
