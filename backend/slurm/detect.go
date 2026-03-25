package slurm

import (
	"os/exec"
)

func IsAvailable() bool {
	requiredCommands := []string{"sinfo", "squeue", "scontrol"}
	for _, cmd := range requiredCommands {
		if _, err := exec.LookPath(cmd); err != nil {
			return false
		}
	}

	checkCmd := exec.Command("sinfo", "--version")
	if err := checkCmd.Run(); err != nil {
		return false
	}

	return true
}
