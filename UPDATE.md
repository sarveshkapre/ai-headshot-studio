# Update (2026-02-01)

## Summary
- Shipped offline-first UI polish (removed Google Fonts), better error UX, and improved keyboard accessibility.
- Made image processing more robust (EXIF auto-orientation, tighter request normalization, and upload size-limited reads).

## Verification
Commands run:
- `make check`
- `make build`

## PR
If `gh` is available and you’re authenticated:
- `git push -u origin <branch>`
- `gh pr create --fill`

If not:
- Push the branch, then open a PR in GitHub with title: `Headshot Studio: UX polish + EXIF orientation`
