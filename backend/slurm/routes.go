package slurm

import (
	"encoding/json"
	"net/http"
)

type OverviewResponse struct {
	Resources ResourceSummary `json:"resources"`
	Jobs      []Job           `json:"jobs"`
}

func OverviewHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	summary, err := GetResourceSummary()
	if err != nil {
		http.Error(w, "Failed to load Slurm resources", http.StatusInternalServerError)
		return
	}

	jobs, err := GetJobs()
	if err != nil {
		http.Error(w, "Failed to load Slurm jobs", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(OverviewResponse{
		Resources: summary,
		Jobs:      jobs,
	})
}
