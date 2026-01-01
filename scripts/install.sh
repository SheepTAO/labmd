#!/bin/bash
set -e

# LabDash Interactive Installation Script

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run with sudo${NC}"
    exit 1
fi

ACTUAL_USER=${SUDO_USER:-$USER}
ACTUAL_HOME=$(eval echo ~$ACTUAL_USER)

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    LabDash Interactive Installer   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo

# Check existing installation
if [ -f "/usr/local/bin/labdash" ]; then
    CURRENT_VERSION=$(/usr/local/bin/labdash --version 2>/dev/null || echo "unknown")
    echo -e "${YELLOW}Existing installation detected: $CURRENT_VERSION${NC}"
    echo -n "Overwrite? [y/N]: "
    read confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${RED}Installation cancelled.${NC}"
        exit 0
    fi
fi

# Ask for docs path
echo -e "${YELLOW}Documentation Directory${NC}"
echo "Where should we store your documentation files?"
echo -e "  ${GREEN}1)${NC} /home/labdash/docs ${BLUE}(shared, all users can access)${NC}"
echo -e "  ${GREEN}2)${NC} $ACTUAL_HOME/labdash-docs ${BLUE}(personal use, single user)${NC}"
echo -n "Choice [1-2] (default 1): "
read choice

case "$choice" in
    2) DOCS_PATH="$ACTUAL_HOME/labdash-docs" ;;
    *) DOCS_PATH="/home/labdash/docs" ;;
esac

echo -e "${GREEN}[OK]${NC} Using: $DOCS_PATH\n"

# Project settings
echo -e "${YELLOW}Project Configuration${NC}"
echo -n "Project name (default: LabDash): "
read PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-"LabDash"}

echo -n "Lab name (default: Lab Dashboard): "
read LAB_NAME
LAB_NAME=${LAB_NAME:-"Lab Dashboard"}


# Determine if we have port checking tools
HAS_PORT_CHECKER=false
if command -v ss &> /dev/null || command -v netstat &> /dev/null; then
    HAS_PORT_CHECKER=true
fi

while true; do
    echo -n "Port (default: 8088): "
    read PORT
    PORT=${PORT:-8088}
    
    # Only check port if we have tools available
    if [ "$HAS_PORT_CHECKER" = true ]; then
        PORT_IN_USE=false
        
        if command -v ss &> /dev/null; then
            if ss -tuln | grep -q ":$PORT "; then
                PORT_IN_USE=true
            fi
        elif command -v netstat &> /dev/null; then
            if netstat -tuln | grep -q ":$PORT "; then
                PORT_IN_USE=true
            fi
        fi
        
        if [ "$PORT_IN_USE" = true ]; then
            echo -e "${RED}Port $PORT is already in use.${NC}"
            continue
        fi
    fi
    
    break
done
echo -e "${GREEN}[OK]${NC} Configuration set\n"

# Install
echo -e "${YELLOW}[Installing...]${NC}"

# Create labdash user if using shared directory
if [ "$DOCS_PATH" == "/home/labdash/docs" ]; then
    if ! id -u labdash > /dev/null 2>&1; then
        useradd -r -d /home/labdash -s /bin/bash labdash
        echo -e "${GREEN}[OK]${NC} Created labdash user"
    fi
fi

mkdir -p "$DOCS_PATH"
mkdir -p /etc/labdash
mkdir -p /usr/share/labdash

cp labdash /usr/local/bin/
chmod +x /usr/local/bin/labdash

cp -r dist /usr/share/labdash/

# Copy uninstall script to system location
cp uninstall.sh /usr/share/labdash/
chmod +x /usr/share/labdash/uninstall.sh
echo -e "${GREEN}[OK]${NC} Uninstall script installed"

if [ ! "$(ls -A $DOCS_PATH)" ]; then
    cp index.md "$DOCS_PATH/"
    echo -e "${GREEN}[OK]${NC} Default doc copied"
