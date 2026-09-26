.PHONY: help setup dev dev-api dev-web seed test test-api docker-up docker-down lint format

help:
	@echo "NyayRaksha — Secure Digital Document Management System"
	@echo "Commands:"
	@echo "  make setup        - Install backend & frontend dependencies"
	@echo "  make dev          - Run both backend and frontend concurrently"
	@echo "  make dev-api      - Run FastAPI backend locally (port 8000)"
	@echo "  make dev-web      - Run Next.js frontend locally (port 3000)"
	@echo "  make seed         - Seed database with demo roles, cases & documents"
	@echo "  make test         - Run full test suite"
	@echo "  make test-api     - Run backend pytest tests"
	@echo "  make docker-up    - Start full stack using Docker Compose"
	@echo "  make docker-down  - Stop Docker Compose services"

setup:
	@echo "Installing backend dependencies..."
	python -m pip install --upgrade pip
	pip install -r apps/api/requirements.txt
	@echo "Installing frontend dependencies..."
	cd apps/web && npm install

dev-api:
	cd apps/api && python main.py

dev-web:
	cd apps/web && npm run dev

seed:
	cd apps/api && python -m app.db.seed

test-api:
	cd apps/api && pytest -v

test: test-api

docker-up:
	docker compose up -d

docker-down:
	docker compose down -v
