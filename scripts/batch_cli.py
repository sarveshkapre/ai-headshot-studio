#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from ai_headshot_studio.processing import (
    ProcessingError,
    ProcessRequest,
    process_image,
    to_bytes,
)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="batch_cli.py",
        description="Apply AI Headshot Studio processing settings to a folder of images.",
    )
    parser.add_argument("--input", required=True, help="Input folder containing images.")
    parser.add_argument("--output", default="outputs", help="Output folder (default: outputs/).")
    parser.add_argument("--zip", dest="zip_path", default=None, help="Optional ZIP output path.")
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Continue processing after failures and write errors.json.",
    )
    parser.add_argument("--limit", type=int, default=0, help="Optional max images to process.")

    # Core processing options (subset of API fields).
    parser.add_argument("--remove-bg", action="store_true", help="Run local background removal.")
    parser.add_argument("--background", default="white")
    parser.add_argument("--background-hex", default=None)
    parser.add_argument("--preset", default="portrait-4x5")
    parser.add_argument("--style", default=None)
    parser.add_argument("--top-bias", type=float, default=0.2)
    parser.add_argument("--brightness", type=float, default=1.0)
    parser.add_argument("--contrast", type=float, default=1.0)
    parser.add_argument("--color", type=float, default=1.0)
    parser.add_argument("--sharpness", type=float, default=1.0)
    parser.add_argument("--soften", type=float, default=0.0)
    parser.add_argument("--jpeg-quality", type=int, default=92)
    parser.add_argument("--format", default="png", help="png|jpeg")
    return parser.parse_args(argv)


def iter_images(input_dir: Path) -> list[Path]:
    allowed = {".png", ".jpg", ".jpeg", ".webp"}
    candidates = [path for path in input_dir.iterdir() if path.is_file()]
    images = [path for path in candidates if path.suffix.lower() in allowed]
    return sorted(images, key=lambda p: p.name.lower())


def output_suffix(fmt: str) -> str:
    key = fmt.strip().lower()
    if key == "jpeg":
        return ".jpg"
    if key == "png":
        return ".png"
    return f".{key}"


def safe_stem(path: Path) -> str:
    stem = path.stem.strip() or "image"
    cleaned = "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "-" for ch in stem)
    cleaned = cleaned.strip(".-") or "image"
    return cleaned[:80]


def write_zip(zip_path: Path, files: list[Path], *, errors_path: Path | None) -> None:
    import zipfile

    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in files:
            archive.write(file_path, arcname=file_path.name)
        if errors_path is not None and errors_path.exists():
            archive.write(errors_path, arcname=errors_path.name)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    input_dir = Path(args.input).expanduser()
    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Input folder not found: {input_dir}", file=sys.stderr)
        return 2

    output_dir = Path(args.output).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)

    images = iter_images(input_dir)
    if args.limit and args.limit > 0:
        images = images[: args.limit]

    req = ProcessRequest(
        remove_bg=bool(args.remove_bg),
        background=str(args.background),
        background_hex=args.background_hex,
        preset=str(args.preset),
        style=args.style,
        top_bias=float(args.top_bias),
        brightness=float(args.brightness),
        contrast=float(args.contrast),
        color=float(args.color),
        sharpness=float(args.sharpness),
        soften=float(args.soften),
        jpeg_quality=int(args.jpeg_quality),
        output_format=str(args.format),
    )

    report: dict[str, object] = {
        "total": len(images),
        "succeeded": 0,
        "failed": 0,
        "errors": [],
        "settings": asdict(req),
    }

    written: list[Path] = []
    had_error = False

    for path in images:
        try:
            data = path.read_bytes()
            result = process_image(data, req)
            payload = to_bytes(result, req.output_format, req.jpeg_quality)
            out_name = safe_stem(path) + output_suffix(req.output_format)
            out_path = output_dir / out_name
            out_path.write_bytes(payload)
            written.append(out_path)
            report["succeeded"] = int(report["succeeded"]) + 1
            print(f"ok  {path.name} -> {out_path.name}")
        except (ProcessingError, OSError, ValueError) as exc:
            had_error = True
            report["failed"] = int(report["failed"]) + 1
            code = exc.code if isinstance(exc, ProcessingError) else "io_error"
            report["errors"].append({"file": path.name, "code": code, "message": str(exc)})
            print(f"err {path.name}: {code}: {exc}", file=sys.stderr)
            if not args.continue_on_error:
                break

    errors_path: Path | None = None
    if had_error or args.continue_on_error:
        errors_path = output_dir / "errors.json"
        errors_path.write_text(
            json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )

    if args.zip_path:
        write_zip(Path(args.zip_path).expanduser(), written, errors_path=errors_path)

    return 1 if had_error else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
