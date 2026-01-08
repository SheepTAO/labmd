#!/bin/bash
set -e

# LabMD Interactive Installation/Upgrade Script

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

# Get new version from binary
NEW_VERSION=$(./labmd --version 2>/dev/null || echo "unknown")

# Detect existing installation
CURRENT_VERSION=""
if [ -f "/usr/local/bin/labmd" ]; then
    CURRENT_VERSION=$(/usr/local/bin/labmd --version 2>/dev/null || echo "unknown")
fi

# Show version info and installation mode selection
if [ -n "$CURRENT_VERSION" ]; then
    echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            LabMD Upgrade           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
    echo
    echo -e "${YELLOW}Existing Installation Detected${NC}"
    echo -e "  Current version: ${GREEN}$CURRENT_VERSION${NC}"
    echo -e "  New version:     ${GREEN}$NEW_VERSION${NC}"
    echo
    echo -e "This will:"
    echo -e "  ✓ Update binary and frontend"
    echo -e "  ✓ Preserve your configuration (no changes)"
    echo -e "  ✓ Keep documentation intact"
    echo
    echo -e "${BLUE}What's new?${NC} https://github.com/SheepTAO/labmd/blob/main/CHANGELOG.md"
    echo
    echo -n "Proceed with upgrade? [y/N]: "
    read confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo -e "${RED}Upgrade cancelled.${NC}"
        exit 0
    fi
    
    INSTALL_MODE="upgrade"
else
    echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     LabMD Interactive Installer    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
    echo
    echo -e "Installing version: ${GREEN}$NEW_VERSION${NC}"
    echo
    INSTALL_MODE="fresh"
fi

# Collect configuration (only for fresh install)
if [ "$INSTALL_MODE" = "fresh" ]; then
    echo -e "${YELLOW}Basic Configuration${NC}"
    echo
    
    # Project Name
    echo -n "Project name (default: LabMD): "
    read PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-"LabMD"}
    
    # Lab Name
    echo -n "Lab name (default: Lab Monitoring & Documentation): "
    read LAB_NAME
    LAB_NAME=${LAB_NAME:-"Lab Monitoring & Documentation"}

    # Administrator Info (optional)
    echo -n "Administrator name (optional, press Enter to skip): "
    read ADMIN_NAME
    if [ -n "$ADMIN_NAME" ]; then
        echo -n "Administrator email: "
        read ADMIN_EMAIL
    fi
    
    # Port
    while true; do
        echo -n "Port (default: 8088): "
        read PORT
        PORT=${PORT:-8088}
        
        # Check if port is valid number
        if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
            echo -e "${RED}Port must be a number.${NC}"
            continue
        fi
        
        # Check if port is in valid range
        if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
            echo -e "${RED}Port must be between 1 and 65535.${NC}"
            continue
        fi
        
        # Check if port is in use
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
        
        break
    done
    
    echo
    # Documentation Directory
    echo -e "${YELLOW}Documentation Directory${NC}"
    echo "Where should we store your documentation files?"
    echo -e "  ${GREEN}1)${NC} /home/labmd/docs ${BLUE}(shared, all users can access)${NC}"
    echo -e "  ${GREEN}2)${NC} $ACTUAL_HOME/labmd-docs ${BLUE}(personal use, single user)${NC}"
    echo -n "Choice [1-2] (default 1): "
    read choice

    case "$choice" in
        2) DOCS_PATH="$ACTUAL_HOME/labmd-docs" ;;
        *) DOCS_PATH="/home/labmd/docs" ;;
    esac

    echo -e "${GREEN}[OK]${NC} Configuration complete\n"
fi

# Stop service if running (only for upgrade)
if [ "$INSTALL_MODE" = "upgrade" ]; then
    if command -v systemctl &> /dev/null && systemctl is-active --quiet labmd 2>/dev/null; then
        echo -e "${YELLOW}[Stopping service...]${NC}"
        systemctl stop labmd
        echo -e "${GREEN}[OK]${NC} Service stopped"
    fi
fi

# Install files
echo -e "${YELLOW}[Installing files...]${NC}"

# Create directories
mkdir -p /etc/labmd
mkdir -p /usr/share/labmd

# Install binary and frontend
cp labmd /usr/local/bin/
chmod +x /usr/local/bin/labmd
echo -e "${GREEN}[OK]${NC} Binary installed"

cp -r dist /usr/share/labmd/
echo -e "${GREEN}[OK]${NC} Frontend installed"

# Copy uninstall script
cp uninstall.sh /usr/share/labmd/
chmod +x /usr/share/labmd/uninstall.sh

