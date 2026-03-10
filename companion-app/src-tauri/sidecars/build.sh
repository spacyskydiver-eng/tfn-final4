#!/usr/bin/env bash
# build.sh — compile RoKScreenReader.swift into a Tauri sidecar binary.
#
# Run from companion-app/src-tauri/sidecars/:
#   chmod +x build.sh && ./build.sh
#
# Output: ../binaries/RoKScreenReader-aarch64-apple-darwin  (Apple Silicon)
#         ../binaries/RoKScreenReader-x86_64-apple-darwin   (Intel, if rosetta/cross)
#
# Tauri sidecar convention: binary must be named
#   <name>-<target-triple>  (no extension on macOS)
# and listed under bundle.externalBin in tauri.conf.json.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARIES_DIR="$SCRIPT_DIR/../binaries"
SOURCE="$SCRIPT_DIR/RoKScreenReader.swift"

mkdir -p "$BINARIES_DIR"

# Detect host architecture
ARCH=$(uname -m)   # arm64 or x86_64

if [[ "$ARCH" == "arm64" ]]; then
  TARGET="arm64-apple-macos14.0"
  OUT_TRIPLE="aarch64-apple-darwin"
else
  TARGET="x86_64-apple-macos14.0"
  OUT_TRIPLE="x86_64-apple-darwin"
fi

OUT="$BINARIES_DIR/RoKScreenReader-${OUT_TRIPLE}"

echo "→ Compiling RoKScreenReader for $TARGET…"

swiftc \
  -target "$TARGET" \
  -framework ScreenCaptureKit \
  -framework Vision \
  -framework CoreGraphics \
  -framework Foundation \
  "$SOURCE" \
  -o "$OUT"

echo "→ Binary written to: $OUT"
echo ""
echo "If you're building a universal (fat) binary for distribution, run:"
echo "  lipo -create \\"
echo "    binaries/RoKScreenReader-aarch64-apple-darwin \\"
echo "    binaries/RoKScreenReader-x86_64-apple-darwin \\"
echo "    -output binaries/RoKScreenReader"
echo ""
echo "Done ✓"
