package main

import "time"

// Memory conversion constants
const (
	BytesToMB = 1024 * 1024        // Bytes to MB
	KBToGB    = BytesToMB          // KB to GB
	BytesToGB = 1024 * 1024 * 1024 // Bytes to GB
)

// CPU sampling interval
const CPUSampleInterval = 200 * time.Millisecond

// Projection paths
const (
	ConfigPath = "/etc/labmd/config.json"
	DistPath   = "/usr/share/labmd/dist"
)
