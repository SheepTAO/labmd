package slurm

import (
	"fmt"
	"math/rand"
	"time"
)

var mockMode bool

func EnableMockMode() {
	mockMode = true
}

func PreloadMockHistory(historyIntervalMin, historyRetentionHour int) {
	_, maxPoints := historySettings(1, historyIntervalMin, historyRetentionHour)

	history := newEmptyHistory(maxPoints)
	startTime := time.Now().Add(-time.Duration(maxPoints-1) * time.Duration(historyIntervalMin) * time.Minute)

	for i := 0; i < maxPoints; i++ {
		summary := mockHistoricalSummary(i)
		timestamp := startTime.Add(time.Duration(i) * time.Duration(historyIntervalMin) * time.Minute).Format(time.RFC3339)
		history.CPU[i] = HistoryPoint{
			Timestamp: timestamp,
			Used:      summary.CPU.Used,
			Available: summary.CPU.Available,
			Total:     summary.CPU.Total,
		}
		history.Memory[i] = HistoryPoint{
			Timestamp: timestamp,
			Used:      summary.Memory.Used,
			Available: summary.Memory.Available,
			Total:     summary.Memory.Total,
		}
		history.GPU[i] = HistoryPoint{
			Timestamp: timestamp,
			Used:      summary.GPU.Used,
			Available: summary.GPU.Available,
			Total:     summary.GPU.Total,
		}
	}

	preloadHistory(history)
}

func mockResourceSummary() ResourceSummary {
	rng := rand.New(rand.NewSource(time.Now().Unix() / 15))

	totalCPU := 256
	usedCPU := 96 + rng.Intn(96)

	totalMemory := 1024 * 8
	usedMemory := 1024*2 + rng.Intn(1024*4)

	totalGPU := 16
	usedGPU := 4 + rng.Intn(8)

	return ResourceSummary{
		CPU: ResourceMetric{
			Used:      usedCPU,
			Available: totalCPU - usedCPU,
			Total:     totalCPU,
		},
		Memory: ResourceMetric{
			Used:      usedMemory,
			Available: totalMemory - usedMemory,
			Total:     totalMemory,
		},
		GPU: ResourceMetric{
			Used:      usedGPU,
			Available: totalGPU - usedGPU,
			Total:     totalGPU,
		},
	}
}

func mockHistoricalSummary(index int) ResourceSummary {
	rng := rand.New(rand.NewSource(int64(1000 + index*17)))

	totalCPU := 256
	usedCPU := 72 + rng.Intn(120)

	totalMemory := 1024 * 8
	usedMemory := 1024 + rng.Intn(1024*5)

	totalGPU := 16
	usedGPU := rng.Intn(12)

	return ResourceSummary{
		CPU: ResourceMetric{
			Used:      usedCPU,
			Available: totalCPU - usedCPU,
			Total:     totalCPU,
		},
		Memory: ResourceMetric{
			Used:      usedMemory,
			Available: totalMemory - usedMemory,
			Total:     totalMemory,
		},
		GPU: ResourceMetric{
			Used:      usedGPU,
			Available: totalGPU - usedGPU,
			Total:     totalGPU,
		},
	}
}

func mockJobs() []Job {
	rng := rand.New(rand.NewSource(time.Now().Unix() / 15))
	users := []string{"alice", "bob", "charlie", "diana", "eve"}
	partitions := []string{"gpu", "compute", "debug"}
	states := []string{"RUNNING", "PENDING", "COMPLETING"}
	reasons := []string{"node-01", "node-03", "Priority", "Resources"}

	jobs := make([]Job, 0, 6)
	for i := 0; i < 6; i++ {
		jobID := 41000 + i
		jobs = append(jobs, Job{
			ID:        fmt.Sprintf("%d", jobID),
			Name:      fmt.Sprintf("lab-job-%d", i+1),
			User:      users[rng.Intn(len(users))],
			Partition: partitions[rng.Intn(len(partitions))],
			State:     states[rng.Intn(len(states))],
			Nodes:     fmt.Sprintf("%d", 1+rng.Intn(3)),
			Time:      fmt.Sprintf("%02d:%02d:%02d", rng.Intn(12), rng.Intn(60), rng.Intn(60)),
			CPUs:      fmt.Sprintf("%d", 4*(1+rng.Intn(8))),
			GPUs:      fmt.Sprintf("%d", rng.Intn(5)),
			Memory:    fmt.Sprintf("%dG", 8*(1+rng.Intn(8))),
			Reason:    reasons[rng.Intn(len(reasons))],
		})
	}

	return jobs
}
