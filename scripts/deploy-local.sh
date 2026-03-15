#!/bin/bash
# Local development deploy script
# Copies built plugin to opencode plugins directory for testing

set -e

PLUGIN_NAME="opencode-gotify-notifier"
PLUGIN_DIR="$HOME/.config/opencode/plugins"

# Build first
echo "Building plugin..."
npm run build

# Create plugins directory if needed
mkdir -p "$PLUGIN_DIR"

# Copy built file
cp dist/index.js "$PLUGIN_DIR/$PLUGIN_NAME.js"

echo "Plugin deployed to $PLUGIN_DIR/$PLUGIN_NAME.js"
echo "Restart opencode to load the updated plugin"