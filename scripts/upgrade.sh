#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "${EUID}" -ne 0 ]; then
    echo -e "${RED}Please run with sudo${NC}"
    exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
    echo -e "${RED}tar is required for upgrades${NC}"
    exit 1
fi

if ! command -v awk >/dev/null 2>&1; then
    echo -e "${RED}awk is required for upgrades${NC}"
    exit 1
fi

ARCH_RAW=$(uname -m)
case "$ARCH_RAW" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)
        echo -e "${RED}Unsupported architecture: $ARCH_RAW${NC}"
        exit 1
        ;;
esac

VERSION="${1:-latest}"
PACKAGE_NAME="labmd-linux-$ARCH.tar.gz"

normalize_version() {
    printf '%s' "$1" | sed 's/^v//'
}

compare_versions() {
    local left right
    left=$(normalize_version "$1")
    right=$(normalize_version "$2")

    if [ "$left" = "$right" ]; then
        echo 0
        return
    fi

    if [ "$(printf '%s\n%s\n' "$left" "$right" | sort -V | head -n 1)" = "$left" ]; then
        echo -1
    else
        echo 1
    fi
}

resolve_latest_version() {
    local latest_url

    if command -v curl >/dev/null 2>&1; then
        latest_url=$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/SheepTAO/labmd/releases/latest")
    else
        latest_url=$(wget --max-redirect=20 --server-response --spider "https://github.com/SheepTAO/labmd/releases/latest" 2>&1 | awk '/^  Location: / {print $2}' | tail -n 1 | tr -d '\r')
    fi

    basename "$latest_url"
}

CURRENT_VERSION=""
if [ -x "/usr/local/bin/labmd" ]; then
    CURRENT_VERSION=$(/usr/local/bin/labmd --version 2>/dev/null || echo "")
fi

if [ "$VERSION" = "latest" ]; then
    TARGET_VERSION=$(resolve_latest_version)
else
    TARGET_VERSION="$VERSION"
fi

if [ -n "$CURRENT_VERSION" ]; then
    VERSION_COMPARE=$(compare_versions "$CURRENT_VERSION" "$TARGET_VERSION")

    if [ "$VERSION_COMPARE" = "0" ]; then
        if [ "$VERSION" = "latest" ]; then
            echo -e "${GREEN}LabMD is already at the latest version (${CURRENT_VERSION})${NC}"
        else
            echo -e "${GREEN}LabMD is already at version ${CURRENT_VERSION}${NC}"
        fi
        exit 0
    fi

    if [ "$VERSION_COMPARE" = "1" ]; then
        echo -e "${YELLOW}Downgrade detected: ${CURRENT_VERSION} -> ${TARGET_VERSION}${NC}"
    else
        echo -e "${BLUE}Upgrade detected: ${CURRENT_VERSION} -> ${TARGET_VERSION}${NC}"
    fi
fi

if [ "$VERSION" = "latest" ]; then
    DOWNLOAD_URL="https://github.com/SheepTAO/labmd/releases/latest/download/$PACKAGE_NAME"
else
    DOWNLOAD_URL="https://github.com/SheepTAO/labmd/releases/download/$VERSION/$PACKAGE_NAME"
fi

TMP_DIR=$(mktemp -d)
cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

ARCHIVE_PATH="$TMP_DIR/$PACKAGE_NAME"

echo -e "${BLUE}[LabMD Upgrade]${NC}"
echo -e "  Current: ${GREEN}${CURRENT_VERSION:-unknown}${NC}"
echo -e "  Target:  ${GREEN}$TARGET_VERSION${NC}"
echo -e "  Source: ${BLUE}$DOWNLOAD_URL${NC}"

if command -v curl >/dev/null 2>&1; then
    curl -fL "$DOWNLOAD_URL" -o "$ARCHIVE_PATH"
elif command -v wget >/dev/null 2>&1; then
    wget -O "$ARCHIVE_PATH" "$DOWNLOAD_URL"
else
    echo -e "${RED}curl or wget is required for upgrades${NC}"
    exit 1
fi

tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

PACKAGE_DIR=$(find "$TMP_DIR" -maxdepth 1 -mindepth 1 -type d -name "labmd-linux-$ARCH*" | head -n 1)
if [ -z "$PACKAGE_DIR" ] || [ ! -x "$PACKAGE_DIR/install.sh" ]; then
    echo -e "${RED}Failed to locate install.sh in the downloaded package${NC}"
    exit 1
fi

cd "$PACKAGE_DIR"
LABMD_AUTO_YES=1 ./install.sh
