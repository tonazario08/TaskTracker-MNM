#!/bin/bash

echo "========================================"
echo "Starting TaskTracker Application"
echo "========================================"
echo ""
echo "Starting Backend on http://localhost:8080"
echo "Starting Frontend on http://localhost:3000"
echo ""

cd "$(dirname "$0")"

# Start backend in background
node index.js &
BACKEND_PID=$!

# Wait 2 seconds for backend to start
sleep 2

# Start frontend in background
cd frontend
node server.js &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "Both servers are running!"
echo "========================================"
echo ""
echo "Backend: http://localhost:8080 (PID: $BACKEND_PID)"
echo "Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "Login: http://localhost:3000/login"
echo "Register: http://localhost:3000/register"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Trap Ctrl+C and kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for both processes
wait
