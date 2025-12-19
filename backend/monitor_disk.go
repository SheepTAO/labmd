package main

import (
	"os/exec"
	"sort"
	"strconv"
	"strings"
)

type Partition struct {
	Path  string  `json:"path"`
	Label string  `json:"label"`
	Used  float64 `json:"used"`
	Total float64 `json:"total"`
}

type UserUsage struct {
	Name string  `json:"name"`
	Used float64 `json:"used"` // GB
}

type DiskStats struct {
	Total      float64     `json:"total"`
	Used       float64     `json:"used"`
	Partitions []Partition `json:"partitions"`
	Users      []UserUsage `json:"users"`
}

// 执行完整的磁盘扫描
func GetDiskUsage() DiskStats {
	stats := DiskStats{}

	// 1. 获取分区信息 (df)
	stats.Partitions, stats.Total, stats.Used = getPartitions()

	// 2. 获取用户目录占用 (du)
	// 警告：这个操作在有很多文件的服务器上会很慢，不要高频调用
	stats.Users = getUserUsage("/home")

	return stats
}

func getPartitions() ([]Partition, float64, float64) {
	cmd := exec.Command("df", "-B1") // Bytes
	out, err := cmd.Output()
	if err != nil {
		return []Partition{}, 0, 0
	}

	var parts []Partition
	var totalSystem, usedSystem float64

	lines := strings.Split(string(out), "\n")

	// 定义我们关心的挂载点及其显示标签
	targets := map[string]string{
		"/":     "System",
		"/home": "Users",
	}

	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		mount := fields[5]

		if label, ok := targets[mount]; ok {
			totalBytes, _ := strconv.ParseFloat(fields[1], 64)
			usedBytes, _ := strconv.ParseFloat(fields[2], 64)

			totalGB := toGB(totalBytes)
			usedGB := toGB(usedBytes)

			parts = append(parts, Partition{
				Path:  mount,
				Label: label,
				Total: totalGB,
				Used:  usedGB,
			})

			totalSystem += totalGB
			usedSystem += usedGB
		}
	}
	return parts, totalSystem, usedSystem
}

func getUserUsage(basePath string) []UserUsage {
	// 使用 du -s /home/* 命令
	// 注意：这需要 backend 运行用户有读取 /home 下其他用户目录的权限 (通常需要 root)
	// 如果没有权限，只能看到自己的或报错。
	cmd := exec.Command("du", "-s", "-B1", basePath+"/*")
	// 为了防止通配符无法展开，实际上最好用 shell 运行，或者列出目录再 du
	// 这里用更安全的方式：列出目录 -> 循环 du (或者直接 du -d 1)

	// 修正：使用 du -d 1 -B1 /home
	cmd = exec.Command("du", "-d", "1", "-B1", basePath)
	out, err := cmd.Output()
	if err != nil {
		return []UserUsage{}
	}

	var users []UserUsage
	lines := strings.Split(string(out), "\n")

	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}

		sizeBytes, _ := strconv.ParseFloat(fields[0], 64)
		path := fields[1]

		// 获取用户名 (路径的最后一部分)
		parts := strings.Split(path, "/")
		name := parts[len(parts)-1]

		if path == basePath {
			continue
		} // 跳过汇总行 /home

		users = append(users, UserUsage{
			Name: name,
			Used: toGB(sizeBytes),
		})
	}

	// 排序：按使用量从大到小
	sort.Slice(users, func(i, j int) bool {
		return users[i].Used > users[j].Used
	})

	// 只取前 10 名
	if len(users) > 10 {
		users = users[:10]
	}

	return users
}

func toGB(bytes float64) float64 {
	return float64(int(bytes/(1024*1024*1024)*10)) / 10.0
}
