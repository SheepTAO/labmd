# Changelog

All notable changes to LabMD will be documented in this file.

## [0.1.0] - 2026-01-08

### Initial Release

First release of LabMD - Lab Monitoring & Documentation system.

### Features

**Monitoring**
- Real-time CPU, GPU (NVIDIA), RAM, and disk usage
- Historical charts with configurable length
- Adaptive idle mode to save resources
- Multi-GPU support

**Documentation**
- Markdown rendering with math (KaTeX) and syntax highlighting
- File tree navigation with folder support
- Shared or personal directory modes

**UI & Configuration**
- Modern glassmorphism design with dark/light themes
- Single binary with systemd service
- Interactive installer with upgrade support
- Fully configurable via JSON

### Technical Stack
- Backend: Go 1.25+ (standard library only)
- Frontend: React 18 + Vite + Tailwind CSS
- Dependencies: NVIDIA drivers (optional, for GPU monitoring)

---
