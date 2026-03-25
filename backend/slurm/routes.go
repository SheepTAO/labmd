package slurm

import (
	"encoding/json"
	"net/http"
)

func ResourcesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	summary, err := GetResourceSummary()
	if err != nil {
		http.Error(w, "Failed to load Slurm resources", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(summary)
}

func JobsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	jobs, err := ListJobs()
	if err != nil {
		http.Error(w, "Failed to load Slurm jobs", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(jobs)
}