fi

# Set permissions based on directory type
if [ "$DOCS_PATH" == "/home/labdash/docs" ]; then
    # Shared directory: world-writable with sticky bit and ACL defaults
    chown -R labdash:labdash /home/labdash
    
    # Set permissions: 1777 (sticky bit + rwxrwxrwx)
    # Sticky bit: only file owner can delete their own files
    chmod 1777 /home/labdash
    chmod 1777 "$DOCS_PATH"
    find "$DOCS_PATH" -type d -exec chmod 1777 {} \; 2>/dev/null || true
    find "$DOCS_PATH" -type f -exec chmod 666 {} \; 2>/dev/null || true
    
    # Set ACL default permissions if available
    if command -v setfacl &> /dev/null; then
        setfacl -R -m d:u::rwx,d:g::rwx,d:o::rwx /home/labdash 2>/dev/null || true
        echo -e "${GREEN}[OK]${NC} ACL default permissions set"
    fi
    
    echo -e "${GREEN}[OK]${NC} Shared directory permissions set (all users can read/write)"
else
    # Personal directory: keep user ownership
    chown -R $ACTUAL_USER:$ACTUAL_USER "$DOCS_PATH" 2>/dev/null || true
fi

# Generate config
cat > /etc/labdash/config.json << EOF
{
  "projectName": "$PROJECT_NAME",
  "labName": "$LAB_NAME",
  "port": $PORT,
  "docsPath": "$DOCS_PATH",
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
      "/": "System Root",
      "/home": "User Home"
    },
    "ignoredPartitions": [],
    "ignoredUsers": ["lost+found"],
    "maxUsersToList": 12
  }
}
EOF

echo -e "${GREEN}[OK]${NC} Config saved to /etc/labdash/config.json"

# Systemd service
if command -v systemctl &> /dev/null; then
    cp labdash.service /etc/systemd/system/labdash.service

    systemctl daemon-reload
    echo -e "${GREEN}[OK]${NC} Systemd service created"
    
    echo -en "\n${YELLOW}Start service now? [y/N]: ${NC}"
    read start
    if [ "$start" == "y" ] || [ "$start" == "Y" ]; then
        systemctl enable labdash
        systemctl start labdash
        echo -e "${GREEN}[OK]${NC} Service started"
    fi
fi

# Done
echo
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Installation Complete!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}[Summary]${NC}"
echo -e "  Config: /etc/labdash/config.json"
echo -e "  Docs:   $DOCS_PATH"
echo -e "  URL:    ${GREEN}http://localhost:$PORT${NC}"

echo
if [ "$DOCS_PATH" == "/home/labdash/docs" ]; then
    echo -e "${YELLOW}[Shared Directory Usage]${NC}"
    echo -e "  * ${BLUE}/home/labdash${NC} - All users can read/write (use for tools, scripts, etc.)"
    echo -e "  * ${BLUE}/home/labdash/docs${NC} - Markdown documentation (auto-indexed by LabDash)"
    echo -e "  * Create files: ${GREEN}touch /home/labdash/docs/my-doc.md${NC}"
    echo -e "  * Upload tools: ${GREEN}cp ~/script.py /home/labdash/tools/${NC}"
    echo -e "  * Sticky bit enabled: only file owner can delete their own files"
    echo
fi

echo
if command -v systemctl &> /dev/null; then
    echo -e "${BLUE}[Commands]${NC}"
    echo -e "  Start:   sudo systemctl start labdash"
    echo -e "  Stop:    sudo systemctl stop labdash"
    echo -e "  Restart: sudo systemctl restart labdash"
    echo -e "  Status:  sudo systemctl status labdash"
    echo -e "  Logs:    sudo journalctl -u labdash -f"
    echo
    echo -e "  ${RED}Uninstall: sudo /usr/share/labdash/uninstall.sh${NC}"
fi
