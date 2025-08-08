#!/bin/bash
echo "Starting Wombat Track Frontend..."

# Install serve globally for SPA routing
npm install -g serve

# Build the React app
npm run build

# Serve with SPA routing enabled
serve -s build -l 8080 --single