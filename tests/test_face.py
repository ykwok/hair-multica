"""Face analysis endpoint tests."""

import io
import json


def test_analyze_face(client):
    # First upload an image
    upload_resp = client.post(
        "/api/v1/upload",
        files={"file": ("face.jpg", io.BytesIO(b"fake-face-data"), "image/jpeg")},
    )
    image_id = upload_resp.json()["data"]["image_id"]

    response = client.post(
        "/api/v1/analyze-face",
        json={"image_id": image_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "face_shape" in data["data"]
