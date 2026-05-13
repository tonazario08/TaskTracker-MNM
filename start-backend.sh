#!/bin/bash

echo "========================================"
echo "Starting TaskTracker Backend Server"
echo "========================================"
echo ""
echo "Backend will run on: http://localhost:8080"
echo ""

cd "$(dirname "$0")"
node index.js