# Setup docs directory (only for fresh install)
if [ "$INSTALL_MODE" = "fresh" ]; then
    # Create docs directory if it doesn't exist
    if [ ! -d "$DOCS_PATH" ]; then
        mkdir -p "$DOCS_PATH"
        echo -e "${GREEN}[OK]${NC} Created docs directory: $DOCS_PATH"
    fi
    
    if [ "$DOCS_PATH" = "/home/labmd/docs" ]; then
        # Shared directory setup
        # Create labmd user if needed
        if ! id -u labmd > /dev/null 2>&1; then
            useradd -r -d /home/labmd -s /bin/bash labmd
            echo -e "${GREEN}[OK]${NC} Created labmd user"
        fi
        
        # Set shared directory permissions
        chown -R labmd:labmd /home/labmd
        chmod 1777 /home/labmd
        chmod 1777 "$DOCS_PATH"
        find "$DOCS_PATH" -type d -exec chmod 1777 {} \; 2>/dev/null || true
        find "$DOCS_PATH" -type f -exec chmod 666 {} \; 2>/dev/null || true
        
        if command -v setfacl &> /dev/null; then
            setfacl -R -m d:u::rwx,d:g::rwx,d:o::rwx /home/labmd 2>/dev/null || true
            echo -e "${GREEN}[OK]${NC} ACL permissions configured"
        fi
        
        echo -e "${GREEN}[OK]${NC} Shared directory configured"
    else
        # Personal directory setup
        chown -R $ACTUAL_USER:$ACTUAL_USER "$DOCS_PATH" 2>/dev/null || true
        echo -e "${GREEN}[OK]${NC} Personal directory configured"
    fi
    
    # Copy default documentation if directory is empty
    if [ ! "$(ls -A $DOCS_PATH 2>/dev/null)" ]; then
        cp index.md "$DOCS_PATH/"
        echo -e "${GREEN}[OK]${NC} Default documentation copied"
    fi
fi

# Handle configuration
echo -e "${YELLOW}[Configuring...]${NC}"

if [ "$INSTALL_MODE" = "upgrade" ]; then
    # Upgrade: keep existing config untouched
    echo -e "${GREEN}[OK]${NC} Existing configuration preserved"
else
    # Fresh install: generate minimal config
    if [ -n "$ADMIN_NAME" ]; then
        # With admin info
        cat > /etc/labmd/config.json << EOF
{
  "projectName": "$PROJECT_NAME",
  "labName": "$LAB_NAME",
  "port": $PORT,
  "docsPath": "$DOCS_PATH",
  "admin": {
    "name": "$ADMIN_NAME",
    "email": "$ADMIN_EMAIL"
  }
}
EOF
    else
        # Without admin info
        cat > /etc/labmd/config.json << EOF
{
  "projectName": "$PROJECT_NAME",
  "labName": "$LAB_NAME",
  "port": $PORT,
  "docsPath": "$DOCS_PATH"
}
EOF
    fi
    
    chmod 644 /etc/labmd/config.json
    echo -e "${GREEN}[OK]${NC} Configuration created"
fi

# Install and start systemd service
if command -v systemctl &> /dev/null; then
    cp labmd.service /etc/systemd/system/
    systemctl daemon-reload
    echo -e "${GREEN}[OK]${NC} Service installed"
    
    echo
    echo -n "Start LabMD service now? [Y/n]: "
    read start
    if [ "$start" != "n" ] && [ "$start" != "N" ]; then
        systemctl enable labmd
        systemctl start labmd
        echo -e "${GREEN}[OK]${NC} Service started"
    fi
fi

# Summary
echo
if [ "$INSTALL_MODE" = "upgrade" ]; then
    echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Upgrade Complete!          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Upgraded: $CURRENT_VERSION → $NEW_VERSION${NC}"
else
    echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      Installation Complete!        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
fi

echo
echo -e "${BLUE}[Summary]${NC}"
echo -e "  Version: $NEW_VERSION"
echo -e "  Config:  /etc/labmd/config.json"

if [ "$INSTALL_MODE" = "fresh" ]; then
    echo -e "  Docs:    $DOCS_PATH"
    echo -e "  URL:     ${GREEN}http://localhost:$PORT${NC}"
    
    if [ "$DOCS_PATH" = "/home/labmd/docs" ]; then
        echo
        echo -e "${YELLOW}[Shared Directory Usage]${NC}"
        echo -e "  * ${BLUE}/home/labmd/docs${NC} - All users can read/write"
        echo -e "  * Sticky bit enabled: only file owner can delete their own files"
    fi
fi

echo
if command -v systemctl &> /dev/null; then
    echo -e "${BLUE}[Commands]${NC}"
    echo -e "  Status:  sudo systemctl status labmd"
    echo -e "  Start:   sudo systemctl start labmd"
    echo -e "  Stop:    sudo systemctl stop labmd"
    echo -e "  Restart: sudo systemctl restart labmd"
    echo -e "  Logs:    sudo journalctl -u labmd -f"
    echo
    echo -e "  ${RED}Uninstall: sudo /usr/share/labmd/uninstall.sh${NC}"
fi

echo
