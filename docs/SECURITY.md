# Security

## Supported Versions
Only the latest release is supported.

## Reporting
Please open a private security advisory on GitHub with details and reproduction steps.

## Threat Model Notes
- Untrusted input images: validate size and format.
- Resource usage: enforce size limits and avoid infinite loops.
- No network calls in processing pipeline.
