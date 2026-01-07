#!/bin/bash
set -e

# LabDash Uninstall Script

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

echo -e "${RED}╔════════════════════════════════════╗${NC}"
echo -e "${RED}║      LabDash Uninstall Script      ║${NC}"
echo -e "${RED}╚════════════════════════════════════╝${NC}"
echo

# Get docs path from config before removing
DOCS_PATH=""
if [ -f "/etc/labdash/config.json" ]; then
    DOCS_PATH=$(grep -oP '"docsPath":\s*"\K[^"]+' /etc/labdash/config.json 2>/dev/null || echo "")
fi

# Handle documentation directory
if [ -n "$DOCS_PATH" ] && [ -d "$DOCS_PATH" ]; then
    echo
    echo -e "${YELLOW}Documentation Directory${NC}"
    echo -e "  Location: ${BLUE}$DOCS_PATH${NC}"
    
    # Count files
    FILE_COUNT=$(find "$DOCS_PATH" -type f 2>/dev/null | wc -l)
    DIR_SIZE=$(du -sh "$DOCS_PATH" 2>/dev/null | cut -f1)
    
    echo -e "  Files: ${YELLOW}$FILE_COUNT${NC}"
    echo -e "  Size: ${YELLOW}$DIR_SIZE${NC}"
    
    if [ "$FILE_COUNT" -gt 0 ]; then
        echo -e "  ${RED}WARNING: This will permanently delete all documentation!${NC}"
    fi
    
    echo -n "Delete documentation directory? [y/N]: "
    read delete_docs
    
    if [ "$delete_docs" == "y" ] || [ "$delete_docs" == "Y" ]; then
        # Safety check: ensure path is reasonable
        if [[ "$DOCS_PATH" != "/" && "$DOCS_PATH" != "/home" && "$DOCS_PATH" != "/usr" ]]; then
            rm -rf "$DOCS_PATH"
            # Also remove parent if it's /home/labdash and empty
            if [[ "$DOCS_PATH" == "/home/labdash"* ]]; then
                if [ -d "/home/labdash" ] && [ ! "$(ls -A /home/labdash 2>/dev/null)" ]; then
                    rmdir /home/labdash 2>/dev/null || true
                    echo -e "${GREEN}[OK]${NC} Documentation directory and parent removed"
                else
                    echo -e "${GREEN}[OK]${NC} Documentation directory removed"
                fi
            else
                echo -e "${GREEN}[OK]${NC} Documentation directory removed"
            fi
        else
            echo -e "${RED}[ERROR]${NC} Unsafe path, skipping deletion: $DOCS_PATH"
        fi
    else
        echo -e "${BLUE}[INFO]${NC} Documentation directory kept at: $DOCS_PATH"
    fi
fi

# Remove labdash user if exists
if id -u labdash > /dev/null 2>&1; then
    userdel labdash 2>/dev/null || true
    echo -e "${GREEN}[OK]${NC} Removed labdash user"
fi

# Stop service
if systemctl is-active --quiet labdash 2>/dev/null; then
    echo -e "${YELLOW}Stopping LabDash service...${NC}"
    systemctl stop labdash
    systemctl disable labdash
    echo -e "${GREEN}[OK]${NC} Service stopped"
fi

# Remove systemd service
if [ -f "/etc/systemd/system/labdash.service" ]; then
    rm -f /etc/systemd/system/labdash.service
    systemctl daemon-reload
    echo -e "${GREEN}[OK]${NC} Systemd service removed"
fi

# Remove binary
if [ -f "/usr/local/bin/labdash" ]; then
    rm -f /usr/local/bin/labdash
    echo -e "${GREEN}[OK]${NC} Binary removed"
fi

# Remove frontend assets and uninstall script
if [ -d "/usr/share/labdash" ]; then
    rm -rf /usr/share/labdash
    echo -e "${GREEN}[OK]${NC} Frontend assets removed"
fi

# Remove config file automatically
if [ -f "/etc/labdash/config.json" ] || [ -d "/etc/labdash" ]; then
    rm -rf /etc/labdash
    echo -e "${GREEN}[OK]${NC} Configuration removed"
fi

# Done
echo
echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Uninstall Complete!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}Thank you for using LabDash!${NC}"
echo
