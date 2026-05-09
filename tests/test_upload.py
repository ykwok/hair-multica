"""Upload endpoint tests."""

import io


def test_upload_image_success(client):
    image_bytes = io.BytesIO(b"fake-image-data").read()
    response = client.post(
        "/api/v1/upload",
        files={"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "image_id" in data["data"]
    assert "url" in data["data"]


def test_upload_invalid_type(client):
    response = client.post(
        "/api/v1/upload",
        files={"file": ("test.txt", io.BytesIO(b"text"), "text/plain")},
    )
    assert response.status_code == 400


def test_upload_too_large(client):
    big = io.BytesIO(b"x" * (11 * 1024 * 1024))
    response = client.post(
        "/api/v1/upload",
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert response.status_code == 413
