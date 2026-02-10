#!/usr/bin/env python3
from __future__ import annotations

import argparse
import io
import statistics
import sys
import time
from pathlib import Path


def _ensure_import_path() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))


def _make_png(width: int, height: int) -> bytes:
    from PIL import Image

    image = Image.new("RGB", (width, height), (120, 140, 160))
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def main() -> int:
    parser = argparse.ArgumentParser(description="Local processing micro-benchmark (best-effort).")
    parser.add_argument("--width", type=int, default=1800)
    parser.add_argument("--height", type=int, default=2400)
    parser.add_argument("--iters", type=int, default=12)
    parser.add_argument("--warmup", type=int, default=2)
    parser.add_argument("--format", choices=["png", "jpeg", "webp"], default="jpeg")
    args = parser.parse_args()

    if args.iters <= 0:
        raise SystemExit("--iters must be > 0")

    _ensure_import_path()

    from ai_headshot_studio.processing import ProcessRequest, process_image, to_bytes

    data = _make_png(args.width, args.height)
    req = ProcessRequest(
        remove_bg=False,
        background="white",
        background_hex=None,
        preset="portrait-4x5",
        style="classic",
        top_bias=0.2,
        brightness=1.0,
        contrast=1.0,
        color=1.0,
        sharpness=1.0,
        soften=0.0,
        jpeg_quality=92,
        output_format=args.format,
    )

    times_ms: list[float] = []
    payload_len = 0

    total = args.warmup + args.iters
    for i in range(total):
        start = time.perf_counter()
        result = process_image(data, req)
        payload = to_bytes(result, args.format, req.jpeg_quality)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        if i >= args.warmup:
            times_ms.append(elapsed_ms)
            payload_len = len(payload)

    times_ms.sort()
    p50 = statistics.median(times_ms)
    p95_index = max(0, min(len(times_ms) - 1, int(round(len(times_ms) * 0.95)) - 1))
    p95 = times_ms[p95_index]

    print(
        "bench_processing:",
        f"{args.width}x{args.height}",
        "preset=portrait-4x5",
        f"format={args.format}",
        f"iters={args.iters}",
        f"p50_ms={p50:.1f}",
        f"p95_ms={p95:.1f}",
        f"bytes={payload_len}",
        sep=" ",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
