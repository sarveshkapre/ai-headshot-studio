# PROJECT

## Commands
```bash
make setup
make dev
make test
make lint
make typecheck
make build
make check
make smoke
make bench
make runner-prereqs
make secret-scan
make release
```

## Batch CLI
```bash
.venv/bin/python scripts/batch_cli.py --input ./photos --output ./outputs --format jpeg --continue-on-error
```

## Environment
- Python 3.11+

## Next 3 improvements
1. Add a visual regression smoke script for `src/ai_headshot_studio/static/` workflow interactions (optional, fast, deterministic).
2. Add optional runner labels/groups in workflows once dedicated CI hosts are provisioned.
3. Add on-device model selection (tradeoff UX: speed vs quality) for background removal.
