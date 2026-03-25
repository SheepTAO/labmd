package monitor

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/NVIDIA/go-nvml/pkg/nvml"
)

const (
	bytesToMB        = 1024 * 1024
	kbToGB           = bytesToMB
	cpuSampleInterval = 200 * time.Millisecond
)

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

type GPUStatsSeq struct {
	ID       int    `json:"id"`
	Util     int    `json:"util"`
	MemUtil  int    `json:"memUtil"`
	MemUsed  int    `json:"memUsed"`
	MemTotal int    `json:"memTotal"`
	Temp     int    `json:"temp"`
	Power    int    `json:"power"`
	Fan      int    `json:"fan"`
	Name     string `json:"name"`
}

type GPUStats struct {
	Name       string `json:"name"`
	CUDA       string `json:"cuda"`
	MemTotal   int    `json:"memTotal"`
	MemUsed    int    `json:"memUsed"`
	AvgUtil    int    `json:"avgUtil"`
	AvgMemUtil int    `json:"avgMemUtil"`
	PowerTotal int    `json:"powerTotal"`
	AvgTemp    int    `json:"avgTemp"`
	MaxTemp    int    `json:"maxTemp"`
}

var (
	staticCPUInfo CPUStats
	staticGPUInfo GPUStats

	cpuInfoLoaded bool
	gpuInfoLoaded bool

	nvmlInitialized bool
	nvmlAvailable   bool
	nvmlDeviceCount int
)

func GetCPURealTime() CPUStats {
	if !cpuInfoLoaded {
		loadStaticCPUInfo()
		cpuInfoLoaded = true
	}

	stats := staticCPUInfo
	stats.Load = calculateCPULoad()
	return stats
}

func loadStaticCPUInfo() {
	staticCPUInfo.Model = "Unknown CPU"
	staticCPUInfo.Cores = 0
	staticCPUInfo.Threads = 0

	data, err := os.ReadFile("/proc/cpuinfo")
	if err != nil {
		return
	}

	lines := strings.Split(string(data), "\n")
	sockets := make(map[string]bool)
	modelName := ""
	coresPerSocket := 0
	threadCount := 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "processor") {
			threadCount++
		}
		if strings.HasPrefix(line, "model name") {
			parts := strings.Split(line, ":")
			if len(parts) > 1 {
				modelName = strings.TrimSpace(parts[1])
			}
		}
		if strings.HasPrefix(line, "physical id") {
			parts := strings.Split(line, ":")
			if len(parts) > 1 {
				sockets[strings.TrimSpace(parts[1])] = true
			}
		}
		if strings.HasPrefix(line, "cpu cores") {
			parts := strings.Split(line, ":")
			if len(parts) > 1 {
				val, _ := strconv.Atoi(strings.TrimSpace(parts[1]))
				if val > coresPerSocket {
					coresPerSocket = val
				}
			}
		}
	}

	numSockets := len(sockets)
	if numSockets == 0 {
		numSockets = 1
	}

	if coresPerSocket > 0 {
		staticCPUInfo.Cores = numSockets * coresPerSocket
	} else {
		staticCPUInfo.Cores = threadCount / 2
	}

	staticCPUInfo.Threads = threadCount

	if numSockets > 1 {
		staticCPUInfo.Model = fmt.Sprintf("%dx %s", numSockets, modelName)
	} else {
		staticCPUInfo.Model = modelName
	}
}

func calculateCPULoad() int {
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

	idle1, total1 := readStat()
	time.Sleep(cpuSampleInterval)
	idle2, total2 := readStat()

	totalDelta := float64(total2 - total1)
	idleDelta := float64(idle2 - idle1)

	if totalDelta > 0 {
		return int(100.0 * (1.0 - idleDelta/totalDelta))
	}
	return 0
}

