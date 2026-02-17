.PHONY: setup dev test lint typecheck build check smoke bench secret-scan runner-prereqs release

VENV ?= .venv
BOOTSTRAP_PYTHON ?= python3
VENV_PY := $(VENV)/bin/python
VENV_PIP := $(VENV)/bin/pip

ifeq ($(wildcard $(VENV_PY)),)
PYTHON ?= python3
PIP ?= $(PYTHON) -m pip
else
PYTHON := $(VENV_PY)
PIP := $(VENV_PIP)
endif

setup:
	$(BOOTSTRAP_PYTHON) -m venv $(VENV)
	$(VENV_PIP) install --upgrade pip
	$(VENV_PIP) install -e ".[dev]"

dev:
	$(PYTHON) -m uvicorn ai_headshot_studio.app:app --reload --port 8000

test:
	$(PYTHON) -m pytest

lint:
	$(PYTHON) -m ruff check .
	$(PYTHON) -m ruff format --check .

typecheck:
	$(PYTHON) -m mypy src/ai_headshot_studio

build:
	$(PYTHON) -m build

check: lint typecheck test

smoke:
	PYTHON_BIN="$(PYTHON)" ./scripts/smoke_api.sh

bench:
	$(PYTHON) ./scripts/bench_processing.py

runner-prereqs:
	./scripts/verify_self_hosted_runner.sh

secret-scan:
	./scripts/run_gitleaks.sh

release: build
	@echo "Release artifact built in dist/"
