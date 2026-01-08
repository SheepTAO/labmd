package main

import (
	"os/exec"
	"slices"
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
	Used float64 `json:"used"`
}

// DiskStats contains aggregated disk usage information
type DiskStats struct {
	Total      float64     `json:"total"`
	Used       float64     `json:"used"`
	Partitions []Partition `json:"partitions"`
	Users      []UserUsage `json:"users"`
}

// GetDiskUsage returns current disk usage statistics
// Scans configured partitions and user home directories
func GetDiskUsage(skipUsers bool) DiskStats {
	stats := DiskStats{}
	// Get partitions, keeping only /home (if independent) and root /
	// This avoids showing too many irrelevant tmpfs
	stats.Partitions, stats.Total, stats.Used = getPartitions()
	if !skipUsers {
		stats.Users = getUserUsage("/home")
	}
	return stats
}

// getPartitions scans file system partitions using df command
// Returns only partitions configured in includedPartitions
func getPartitions() ([]Partition, float64, float64) {
	cmd := exec.Command("df", "-B1")
	out, err := cmd.Output()
	if err != nil {
		return []Partition{}, 0, 0
	}

	var parts []Partition
	var totalSystem, usedSystem float64

	lines := strings.Split(string(out), "\n")

	// Use partition list from config
	targets := globalConfig.Disk.IncludedPartitions

	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		mount := fields[5]

		// Check if in ignore list
		isIgnored := slices.Contains(globalConfig.Disk.IgnoredPartitions, mount)
		if isIgnored {
			continue
		}

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

			// Accumulate all configured partitions to get system total
			totalSystem += totalGB
			usedSystem += usedGB
		}
	}
	return parts, totalSystem, usedSystem
}

// getUserUsage scans user home directories using du command
// Returns top users by disk usage, respecting ignoredUsers and maxUsersToList
func getUserUsage(basePath string) []UserUsage {
	cmd := exec.Command("du", "-d", "1", "-B1", basePath)
	out, err := cmd.Output()
	if err != nil {
		return []UserUsage{}
	}

	var users []UserUsage
	lines := strings.SplitSeq(string(out), "\n")

	for line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}

		sizeBytes, _ := strconv.ParseFloat(fields[0], 64)
		path := fields[1]

		parts := strings.Split(path, "/")
		name := parts[len(parts)-1]

		if path == basePath {
			continue
		}

		isIgnored := slices.Contains(globalConfig.Disk.IgnoredUsers, name)
		if isIgnored {
			continue
		}

		users = append(users, UserUsage{
			Name: name,
			Used: toGB(sizeBytes),
		})
	}

	sort.Slice(users, func(i, j int) bool {
		return users[i].Used > users[j].Used
	})

	// Use max list size from config
	maxList := globalConfig.Disk.MaxUsersToList
	if maxList > 0 && len(users) > maxList {
		users = users[:maxList]
	}

	return users
}

func toGB(bytes float64) float64 {
	return float64(int(bytes/BytesToGB*10)) / 10.0
}
