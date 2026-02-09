from __future__ import annotations

import io
import json
import subprocess
import sys

from PIL import Image


def make_image_bytes(width: int = 1200, height: int = 1600) -> bytes:
    image = Image.new("RGB", (width, height), (120, 140, 160))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def run_cli(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "scripts/batch_cli.py", *args],
        check=False,
        capture_output=True,
        text=True,
    )


def test_batch_cli_writes_outputs(tmp_path) -> None:
    input_dir = tmp_path / "inputs"
    output_dir = tmp_path / "outputs"
    input_dir.mkdir()
    (input_dir / "a.png").write_bytes(make_image_bytes())
    (input_dir / "b.png").write_bytes(make_image_bytes(width=900, height=1200))

    result = run_cli(["--input", str(input_dir), "--output", str(output_dir), "--format", "jpeg"])
    assert result.returncode == 0

    outputs = sorted(path.name for path in output_dir.iterdir() if path.is_file())
    assert any(name.endswith(".jpg") for name in outputs)
    assert "errors.json" not in outputs


def test_batch_cli_continue_on_error_emits_errors_json_and_zip(tmp_path) -> None:
    input_dir = tmp_path / "inputs"
    output_dir = tmp_path / "outputs"
    zip_path = tmp_path / "batch.zip"
    input_dir.mkdir()
    (input_dir / "a.png").write_bytes(make_image_bytes())
    (input_dir / "b.png").write_bytes(b"not an image")

    result = run_cli(
        [
            "--input",
            str(input_dir),
            "--output",
            str(output_dir),
            "--format",
            "jpeg",
            "--continue-on-error",
            "--zip",
            str(zip_path),
        ]
    )
    assert result.returncode == 1
    assert (output_dir / "errors.json").exists()
    report = json.loads((output_dir / "errors.json").read_text(encoding="utf-8"))
    assert report["total"] == 2
    assert report["succeeded"] == 1
    assert report["failed"] == 1
    assert zip_path.exists()
