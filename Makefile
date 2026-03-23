# PARAGRAF — Makefile
.PHONY: dev test build backup clean

# Development
dev:
	@echo "Starting PARAGRAF..."
	@cd backend && python3 -m uvicorn main:app --port 8001 --reload &
	@cd frontend && PORT=3002 npm run dev &
	@echo "Backend: http://localhost:8001"
	@echo "Frontend: http://localhost:3002"
	@echo "Swagger: http://localhost:8001/docs"

# Backend only
backend:
	cd backend && python3 -m uvicorn main:app --port 8001 --reload

# Frontend only
frontend:
	cd frontend && PORT=3002 npm run dev

# Run all tests
test:
	cd backend && python3 -m pytest tests/ -v --tb=short

# Quick test
test-quick:
	cd backend && python3 -m pytest tests/test_api.py tests/test_advanced.py -q

# Production build
build:
	cd frontend && npx next build

# Database backup
backup:
	curl -s -X POST http://localhost:8001/api/backup | python3 -m json.tool

# Import from Excel
import:
	curl -s -X POST http://localhost:8001/api/import/excel | python3 -m json.tool

# Daily check
check:
	python3 scripts/daily_check.py

# Run quality check
quality:
	curl -s http://localhost:8001/api/quality | python3 -m json.tool

# Clean generated files
clean:
	rm -rf backend/output/contracts/*.docx
	rm -rf backend/__pycache__ backend/**/__pycache__
	rm -rf frontend/.next

# Show stats
stats:
	@curl -s http://localhost:8001/ | python3 -m json.tool
	@echo ""
	@curl -s http://localhost:8001/api/contracts/stats | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Contracts: {d[\"total\"]} | Active: {d[\"by_status\"].get(\"aktywna\",0)}')"
