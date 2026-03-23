#!/bin/bash
# PARAGRAF — Start Script
set -e

cd "$(dirname "$0")"

echo "⚖️ Starting PARAGRAF..."

# Check if backend port is free
if lsof -i :8001 >/dev/null 2>&1; then
    echo "⚠️  Port 8001 in use — killing existing backend..."
    pkill -f "uvicorn main:app --port 8001" 2>/dev/null || true
    sleep 1
fi

# Check if frontend port is free
if lsof -i :3002 >/dev/null 2>&1; then
    echo "⚠️  Port 3002 in use — killing existing frontend..."
    pkill -f "next-server.*3002" 2>/dev/null || true
    sleep 1
fi

# Start backend
echo "🔧 Starting backend (port 8001)..."
cd backend
python3 -m uvicorn main:app --port 8001 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend
for i in {1..10}; do
    if curl -s http://localhost:8001/health >/dev/null 2>&1; then
        echo "✅ Backend ready"
        break
    fi
    sleep 1
done

# Start frontend
echo "🎨 Starting frontend (port 3002)..."
cd frontend
PORT=3002 npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ PARAGRAF running:"
echo "   Frontend: http://localhost:3002"
echo "   Backend:  http://localhost:8001"
echo "   API Docs: http://localhost:8001/docs"
echo ""
echo "   Press Ctrl+C to stop both"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
