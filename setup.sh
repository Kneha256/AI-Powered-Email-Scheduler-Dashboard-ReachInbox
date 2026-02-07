#!/bin/bash

echo "========================================"
echo "ReachInbox Email Scheduler - Setup"
echo "========================================"
echo ""

echo "[1/5] Starting Docker services..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "ERROR: Docker failed to start. Make sure Docker is installed and running."
    exit 1
fi
echo "Waiting for services to initialize..."
sleep 10
echo ""

echo "[2/5] Installing backend dependencies..."
cd backend
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Edit backend/.env and add your Google OAuth credentials!"
    echo "Get them from: https://console.cloud.google.com/"
    echo ""
fi
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Backend npm install failed"
    exit 1
fi
cd ..
echo ""

echo "[3/5] Installing frontend dependencies..."
cd frontend
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend npm install failed"
    exit 1
fi
cd ..
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and add Google OAuth credentials"
echo "2. Run: ./start-all.sh"
echo ""
echo "Or manually:"
echo "- Terminal 1: cd backend && npm run dev"
echo "- Terminal 2: cd backend && npm run worker"
echo "- Terminal 3: cd frontend && npm start"
echo ""