func GetRAMRealTime() RAMStats {
	var ram RAMStats
	ram.Type = "DDR4 2933 MT/s"

	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return ram
	}
	defer file.Close()

	content, _ := io.ReadAll(file)

	parseMem := func(key string) float64 {
		str := string(content)
		idx := strings.Index(str, key)
		if idx == -1 {
			return 0
		}
		line := str[idx:]
		end := strings.Index(line, "\n")
		fields := strings.Fields(line[:end])
		if len(fields) < 2 {
			return 0
		}
		val, _ := strconv.ParseFloat(fields[1], 64)
		return val
	}

	total := parseMem("MemTotal:")
	available := parseMem("MemAvailable:")
	used := total - available

	ram.Total = float64(int(total/kbToGB*10)) / 10.0
	ram.Used = float64(int(used/kbToGB*10)) / 10.0
	return ram
}

func initNVML() {
	if nvmlInitialized {
		return
	}
	nvmlInitialized = true

	ret := nvml.Init()
	if ret != nvml.SUCCESS {
		log.Printf("[WARN] NVML init failed: %v, using nvidia-smi fallback", nvml.ErrorString(ret))
		nvmlAvailable = false
		return
	}

	count, ret := nvml.DeviceGetCount()
	if ret != nvml.SUCCESS {
		log.Printf("[WARN] NVML device count failed: %v, using nvidia-smi fallback", nvml.ErrorString(ret))
		nvml.Shutdown()
		nvmlAvailable = false
		return
	}

	nvmlDeviceCount = count
	nvmlAvailable = true
	log.Printf("NVML initialized: %d GPU(s) detected", count)
}

func ShutdownNVML() {
	if nvmlAvailable {
		nvml.Shutdown()
	}
}

func GetGPURealTime() (GPUStats, []GPUStatsSeq) {
	initNVML()
	if nvmlAvailable {
		return getGPUStatsNVML()
	}
	return getGPUStatsNvidiaSMI()
}

func getGPUStatsNVML() (GPUStats, []GPUStatsSeq) {
	if nvmlDeviceCount == 0 {
		return GPUStats{}, []GPUStatsSeq{}
	}

	gpus := make([]GPUStatsSeq, 0, nvmlDeviceCount)
	var memTotal, memUsed, utilTotal, memUtilTotal, tempTotal, powerTotal, maxTemp int

	for i := 0; i < nvmlDeviceCount; i++ {
		dev, _ := nvml.DeviceGetHandleByIndex(i)

		name, _ := dev.GetName()
		util, _ := dev.GetUtilizationRates()
		mem, _ := dev.GetMemoryInfo()
		temp, _ := dev.GetTemperature(nvml.TEMPERATURE_GPU)
		power, _ := dev.GetPowerUsage()
		fan, _ := dev.GetFanSpeed()

		memTotalMB := int(mem.Total / bytesToMB)
		memUsedMB := int(mem.Used / bytesToMB)
		powerW := int(power / 1000)

		gpus = append(gpus, GPUStatsSeq{
			ID:       i,
			Util:     int(util.Gpu),
			MemUtil:  int(util.Memory),
			MemUsed:  memUsedMB,
			MemTotal: memTotalMB,
			Temp:     int(temp),
			Power:    powerW,
			Fan:      int(fan),
			Name:     name,
		})

		memTotal += memTotalMB
		utilTotal += int(util.Gpu)
		memUtilTotal += int(util.Memory)
		memUsed += memUsedMB
		powerTotal += powerW
		tempTotal += int(temp)

		if int(temp) > maxTemp {
			maxTemp = int(temp)
		}
	}

	if !gpuInfoLoaded {
		staticGPUInfo.MemTotal = memTotal
		staticGPUInfo.Name = generateGPUDisplayName(gpus)
		staticGPUInfo.CUDA = getCUDAVersionNVML()
		gpuInfoLoaded = true
	}

	stats := staticGPUInfo
	stats.AvgUtil = utilTotal / nvmlDeviceCount
	stats.AvgMemUtil = memUtilTotal / nvmlDeviceCount
	stats.AvgTemp = tempTotal / nvmlDeviceCount
	stats.MemUsed = memUsed
	stats.PowerTotal = powerTotal
	stats.MaxTemp = maxTemp

	return stats, gpus
}

