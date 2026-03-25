package monitor

import (
	"os/exec"
	"slices"
	"sort"
	"strconv"
	"strings"
)

const bytesToGB = 1024 * 1024 * 1024

type DiskConfig struct {
	IncludedPartitions map[string]string
	IgnoredPartitions  []string
	IgnoredUsers       []string
	MaxUsersToList     int
}

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

type DiskStats struct {
	Total      float64     `json:"total"`
	Used       float64     `json:"used"`
	Partitions []Partition `json:"partitions"`
	Users      []UserUsage `json:"users"`
}

func GetDiskUsage(config DiskConfig, skipUsers bool) DiskStats {
	stats := DiskStats{}
	stats.Partitions, stats.Total, stats.Used = getPartitions(config)
	if !skipUsers {
		stats.Users = getUserUsage(config, "/home")
	}
	return stats
}

func getPartitions(config DiskConfig) ([]Partition, float64, float64) {
	cmd := exec.Command("df", "-B1")
	out, err := cmd.Output()
	if err != nil {
		return []Partition{}, 0, 0
	}

	var parts []Partition
	var totalSystem, usedSystem float64
	targets := config.IncludedPartitions

	for _, line := range strings.Split(string(out), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}

		mount := fields[5]
		if slices.Contains(config.IgnoredPartitions, mount) {
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

			totalSystem += totalGB
			usedSystem += usedGB
		}
	}

	return parts, totalSystem, usedSystem
}

func getUserUsage(config DiskConfig, basePath string) []UserUsage {
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
		if path == basePath {
			continue
		}

		parts := strings.Split(path, "/")
		name := parts[len(parts)-1]
		if slices.Contains(config.IgnoredUsers, name) {
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

	maxList := config.MaxUsersToList
	if maxList > 0 && len(users) > maxList {
		users = users[:maxList]
	}

	return users
}

func toGB(bytes float64) float64 {
	return float64(int(bytes/bytesToGB*10)) / 10.0
}
