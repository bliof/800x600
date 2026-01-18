#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build/800x600"

# Clean and create build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/images"

# Copy extension files
cp "$PROJECT_DIR/manifest.json" "$BUILD_DIR/"
cp "$PROJECT_DIR/service_worker.js" "$BUILD_DIR/"
cp "$PROJECT_DIR/swap.js" "$BUILD_DIR/"
cp "$PROJECT_DIR/LICENSE" "$BUILD_DIR/"
cp "$PROJECT_DIR/README.md" "$BUILD_DIR/"

# Copy images
cp "$PROJECT_DIR/images/"* "$BUILD_DIR/images/"

echo "Build complete: $BUILD_DIR"