func getGPUStatsNvidiaSMI() (GPUStats, []GPUStatsSeq) {
	cmd := exec.Command(
		"nvidia-smi",
		"--query-gpu=index,name,memory.total,temperature.gpu,utilization.gpu,utilization.memory,memory.used,power.draw,fan.speed",
		"--format=csv,noheader,nounits",
	)

	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return GPUStats{}, []GPUStatsSeq{}
	}

	gpus := make([]GPUStatsSeq, 0, 8)
	var memTotal, memUsed, utilTotal, memUtilTotal, tempTotal, powerTotal, maxTemp int

	for _, line := range strings.Split(strings.TrimSpace(out.String()), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		parts := strings.Split(line, ", ")
		if len(parts) < 9 {
			continue
		}

		idx, _ := strconv.Atoi(parts[0])
		name := parts[1]
		memTotalMB, _ := strconv.Atoi(parts[2])
		temp, _ := strconv.Atoi(parts[3])
		util, _ := strconv.Atoi(parts[4])
		memUtil, _ := strconv.Atoi(parts[5])
		memUsedMB, _ := strconv.Atoi(parts[6])
		powerFloat, _ := strconv.ParseFloat(parts[7], 64)
		power := int(powerFloat)
		fan, _ := strconv.Atoi(parts[8])

		gpus = append(gpus, GPUStatsSeq{
			ID:       idx,
			Util:     util,
			MemUtil:  memUtil,
			MemUsed:  memUsedMB,
			MemTotal: memTotalMB,
			Temp:     temp,
			Power:    power,
			Fan:      fan,
			Name:     name,
		})

		memTotal += memTotalMB
		utilTotal += util
		memUtilTotal += memUtil
		memUsed += memUsedMB
		powerTotal += power
		tempTotal += temp

		if temp > maxTemp {
			maxTemp = temp
		}
	}

	if len(gpus) == 0 {
		return GPUStats{}, []GPUStatsSeq{}
	}

	if !gpuInfoLoaded {
		staticGPUInfo.MemTotal = memTotal
		staticGPUInfo.Name = generateGPUDisplayName(gpus)
		staticGPUInfo.CUDA = getCUDAVersionNvidiaSMI()
		gpuInfoLoaded = true
	}

	stats := staticGPUInfo
	stats.AvgUtil = utilTotal / len(gpus)
	stats.AvgMemUtil = memUtilTotal / len(gpus)
	stats.AvgTemp = tempTotal / len(gpus)
	stats.MemUsed = memUsed
	stats.PowerTotal = powerTotal
	stats.MaxTemp = maxTemp

	return stats, gpus
}

func getCUDAVersionNvidiaSMI() string {
	cmd := exec.Command("nvidia-smi")
	out, err := cmd.Output()
	if err != nil {
		return "--"
	}

	re := regexp.MustCompile(`CUDA Version:\s*([0-9.]+)`)
	match := re.FindStringSubmatch(string(out))
	if len(match) >= 2 {
		return "CUDA " + match[1]
	}
	return "--"
}

func getCUDAVersionNVML() string {
	cudaVersion, ret := nvml.SystemGetCudaDriverVersion()
	if ret != nvml.SUCCESS {
		return "--"
	}

	major := cudaVersion / 1000
	minor := (cudaVersion % 1000) / 10
	return fmt.Sprintf("CUDA %d.%d", major, minor)
}

func generateGPUDisplayName(gpus []GPUStatsSeq) string {
	if len(gpus) == 0 {
		return "No GPU"
	}

	nameCounts := make(map[string]int)
	var maxMem int
	var maxMemName string

	for _, gpu := range gpus {
		nameCounts[gpu.Name]++
		if gpu.MemTotal > maxMem {
			maxMem = gpu.MemTotal
			maxMemName = gpu.Name
		}
	}

	if len(nameCounts) == 1 {
		var name string
		for k := range nameCounts {
			name = k
		}
		if len(gpus) > 1 {
			return fmt.Sprintf("%dx %s", len(gpus), name)
		}
		return name
	}

	return fmt.Sprintf("%s ...", maxMemName)
}
