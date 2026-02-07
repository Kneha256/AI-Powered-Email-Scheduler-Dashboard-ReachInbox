#!/bin/bash

echo "Starting ReachInbox Email Scheduler..."
echo ""

# Check if tmux is available
if command -v tmux &> /dev/null; then
    echo "Using tmux for better terminal management..."
    tmux new-session -d -s reachinbox
    tmux send-keys -t reachinbox "cd backend && npm run dev" C-m
    tmux split-window -t reachinbox -h
    tmux send-keys -t reachinbox "cd backend && npm run worker" C-m
    tmux split-window -t reachinbox -v
    tmux send-keys -t reachinbox "cd frontend && npm start" C-m
    tmux attach -t reachinbox
else
    # Fallback to background processes
    echo "Starting Backend Server..."
    cd backend && npm run dev &
    BACKEND_PID=$!
    
    echo "Starting Worker..."
    npm run worker &
    WORKER_PID=$!
    cd ..
    
    echo "Starting Frontend..."
    cd frontend && npm start &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo "All services started!"
    echo "- Backend: http://localhost:5000"
    echo "- Frontend: http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for Ctrl+C
    trap "kill $BACKEND_PID $WORKER_PID $FRONTEND_PID; exit" INT
    wait
fi
