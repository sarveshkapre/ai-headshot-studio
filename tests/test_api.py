from __future__ import annotations

import io
import zipfile

from fastapi.testclient import TestClient
from PIL import Image

from ai_headshot_studio.app import app

client = TestClient(app)


def make_image(width: int = 1200, height: int = 1600) -> bytes:
    image = Image.new("RGB", (width, height), (120, 140, 160))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_health_includes_diagnostics() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["service"] == "ai-headshot-studio"
    assert isinstance(data["version"], str)
    assert data["limits"]["max_upload_mb"] == 12
    assert data["limits"]["max_upload_bytes"] == 12 * 1024 * 1024
    assert "max_pixels" in data["limits"]
    assert "background_removal" in data["features"]
    assert data["features"]["background_removal"]["mode"] == "local"


def test_presets_returns_presets_and_styles() -> None:
    response = client.get("/api/presets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["presets"], list)
    assert isinstance(data["styles"], list)
    assert any(item["key"] == "portrait-4x5" for item in data["presets"])
    assert any(item["key"] == "classic" for item in data["styles"])


def test_process_returns_image_with_metadata_headers() -> None:
    payload = make_image()
    response = client.post(
        "/api/process",
        files={"image": ("input.png", payload, "image/png")},
        data={
            "remove_bg": "false",
            "background": "white",
            "preset": "passport-2x2",
            "format": "jpeg",
        },
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/jpeg")
    assert response.headers["x-output-width"] == "600"
    assert response.headers["x-output-height"] == "600"
    assert response.headers["x-output-format"] == "jpeg"
    assert int(response.headers["x-output-bytes"]) > 0
    assert int(response.headers["x-processing-ms"]) >= 0


def test_process_rejects_invalid_custom_background_hex() -> None:
    payload = make_image()
    response = client.post(
        "/api/process",
        files={"image": ("input.png", payload, "image/png")},
        data={
            "remove_bg": "false",
            "background": "custom",
            "background_hex": "#12",
            "preset": "portrait-4x5",
            "format": "png",
        },
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_color"
    assert detail["message"] == "Invalid custom background color."


def test_process_rejects_unsupported_format() -> None:
    payload = make_image()
    response = client.post(
        "/api/process",
        files={"image": ("input.png", payload, "image/png")},
        data={
            "remove_bg": "false",
            "background": "white",
            "preset": "portrait-4x5",
            "format": "webp",
        },
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "unsupported_output_format"
    assert detail["message"] == "Unsupported output format."


def test_process_rejects_invalid_image_bytes() -> None:
    response = client.post(
        "/api/process",
        files={"image": ("input.png", b"not an image", "image/png")},
        data={
            "remove_bg": "false",
            "background": "white",
            "preset": "portrait-4x5",
            "format": "png",
        },
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "invalid_image"


def test_process_rejects_unsupported_image_format() -> None:
    # GIF is a common image type but not a target export format for this studio.
    image = Image.new("RGB", (100, 120), (120, 140, 160))
    buffer = io.BytesIO()
    image.save(buffer, format="GIF")
    payload = buffer.getvalue()
    response = client.post(
        "/api/process",
        files={"image": ("input.gif", payload, "image/gif")},
        data={
            "remove_bg": "false",
            "background": "white",
            "preset": "portrait-4x5",
            "format": "png",
        },
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "unsupported_image_format"


def test_batch_returns_zip_with_processed_images() -> None:
    payload1 = make_image()
    payload2 = make_image(width=900, height=1200)
    response = client.post(
        "/api/batch",
        files=[
            ("images", ("a.png", payload1, "image/png")),
            ("images", ("b.png", payload2, "image/png")),
        ],
        data={
            "remove_bg": "false",
            "background": "white",
            "preset": "passport-2x2",
            "format": "jpeg",
            "folder": "My Batch",
        },
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/zip")
    assert response.headers["x-batch-count"] == "2"
    assert response.headers["x-output-format"] == "jpeg"

    buffer = io.BytesIO(response.content)
    with zipfile.ZipFile(buffer) as archive:
        names = archive.namelist()
        assert len(names) == 2
        assert all(name.startswith("My-Batch/") for name in names)
        assert all(name.endswith(".jpg") for name in names)

        sample = Image.open(io.BytesIO(archive.read(names[0])))
        assert sample.size == (600, 600)
