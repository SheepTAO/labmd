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
