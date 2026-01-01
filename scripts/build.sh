#!/bin/bash

# LabDash Build Script
# Builds binaries for multiple platforms and prepares release package

set -e

VERSION=${1:-"1.0.0"}
BUILD_DIR="build"
RELEASE_DIR="build/release"

# Colors
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[BUILD]${NC} $1"
}

# Clean previous builds
clean() {
    log "Cleaning previous builds..."
    rm -rf "$BUILD_DIR" "$RELEASE_DIR"
    mkdir -p "$BUILD_DIR"
    mkdir -p "$RELEASE_DIR"
}

# Build frontend
build_frontend() {
    log "Building frontend..."
    cd frontend
    npm install
    
    # Build directly to target directory
    VITE_BUILD_DIR="../$BUILD_DIR/dist" npm run build
    
    cd ..
    log "Frontend built successfully"
}

# Build backend for multiple platforms
build_backend() {
    log "Building backend for multiple platforms..."
    cd backend
    
    # Define platforms (currently only Linux amd64)
    platforms=(
        "linux/amd64"
    )
    
    for platform in "${platforms[@]}"; do
        IFS='/' read -r os arch <<< "$platform"
        output="../$BUILD_DIR/labdash-$os-$arch"
        
        if [ "$os" = "windows" ]; then
            output+=".exe"
        fi
        
        log "Building for $os/$arch..."
        LDFLAGS="-s -w \
            -X main.Version=$VERSION \
            -X main.BuildTime=$(date -u +%Y%m%d%H%M%S) \
            -X main.AllowDev=false"
        GOOS=$os GOARCH=$arch go build -ldflags="$LDFLAGS" -o "$output" .
    done
    
    cd ..
    log "Backend binaries built successfully"
}

# Prepare release packages
prepare_releases() {
    log "Preparing release packages..."
    
    platforms=(
        "linux-amd64"
    )
    
    for platform in "${platforms[@]}"; do
        log "Creating package for $platform..."
        
        pkg_dir="$BUILD_DIR/labdash-$platform-$VERSION"
        mkdir -p "$pkg_dir"
        
        # Copy binary (rename to labdash for easier installation)
        if [ -f "$BUILD_DIR/labdash-$platform" ]; then
            cp "$BUILD_DIR/labdash-$platform" "$pkg_dir/labdash"
            chmod +x "$pkg_dir/labdash"
        fi
        
        # Copy frontend dist
        cp -r "$BUILD_DIR/dist" "$pkg_dir/"
        
        # Copy default documentation
        cp templates/index.md "$pkg_dir/" 2>/dev/null || echo "# Welcome to LabDash" > "$pkg_dir/index.md"
        
        # Copy systemd service file
        cp templates/labdash.service "$pkg_dir/"
        
        # Copy install script
        cp scripts/install.sh "$pkg_dir/"
        chmod +x "$pkg_dir/install.sh"
        
        # Copy uninstall script
        cp scripts/uninstall.sh "$pkg_dir/"
        chmod +x "$pkg_dir/uninstall.sh"
        
        # Create versioned tarball (for archive)
        tar -czf "$RELEASE_DIR/labdash-$platform-$VERSION.tar.gz" -C "$BUILD_DIR" "labdash-$platform-$VERSION"
        log "Package created: labdash-$platform-$VERSION.tar.gz"
        
        # Create latest tarball (fixed name, for easy download)
        tar -czf "$RELEASE_DIR/labdash-$platform.tar.gz" -C "$BUILD_DIR" "labdash-$platform-$VERSION"
        log "Package created: labdash-$platform.tar.gz (latest)"
    done
}

# Generate checksums
generate_checksums() {
    log "Generating checksums..."
    cd "$RELEASE_DIR"
    sha256sum *.tar.gz > checksums.txt
    cd ../..
    log "Checksums generated"
}

# Main build process
main() {
    echo "========================================="
    echo "       LabDash Build Script v1.0         "
    echo "       Building version: $VERSION        "
    echo "========================================="
    echo ""
    
    clean
    build_frontend
    build_backend
    prepare_releases
    generate_checksums
    
    echo ""
    echo "========================================="
    echo "             Build Complete!             "
    echo "========================================="
    echo ""
    echo "Release packages are in: $RELEASE_DIR/"
    ls -lh "$RELEASE_DIR"
    echo ""
}

main "$@"
