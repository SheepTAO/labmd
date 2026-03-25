package slurm

import (
	"sync"
	"time"
)

type HistoryPoint struct {
	Timestamp string `json:"timestamp"`
	Used      int    `json:"used"`
	Available int    `json:"available"`
	Total     int    `json:"total"`
}

type ResourceHistory struct {
	CPU    []HistoryPoint `json:"cpu"`
	Memory []HistoryPoint `json:"memory"`
	GPU    []HistoryPoint `json:"gpu"`
}

var historyState = struct {
	sync.RWMutex
	sampleEvery int
	maxPoints   int
	pollCount   int
	history     ResourceHistory
}{
	sampleEvery: 1,
	maxPoints:   24,
	history:     newEmptyHistory(24),
}

func ConfigureHistory(intervalSec, historyIntervalMin, historyRetentionHour int) {
	sampleEvery := 1
	if intervalSec > 0 && historyIntervalMin > 0 {
		totalSeconds := historyIntervalMin * 60
		sampleEvery = (totalSeconds + intervalSec - 1) / intervalSec
		if sampleEvery < 1 {
			sampleEvery = 1
		}
	}

	maxPoints := 1
	if historyIntervalMin > 0 && historyRetentionHour > 0 {
		totalMinutes := historyRetentionHour * 60
		maxPoints = (totalMinutes + historyIntervalMin - 1) / historyIntervalMin
		if maxPoints < 1 {
			maxPoints = 1
		}
	}

	historyState.Lock()
	defer historyState.Unlock()
	historyState.sampleEvery = sampleEvery
	historyState.maxPoints = maxPoints
	historyState.pollCount = 0
	historyState.history = newEmptyHistory(maxPoints)
}

func preloadHistory(history ResourceHistory) {
	historyState.Lock()
	defer historyState.Unlock()

	historyState.pollCount = 0
	historyState.maxPoints = len(history.CPU)
	historyState.history = cloneHistory(history)
}

func attachHistory(summary ResourceSummary) ResourceSummary {
	historyState.Lock()
	defer historyState.Unlock()

	historyState.pollCount++
	shouldSample := historyState.pollCount >= historyState.sampleEvery
	if shouldSample {
		timestamp := time.Now().Format(time.RFC3339)
		historyState.history.CPU = pushPoint(historyState.history.CPU, summary.CPU, timestamp)
		historyState.history.Memory = pushPoint(historyState.history.Memory, summary.Memory, timestamp)
		historyState.history.GPU = pushPoint(historyState.history.GPU, summary.GPU, timestamp)
		historyState.pollCount = 0
	}

	summary.History = cloneHistory(historyState.history)
	return summary
}

func pushPoint(points []HistoryPoint, metric ResourceMetric, timestamp string) []HistoryPoint {
	if len(points) == 0 {
		return points
	}

	copy(points, points[1:])
	points[len(points)-1] = HistoryPoint{
		Timestamp: timestamp,
		Used:      metric.Used,
		Available: metric.Available,
		Total:     metric.Total,
	}
	return points
}

func newEmptyHistory(size int) ResourceHistory {
	return ResourceHistory{
		CPU:    make([]HistoryPoint, size),
		Memory: make([]HistoryPoint, size),
		GPU:    make([]HistoryPoint, size),
	}
}

func cloneHistory(history ResourceHistory) ResourceHistory {
	return ResourceHistory{
		CPU:    append([]HistoryPoint(nil), history.CPU...),
		Memory: append([]HistoryPoint(nil), history.Memory...),
		GPU:    append([]HistoryPoint(nil), history.GPU...),
	}
}
