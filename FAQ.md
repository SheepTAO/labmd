# LabDash FAQ

## GPU Monitoring

### Why use NVML instead of nvidia-smi?

When GPU drivers fail, `nvidia-smi` writes error logs every 2 seconds, potentially filling disk space with GB/day.

**NVML Solution**:
- Reports error once during initialization, then fails silently (no logs)
- Automatically falls back to nvidia-smi when NVML is unavailable

```bash
# Normal startup
[info] NVML initialized: 2 GPU(s) detected

# Driver failure (shown once only)
[info] NVML init failed: Driver/library version mismatch, using nvidia-smi fallback
```

---

## Idle Mode

Automatically reduces monitoring frequency to save resources.

**Configuration Example**:
```json
{
  "monitor": {
    "intervalCRGSec": 2,        // Active: every 2 seconds
    "idleTimeoutSec": 60,       // Enter idle after 60s of inactivity
    "idleIntervalCRGSec": 300   // Idle: every 5 minutes
  }
}
```

**Disable Idle Mode**:
```json
{"monitor": {"idleTimeoutSec": 0}}
```

---

## Remote Access

### How to access LabDash remotely?

**Recommended: SSH Tunnel** (no firewall configuration needed)

```bash
# On your local machine
ssh -L 8088:localhost:8088 user@server

# Open in browser
http://localhost:8088
```

---

## Troubleshooting

### Service won't start?

```bash
# Check service status
sudo systemctl status labdash

# View logs
sudo journalctl -u labdash -f

# Common causes:
# 1. Port already in use
# 2. Config file syntax error
# 3. Docs directory not found
```

### GPU not showing?

```bash
# Test nvidia-smi
nvidia-smi

# Check driver version
nvidia-smi --query-gpu=driver_version --format=csv

# NVML will auto-fallback, won't affect other features
```

---

## Help

- **View logs**: `sudo journalctl -u labdash -f`
- **Config file**: `/etc/labdash/config.json`
- **Documentation**: [README.md](README.md)
