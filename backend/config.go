package main

import (
	"encoding/json"
	"log"
	"os"
)

type Config struct {
	ProjectName string `json:"projectName"`
	LabName     string `json:"labName"`
	Port        int    `json:"port"`       // Server port
	DocsPath    string `json:"docsPath"`   // User configurable source doc
	DocsDepth   int    `json:"docsDepth"`  // Max depth for docs tree
	DefaultDoc  string `json:"defaultDoc"` // Default document to load as homepage
	Version     string `json:"version"`    // Labdash version
	Admin       struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"admin"`
	Monitor struct {
		IntervalCRG     int     `json:"intervalCRGSec"`     // CPU, RAM, GPU (seconds)
		IntervalDisk    float64 `json:"intervalDiskHours"`  // Disk (hours)
		IdleTimeout     int     `json:"idleTimeoutSec"`     // Idle mode timeout (seconds)
		IdleIntervalCRG int     `json:"idleIntervalCRGSec"` // CRG interval when idle (seconds)
		HistoryCPU      int     `json:"historyCPU"`
		HistoryGPU      int     `json:"historyGPU"`
		HistoryRAM      int     `json:"historyRAM"`
	} `json:"monitor"`
	Disk struct {
		IncludedPartitions map[string]string `json:"includedPartitions"` // Path -> Label
		IgnoredPartitions  []string          `json:"ignoredPartitions"`
		IgnoredUsers       []string          `json:"ignoredUsers"`
		MaxUsersToList     int               `json:"maxUsersToList"`
	} `json:"disk"`
}

var globalConfig Config

func LoadConfig(configPath string) {
	// 1. Set Default Values
	globalConfig.ProjectName = "LabDash"
	globalConfig.LabName = "Lab Dashboard"
	globalConfig.Port = 8088                     // Default port 8088
	globalConfig.DocsPath = "/home/labdash/docs" // Default docs folder
	globalConfig.DocsDepth = 4                   // Default depth 4
	globalConfig.DefaultDoc = "index.md"         // Default homepage
	globalConfig.Admin.Name = ""
	globalConfig.Admin.Email = ""
	globalConfig.Version = Version

	// Monitor defaults
	globalConfig.Monitor.IntervalCRG = 2  // 2 seconds
	globalConfig.Monitor.IntervalDisk = 4 // 4 hours
	// Idle mode: reduces monitoring frequency when inactive to save resources
	globalConfig.Monitor.IdleTimeout = 60      // 60 seconds idle timeout (0 = never idle)
	globalConfig.Monitor.IdleIntervalCRG = 300 // 300 seconds when idle
	globalConfig.Monitor.HistoryCPU = 20
	globalConfig.Monitor.HistoryGPU = 20
	globalConfig.Monitor.HistoryRAM = 20
	// Disk defaults
	globalConfig.Disk.IncludedPartitions = map[string]string{
		"/":     "System Root",
		"/home": "User Home",
	}
	globalConfig.Disk.IgnoredUsers = []string{"lost+found"}
	globalConfig.Disk.MaxUsersToList = 12

	// 2. Try to read config file
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Printf("[WARN] Config file not found at %s, using defaults", configPath)
		return
	}

	file, err := os.ReadFile(configPath)
	if err != nil {
		log.Printf("[WARN] Failed to read config file: %v, using defaults", err)
		return
	}

	// 3. Parse JSON
	err = json.Unmarshal(file, &globalConfig)
	if err != nil {
		log.Printf("[ERROR] Failed to parse config file: %v, using defaults", err)
		return
	}

	// 4. Validate and apply constraints
	validateInt := func(name string, value *int, min, max int) {
		if *value <= min {
			log.Printf("[WARN] %s (%d) too small, using minimum %d", name, *value, min)
			*value = min
		} else if *value >= max {
			log.Printf("[WARN] %s (%d) too large, using maximum %d", name, *value, max)
			*value = max
		}
	}

	validateFloat := func(name string, value *float64, min, max float64) {
		if *value <= min {
			log.Printf("[WARN] %s (%.2f) too small, using minimum %.2f", name, *value, min)
			*value = min
		} else if *value > max {
			log.Printf("[WARN] %s (%.2f) too large, using maximum %.2f", name, *value, max)
			*value = max
		}
	}

	// Monitor intervals
	validateInt("IntervalCRG", &globalConfig.Monitor.IntervalCRG, 1, 60)
	validateFloat("IntervalDisk", &globalConfig.Monitor.IntervalDisk, 0.1, 24)

	// Idle timeout
	if globalConfig.Monitor.IdleTimeout < 10 {
		log.Printf("[WARN] IdleTimeout (%d) cannot be < 10, using 0 (never idle)", globalConfig.Monitor.IdleTimeout)
		globalConfig.Monitor.IdleTimeout = 0
	} else {
		validateInt("IdleTimeout", &globalConfig.Monitor.IdleTimeout, 10, 3600)
	}
	validateInt("IdleIntervalCRG", &globalConfig.Monitor.IdleIntervalCRG, 10, 600)

	// History sizes
	validateInt("HistoryCPU", &globalConfig.Monitor.HistoryCPU, 5, 100)
	validateInt("HistoryGPU", &globalConfig.Monitor.HistoryGPU, 5, 100)
	validateInt("HistoryRAM", &globalConfig.Monitor.HistoryRAM, 5, 100)

	// Disk config
	validateInt("MaxUsersToList", &globalConfig.Disk.MaxUsersToList, 1, 50)
}
