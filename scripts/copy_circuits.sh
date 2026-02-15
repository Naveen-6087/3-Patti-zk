#!/bin/bash
# Copy compiled circuit artifacts from circuits/target/ to frontend/public/circuits/
# Run from the 3-Patti-zk root directory

set -e

CIRCUITS_DIR="circuits/target"
PUBLIC_DIR="frontend/public/circuits"

echo "Copying circuit artifacts to $PUBLIC_DIR..."

# Create output directory
mkdir -p "$PUBLIC_DIR"

# Copy compiled circuit JSON files (the main artifacts for noir_js)
for circuit in shuffle deal show; do
  src="$CIRCUITS_DIR/${circuit}_circuit.json"
  if [ -f "$src" ]; then
    cp "$src" "$PUBLIC_DIR/"
    echo "  ✓ ${circuit}_circuit.json"
  else
    echo "  ✗ ${circuit}_circuit.json NOT FOUND"
  fi
done

# Copy verification keys (raw binary)
for circuit in shuffle deal show; do
  src="$CIRCUITS_DIR/${circuit}_vk/vk"
  dest="$PUBLIC_DIR/${circuit}_vk"
  if [ -f "$src" ]; then
    cp "$src" "$dest"
    echo "  ✓ ${circuit}_vk"
  else
    echo "  ✗ ${circuit}_vk NOT FOUND at $src"
  fi
done

echo ""
echo "Circuit artifacts copied. Contents of $PUBLIC_DIR:"
ls -la "$PUBLIC_DIR/"
echo ""
echo "File sizes:"
du -sh "$PUBLIC_DIR"/*
