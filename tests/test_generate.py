"""Hairstyle generation endpoint tests."""

import io


def test_generate_hairstyle(client):
    upload_resp = client.post(
        "/api/v1/upload",
        files={"file": ("face.jpg", io.BytesIO(b"fake-face-data"), "image/jpeg")},
    )
    image_id = upload_resp.json()["data"]["image_id"]

    response = client.post(
        "/api/v1/generate-hairstyle",
        json={
            "image_id": image_id,
            "custom_prompt": "Give me a cool undercut",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "result_image_url" in data["data"]
