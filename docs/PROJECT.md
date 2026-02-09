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
make release
```

## Batch CLI
```bash
.venv/bin/python scripts/batch_cli.py --input ./photos --output ./outputs --format jpeg --continue-on-error
```

## Environment
- Python 3.11+

## Next 3 improvements
1. Add a batch CLI helper for non-UI workflows (process a folder to outputs/ + optional ZIP).
2. Add WebP output option with feature detection.
3. Add “profile suggestions” (auto-name saved profiles based on use-case/preset/style) to reduce friction.
