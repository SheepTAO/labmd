# LabMD - Lab Monitoring & Documentation

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![License](https://img.shields.io/badge/license-MIT-green)

A modern monitoring and documentation system for research laboratories.

**Real-time metrics • Collaborative docs • Zero dependencies • Single binary**

[Installation](#installation) • [Configuration](#configuration) • [Documentation](#documentation) • [Uninstall](#uninstall)

</div>

---

## Features

- **System Monitoring**: Real-time CPU, GPU, RAM, and disk usage with interactive charts
- **Documentation**: Markdown docs with LaTeX math, syntax highlighting, and file tree navigation
- **Multi-User**: Shared directory for lab-wide collaboration
- **Modern UI**: Glassmorphism design with smooth animations and dark mode support
- **Theme System**: Light/Dark/Auto themes with system preference detection
- **CLI Tools**: Simple command-line interface for server management and info display
- **Adaptive Monitoring**: Automatic idle mode to reduce resource usage
- **Zero Dependencies**: Single binary, no external services needed

## Installation

### Quick Install

**1. Download and extract**
```bash
# Download latest release
wget https://github.com/SheepTAO/labmd/releases/latest/download/labmd-linux-amd64.tar.gz
tar -xzf labmd-linux-amd64.tar.gz
cd labmd-linux-amd64
```

**2. Run installer**
```bash
sudo ./install.sh
```

The installer will prompt for:
- **Docs directory**:
  - `~/labmd-docs` - Personal (single user)
  - `/home/labmd/docs` - Shared (all users)
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

This creates a secure tunnel without exposing LabMD to the internet.

### What Gets Installed

| Component | Location | Description |
|-----------|----------|-------------|
| Binary | `/usr/local/bin/labmd` | Main executable (runs as root) |
| Frontend | `/usr/share/labmd/dist/` | Static web assets |
| Config | `/etc/labmd/config.json` | Configuration file |
| Service | `/etc/systemd/system/labmd.service` | Systemd service |
| Docs | User-specified | Documentation directory |

### Service Management

```bash
sudo systemctl start labmd      # Start service
sudo systemctl stop labmd       # Stop service
sudo systemctl restart labmd    # Restart service
sudo systemctl status labmd     # Check status
sudo journalctl -u labmd -f     # View logs
```

## Upgrade

To upgrade an existing installation to a new version:

**1. Download and extract new version**
```bash
wget https://github.com/SheepTAO/labmd/releases/latest/download/labmd-linux-amd64.tar.gz
tar -xzf labmd-linux-amd64.tar.gz
cd labmd-linux-amd64-vX.X.X
```

**2. Run installer (it will auto-detect existing installation)**
```bash
sudo ./install.sh
```

The installer will:
- Show current and new version
- Display changelog link for configuration changes
- Keep your config.json completely untouched
- Only update binary and frontend files

**Configuration handling:**
- Your existing `config.json` is **never modified**
- New config fields automatically use backend defaults
- Old unused fields are safely ignored (Go's JSON parser)
- Check [CHANGELOG.md](CHANGELOG.md) for new configuration options

**What gets upgraded:**
- ✅ Binary and frontend files
- ❌ config.json (100% preserved)
- ❌ Documentation (never touched)

## Configuration

Edit `/etc/labmd/config.json`:

```json
{
  "projectName": "My Lab",
  "labName": "Research Lab",
  "port": 8088,
  "docsPath": "/home/labmd/docs",
  "monitor": {
    "intervalCRGSec": 2,
    "intervalDiskHours": 4,
    "idleTimeoutSec": 60,
    "idleIntervalCRGSec": 300
  },
  "disk": {
    "includedPartitions": {"/": "System"}
  }
}
```

### Key Options

| Option | Description | Default |
|--------|-------------|---------|
| `projectName` | Project display name | "LabMD" |
| `labName` | Laboratory name | "Lab Monitoring & Documentation" |
| `port` | HTTP server port | 8088 |
| `docsPath` | Documentation directory | (user-specified) |
| `docsDepth` | Max folder depth | 4 |
| `defaultDoc` | Homepage filename | "index.md" |
| `admin.name` | Administrator name (optional) | "" |
| `admin.email` | Administrator email (optional) | "" |
| `intervalCRGSec` | Monitor update (seconds) | 2 |
| `intervalDiskHours` | Disk scan (hours) | 4 |
| `idleTimeoutSec` | Idle timeout (0=never, 10-3600) | 60 |
| `idleIntervalCRGSec` | CRG interval when idle (10-600) | 300 |
| `includedPartitions` | Partitions to monitor | `{"/": "System"}` |

**Note**: Administrator information, if provided, will be displayed at the bottom of the interface for user support.

**Restart after editing:**
```bash
sudo systemctl restart labmd
```

### Idle Mode (Power Saving)

LabMD automatically reduces monitoring frequency when inactive to save resources:

- **Active Mode**: Normal intervals (`intervalCRGSec`)
- **Idle Mode**: Reduced CRG monitoring after `idleTimeoutSec` of no API requests
  - CRG monitoring: `idleIntervalCRGSec` (e.g., 300s = 5 minutes)
  - Disk scanning: Always uses `intervalDiskHours` (not affected by idle mode)
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
sudo journalctl -u labmd -f | grep Monitor
```

## CLI Commands

LabMD provides a simple command-line interface for management:

```bash
# Start the server
labmd server                    # Normal mode (loads frontend from dist)
labmd server --skip-frontend    # Skip frontend check (for custom frontend dev)

# Display system and configuration information
labmd --info

# Show version
labmd --version

# Show help
labmd --help
```

## Backend API

LabMD exposes the following REST APIs:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Real-time system statistics (CPU, RAM, GPU, Disk, History) |
| `/api/config` | GET | Server configuration (project name, lab name, admin info) |
| `/api/docs/tree` | GET | Documentation file tree structure |
| `/api/docs/content?path=<file>` | GET | Markdown file content |

All responses are in JSON format with CORS enabled for development.

## Documentation

### Add Markdown Files

```bash
# Shared installation
cd /home/labmd/docs
vim my-doc.md

# Personal installation
cd ~/labmd-docs
vim my-doc.md
```

### Shared Directory Structure

```
/home/labmd/
├── docs/           # Markdown docs (indexed by LabMD)
│   ├── index.md
│   ├── protocols/
│   └── experiments/
└── tools/          # Scripts, data, etc. (user-created)
    ├── preprocess.py
    └── datasets/
```

**Permissions**: `/home/labmd` uses **sticky bit (1777)** - all users can read/write, but only file owners can delete their files.

### Markdown Features

- **Syntax**: Headers, lists, links, images, tables, task lists, blockquotes
- **Code**: Syntax highlighting for 100+ languages with copy-to-clipboard
- **Math**: LaTeX equations with KaTeX (`$E=mc^2$`, `$$\int f(x)dx$$`)
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
git clone https://github.com/SheepTAO/labmd.git
cd labmd

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

Output: `build/release/labmd-linux-amd64-1.0.x.tar.gz`

## Uninstall

Run the uninstall script:

```bash
sudo /usr/share/labmd/uninstall.sh
```

The uninstall script will:
1. Stop and remove systemd service
2. Delete binary and frontend assets
3. **Automatically delete config files**
4. **Ask about documentation** (shows file count and size before deletion)

**After installation, you can safely delete the extracted installation directory.**

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
