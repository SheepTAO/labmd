package slurm

import (
	"os/exec"
	"strings"
	"sync"
)

type Job struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	User      string `json:"user"`
	Partition string `json:"partition"`
	State     string `json:"state"`
	Nodes     string `json:"nodes"`
	Time      string `json:"time"`
	CPUs      string `json:"cpus"`
	GPUs      string `json:"gpus"`
	Memory    string `json:"memory"`
	Reason    string `json:"reason"`
}

var jobState = struct {
	sync.RWMutex
	jobs  []Job
	ready bool
}{}

func GetJobs() ([]Job, error) {
	jobState.RLock()
	if jobState.ready {
		jobs := cloneJobs(jobState.jobs)
		jobState.RUnlock()
		return jobs, nil
	}
	jobState.RUnlock()

	if err := UpdateJobs(); err != nil {
		return nil, err
	}

	jobState.RLock()
	defer jobState.RUnlock()
	return cloneJobs(jobState.jobs), nil
}

func UpdateJobs() error {
	jobs, err := collectJobs()
	if err != nil {
		return err
	}

	jobState.Lock()
	jobState.jobs = cloneJobs(jobs)
	jobState.ready = true
	jobState.Unlock()
	return nil
}

func collectJobs() ([]Job, error) {
	if mockMode {
		return mockJobs(), nil
	}

	cmd := exec.Command(
		"squeue",
		"-h",
		"-o",
		"%i|%j|%u|%P|%T|%D|%M|%C|%b|%m|%R",
	)

	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	jobs := make([]Job, 0)
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) < 11 {
			continue
		}

		jobs = append(jobs, Job{
			ID:        parts[0],
			Name:      parts[1],
			User:      parts[2],
			Partition: parts[3],
			State:     parts[4],
			Nodes:     parts[5],
			Time:      parts[6],
			CPUs:      parts[7],
			GPUs:      parts[8],
			Memory:    parts[9],
			Reason:    parts[10],
		})
	}

	return jobs, nil
}

func cloneJobs(jobs []Job) []Job {
	return append([]Job(nil), jobs...)
}
