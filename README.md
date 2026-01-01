# 🚀 LabDash - Lab Monitoring & Documentation System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![License](https://img.shields.io/badge/license-MIT-green)

A modern monitoring and documentation system for research laboratories.

**Real-time metrics • Collaborative docs • Zero dependencies • Single binary**

[Installation](#installation) • [Configuration](#configuration) • [Documentation](#documentation) • [Uninstall](#uninstall)

</div>

---

## Features

- **System Monitoring**: Real-time CPU, GPU, RAM, and disk usage with charts
- **Documentation**: Markdown docs with LaTeX math, code highlighting, and file tree
- **Multi-User**: Shared directory for lab-wide collaboration
- **Modern UI**: Glassmorphism design with smooth animations
- **Zero Dependencies**: Single binary, no external services needed

## Installation

### Quick Install

**1. Download and extract**
```bash
# Download latest release
wget https://github.com/SheepTAO/labdash/releases/latest/download/labdash-linux-amd64.tar.gz
tar -xzf labdash-linux-amd64.tar.gz
cd labdash-linux-amd64
```

**2. Run installer**
```bash
sudo ./install.sh
```

The installer will prompt for:
- **Docs directory**:
  - `~/labdash-docs` - Personal (single user)
  - `/home/labdash/docs` - Shared (all users)
- **Project name** and **Lab name**
- **Port** (default: 8088)

**3. Access dashboard**
```
http://localhost:8088
```

### Remote Access

**Via SSH Tunnel** (recommended for security):
```bash
# From your local machine
ssh -L 8088:localhost:8088 user@server

# Then open in browser
http://localhost:8088
```

This creates a secure tunnel without exposing LabDash to the internet.

### What Gets Installed

| Component | Location | Description |
|-----------|----------|-------------|
| Binary | `/usr/local/bin/labdash` | Main executable (runs as root) |
| Frontend | `/usr/share/labdash/dist/` | Static web assets |
| Config | `/etc/labdash/config.json` | Configuration file |
| Service | `/etc/systemd/system/labdash.service` | Systemd service |
| Docs | User-specified | Documentation directory |

### Service Management

```bash
sudo systemctl start labdash      # Start service
sudo systemctl stop labdash       # Stop service
sudo systemctl restart labdash    # Restart service
sudo systemctl status labdash     # Check status
sudo journalctl -u labdash -f     # View logs
```

## Configuration

Edit `/etc/labdash/config.json`:

```json
{
  "projectName": "My Lab",
  "labName": "Research Lab",
  "port": 8088,
  "docsPath": "/home/labdash/docs",
  "docsDepth": 4,
  "defaultDoc": "index.md",
  "monitor": {
    "intervalCRGSec": 2,
    "intervalDiskHours": 1,
    "idleTimeoutSec": 60,
    "idleIntervalCRGSec": 300,
    "idleIntervalDiskHours": 6,
    "historyCPU": 20,
    "historyGPU": 20,
    "historyRAM": 20
  },
  "disk": {
    "includedPartitions": {
      "/": "System",
      "/home": "User Home"
    },
    "ignoredPartitions": ["/boot", "/snap"],
    "ignoredUsers": ["lost+found"],
    "maxUsersToList": 12
  }
}
```

### Key Options

| Option | Description | Default |
|--------|-------------|---------|
| `projectName` | Project display name | "LabDash" |
| `labName` | Laboratory name | "Lab Dashboard" |
| `port` | HTTP server port | 8088 |
| `docsPath` | Documentation directory | (user-specified) |
| `docsDepth` | Max folder depth | 4 |
| `defaultDoc` | Homepage filename | "index.md" |
| `intervalCRGSec` | Monitor update (seconds) | 2 |
| `intervalDiskHours` | Disk scan (hours) | 1 |
| `idleTimeoutSec` | Idle timeout (0=never, 10-3600) | 60 |
| `idleIntervalCRGSec` | CRG interval when idle (10-600) | 300 |
| `idleIntervalDiskHours` | Disk scan when idle (0.5-48) | 6 |
| `includedPartitions` | Partitions to monitor | `{"/": "System"}` |

**Restart after editing:**
```bash
sudo systemctl restart labdash
```

### Idle Mode (Power Saving)

LabDash automatically reduces monitoring frequency when inactive to save resources:

- **Active Mode**: Normal intervals (`intervalCRGSec`, `intervalDiskHours`)
- **Idle Mode**: Reduced intervals after `idleTimeoutSec` of no API requests
  - CRG monitoring: `idleIntervalCRGSec` (e.g., 300s = 5 minutes)
  - Disk scanning: `idleIntervalDiskHours` (e.g., 6 hours)
- **Auto-resume**: Automatically returns to active mode on next connection

**Disable idle mode** (continuous monitoring):
```json
{
  "monitor": {
    "idleTimeoutSec": 0
  }
}
```

Monitor logs for state transitions:
```bash
sudo journalctl -u labdash -f | grep Monitor
```

## Documentation

### Add Markdown Files

```bash
# Shared installation
cd /home/labdash/docs
vim my-doc.md

# Personal installation
cd ~/labdash-docs
vim my-doc.md
```

### Shared Directory Structure

```
/home/labdash/
├── docs/           # Markdown docs (indexed by LabDash)
│   ├── index.md
│   ├── protocols/
│   └── experiments/
└── tools/          # Scripts, data, etc. (user-created)
    ├── preprocess.py
    └── datasets/
```

**Permissions**: `/home/labdash` uses **sticky bit (1777)** - all users can read/write, but only file owners can delete their files.

### Markdown Features

- **Syntax**: Headers, lists, links, images, tables, task lists
- **Code**: Syntax highlighting for 100+ languages
- **Math**: LaTeX equations with KaTeX (`$E=mc^2$`, `$$\int$$`)
- **Images**: Relative paths supported (`![](./images/fig.png)`)

See [index.md](templates/index.md) for detailed documentation guide.

## Development

### Prerequisites

- Go 1.25+
- Node.js 18+
- npm

### Setup

```bash
# Clone
git clone https://github.com/SheepTAO/labdash.git
cd labdash

# Install frontend deps
cd frontend
npm install

# Start backend (terminal 1)
cd backend
go run . dev  # http://localhost:8088

# Start frontend (terminal 2)
cd frontend
npm run dev   # http://localhost:5173
```

### Build Release

```bash
./scripts/build.sh v1.0.x
```

Output: `build/release/labdash-linux-amd64-1.0.x.tar.gz`

## Uninstall

Run the uninstall script from its system location:

```bash
sudo /usr/share/labdash/uninstall.sh
```

**After installation, you can safely delete the extracted installation directory.**

The uninstall script will:
1. Stop and remove systemd service
2. Delete binary and frontend assets
3. Remove uninstall script itself
4. Optionally delete config and docs (with size/count info for safety)

## Acknowledgments

- [Lucide Icons](https://lucide.dev/) - Beautiful icon set
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [React Markdown](https://github.com/remarkjs/react-markdown) - Markdown rendering
- [KaTeX](https://katex.org/) - Fast LaTeX math rendering
- [Prism](https://prismjs.com/) - Syntax highlighting

---

<div align="center">

**Made with ❤️ for research labs everywhere**

</div>
