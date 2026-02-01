# AGENTS

## Scope
- This repo is a local-first headshot enhancement studio.
- No authentication; no external storage; no remote APIs.

## Conventions
- Python 3.11+, FastAPI backend, static frontend in `static/`.
- Keep UI minimal, keyboard-friendly, and accessible.
- Prefer small, explicit functions with type hints.

## Commands
- `make setup` — create venv + install deps
- `make dev` — run local server
- `make check` — lint + typecheck + tests

## Guardrails
- Never add secrets or external upload paths.
- Keep background removal optional and local-only.
- Maintain documented API parameters in `README.md`.
