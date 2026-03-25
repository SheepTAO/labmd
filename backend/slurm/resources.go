package slurm

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

type ResourceMetric struct {
	Used      int `json:"used"`
	Available int `json:"available"`
	Total     int `json:"total"`
}

type ResourceSummary struct {
	CPU     ResourceMetric  `json:"cpu"`
	Memory  ResourceMetric  `json:"memory"`
	GPU     ResourceMetric  `json:"gpu"`
	History ResourceHistory `json:"history"`
}

func GetResourceSummary() (ResourceSummary, error) {
	if mockMode {
		return attachHistory(mockResourceSummary()), nil
	}

	summary := ResourceSummary{}

	cpuCmd := exec.Command("sinfo", "-h", "-o", "%C")
	cpuOut, err := cpuCmd.Output()
	if err != nil {
		return summary, err
	}

	cpuAlloc, cpuIdle, cpuOther, cpuTotal, err := parseCPUState(strings.TrimSpace(string(cpuOut)))
	if err != nil {
		return summary, err
	}

	summary.CPU = ResourceMetric{
		Used:      cpuAlloc + cpuOther,
		Available: cpuIdle,
		Total:     cpuTotal,
	}

	nodeCmd := exec.Command("scontrol", "show", "nodes", "-o")
	nodeOut, err := nodeCmd.Output()
	if err != nil {
		return summary, err
	}

	for _, line := range strings.Split(strings.TrimSpace(string(nodeOut)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		realMemory := parseIntField(line, `RealMemory=(\d+)`)
		allocMemory := parseIntField(line, `AllocMem=(\d+)`)
		totalGPU := parseGPUCount(line, `CfgTRES=([^\s]+)`)
		allocGPU := parseGPUCount(line, `AllocTRES=([^\s]+)`)
		if totalGPU == 0 {
			totalGPU = parseGresGPUCount(line, `Gres=([^\s]+)`)
		}
		if allocGPU == 0 {
			allocGPU = parseGresGPUCount(line, `GresUsed=([^\s]+)`)
		}

		summary.Memory.Total += realMemory
		summary.Memory.Used += allocMemory
		summary.GPU.Total += totalGPU
		summary.GPU.Used += allocGPU
	}

	summary.Memory.Available = max(summary.Memory.Total-summary.Memory.Used, 0)
	summary.GPU.Available = max(summary.GPU.Total-summary.GPU.Used, 0)

	return attachHistory(summary), nil
}

func parseCPUState(value string) (int, int, int, int, error) {
	parts := strings.Split(value, "/")
	if len(parts) != 4 {
		return 0, 0, 0, 0, fmt.Errorf("unexpected slurm cpu summary: %s", value)
	}

	alloc, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil {
		return 0, 0, 0, 0, err
	}
	idle, err := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err != nil {
		return 0, 0, 0, 0, err
	}
	other, err := strconv.Atoi(strings.TrimSpace(parts[2]))
	if err != nil {
		return 0, 0, 0, 0, err
	}
	total, err := strconv.Atoi(strings.TrimSpace(parts[3]))
	if err != nil {
		return 0, 0, 0, 0, err
	}

	return alloc, idle, other, total, nil
}

func parseIntField(line, pattern string) int {
	re := regexp.MustCompile(pattern)
	match := re.FindStringSubmatch(line)
	if len(match) < 2 {
		return 0
	}

	value, err := strconv.Atoi(match[1])
	if err != nil {
		return 0
	}
	return value
}

func parseGPUCount(line, pattern string) int {
	re := regexp.MustCompile(pattern)
	match := re.FindStringSubmatch(line)
	if len(match) < 2 {
		return 0
	}

	tres := strings.Split(match[1], ",")
	total := 0
	for _, item := range tres {
		if !strings.Contains(item, "gres/gpu=") {
			continue
		}

		parts := strings.SplitN(item, "=", 2)
		if len(parts) != 2 {
			continue
		}

		count, err := strconv.Atoi(parts[1])
		if err != nil {
			continue
		}
		total += count
	}

	return total
}

func parseGresGPUCount(line, pattern string) int {
	re := regexp.MustCompile(pattern)
	match := re.FindStringSubmatch(line)
	if len(match) < 2 {
		return 0
	}

	items := strings.Split(match[1], ",")
	total := 0
	for _, item := range items {
		if !strings.Contains(item, "gpu") {
			continue
		}

		parts := strings.Split(item, ":")
		if len(parts) == 0 {
			continue
		}

		last := parts[len(parts)-1]
		count, err := strconv.Atoi(last)
		if err != nil {
			continue
		}
		total += count
	}

	return total
}
