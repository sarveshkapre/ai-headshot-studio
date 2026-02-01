.PHONY: setup dev test lint typecheck build check release

VENV=.venv
PY=$(VENV)/bin/python
PIP=$(VENV)/bin/pip

setup:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[dev]"

dev:
	$(VENV)/bin/uvicorn ai_headshot_studio.app:app --reload --port 8000

test:
	$(VENV)/bin/pytest

lint:
	$(VENV)/bin/ruff check .
	$(VENV)/bin/ruff format --check .

typecheck:
	$(VENV)/bin/mypy src/ai_headshot_studio

build:
	$(PY) -m build

check: lint typecheck test

release: build
	@echo "Release artifact built in dist/"
