# Welcome to LabMD

Welcome to your lab monitoring and documentation system!

## Getting Started

LabMD provides real-time system monitoring and a powerful documentation system for your lab environment.

### Features

- **Real-time Monitoring**: Track CPU, GPU, RAM, and disk usage with adaptive idle mode for power saving
- **Documentation System**: Organize your lab documentation, protocols, and notes with Markdown
- **Beautiful UI**: Modern glassmorphism design with smooth animations
- **Math Support**: Write equations with KaTeX (inline: $E=mc^2$, block: $$\int_0^\infty e^{-x^2} dx$$)
- **Code Highlighting**: Syntax highlighting for 100+ programming languages
- **File Tree**: Hierarchical navigation with nested folders
- **Idle Mode**: Automatically reduces monitoring frequency when no one is viewing to save resources

## Quick Start

### 1. View System Stats
Click **"Monitor Dashboard"** to see real-time metrics:
- CPU load and usage percentage
- GPU utilization and memory (NVIDIA GPUs)
- Memory consumption
- Disk space by partition
- User home directory sizes

**Smart Monitoring:**
- Active mode: Updates every 2 seconds when you're viewing
- Idle mode: Reduces to 5-minute intervals after 60 seconds of inactivity
- Instant wake: Returns to active mode when you access the page

### 2. Add Documentation
Create Markdown files in your documentation directory:

```bash
# Personal installation
cd ~/labmd-docs

# Shared installation
cd /home/labmd/docs

# Create new doc
vim my-protocol.md
```

Files will be automatically indexed and displayed in the sidebar.

### 3. Organize with Folders
Create folders to organize your docs:

```bash
mkdir experiments
mkdir protocols
mkdir notes
```

LabMD supports nested folders up to the configured depth (default: 4 levels).

## File Sharing (Shared Installation Only)

If you installed LabMD with the shared directory option (`/home/labmd/docs`), all users can read and write files:

### How It Works
- **Directory**: `/home/labmd/docs` (and entire `/home/labmd/`)
- **Permissions**: `1777` (sticky bit enabled)
- **Owner**: `labmd:labmd`
- **Access**: All users can read/write, but only file owners can delete their files

### File Permissions Best Practices

**Files are automatically shareable:**
```bash
# Create a file in /home/labmd/docs
touch /home/labmd/docs/new-doc.md
# Everyone can read it
```

**To make a file read-only:**
```bash
chmod 644 /home/labmd/docs/readonly-doc.md
# Owner can write, others can only read
```

**Share files from your home directory:**
```bash
cp ~/my-research.md /home/labmd/docs/
# File becomes accessible to everyone
```

**Sticky bit protection:**
- Only the file owner can delete their own files
- Others can read/write but cannot delete

### Collaboration Workflow
1. **Upload**: Copy files to `/home/labmd/docs` - automatically accessible to all
2. **Edit**: Use any editor (vim, nano, VSCode) directly
3. **Download**: Copy to your home directory - `cp /home/labmd/docs/file.md ~/`

## Markdown Features

### Supported Syntax
- **Headers**: `# H1`, `## H2`, etc.
- **Lists**: Unordered (`-`, `*`) and ordered (`1.`, `2.`)
- **Links**: `[text](url)`
- **Images**: `![alt](path)` - relative paths supported
- **Tables**: GitHub Flavored Markdown tables
- **Blockquotes**: `> quote`
- **Code Blocks**: Triple backticks with language

### Math Equations
Inline: `$E=mc^2$` renders as $E=mc^2$

Block: `$$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`, Renders as:
$$
\frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

### Code Highlighting

```python
def hello_world():
    print("Hello, LabMD!")
```

## Configuration

Edit `/etc/labmd/config.json` to customize settings. The file only contains your customized values - all other settings use backend defaults. A configuration example:
```json
{
  "projectName": "My Lab",
  "labName": "Research Laboratory", 
  "port": 8088,
  "docsPath": "/home/labmd/docs",
  "admin": {
    "name": "John Doe",
    "email": "john@lab.com"
  }
}
```

### Available Settings
Only add settings you want to customize:
- `projectName`: Display name in header (default: "LabMD")
- `labName`: Subtitle in header (default: "Lab Monitoring & Documentation")
- `port`: Web server port (default: 8088)
- `docsPath`: Documentation directory path
- `admin.name/email`: Administrator contact info (optional)
- `defaultDoc`: Homepage file (default: "index.md")
- `docsDepth`: Max folder nesting (default: 4)

**After editing, restart the service:**
```bash
sudo systemctl restart labmd
```

**Check what's new:** See [CHANGELOG.md](https://github.com/SheepTAO/labmd/blob/main/CHANGELOG.md) for configuration changes when upgrading.

## System Commands

```bash
# Service management
sudo systemctl start labmd      # Start service
sudo systemctl stop labmd       # Stop service
sudo systemctl restart labmd    # Restart after config changes
sudo systemctl status labmd     # Check status

# View logs
sudo journalctl -u labmd -f     # Follow live logs
sudo journalctl -u labmd -n 50  # Last 50 lines

# Upgrade LabMD
# 1. Download new version
# 2. Extract and enter directory
# 3. Run: sudo ./install.sh
# Note: Config and docs are preserved automatically
```

## Troubleshooting

### Can't write to `/home/labmd/docs`?
```bash
# Check directory permissions
ls -ld /home/labmd/docs
# Should show: drwxrwxrwt (1777)

# If wrong, contact your system administrator
```

### Service won't start?
```bash
# Check logs for errors
sudo journalctl -u labmd -n 50

# Verify config file is valid JSON
sudo cat /etc/labmd/config.json

# Check if port is already in use
sudo ss -tuln | grep :8088
# Or: sudo lsof -i :8088
```

### Files not showing up?
- Ensure files have `.md` extension
- Check file permissions (must be readable by labmd service)
- Verify `docsPath` in config points to the correct directory
- Check `docsDepth` setting if files are in deeply nested folders

### GPU monitoring not working?
- NVIDIA GPUs only (requires NVML library)
- Check if `nvidia-smi` command works
- Verify NVIDIA drivers are installed correctly

### Monitoring stuck in idle mode?
- Access the Monitor page in your browser
- System will automatically switch to active mode within 2 seconds
- If still stuck, check browser console for errors

## Uninstall

```bash
sudo /usr/share/labmd/uninstall.sh
```

The uninstall script will:
- Automatically remove configuration files
- Ask if you want to delete documentation (shows file count and size)
- Clean up all system files and service

**Happy documenting! 🥳**
