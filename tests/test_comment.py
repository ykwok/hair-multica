"""AI comment endpoint tests."""

import io


def test_ai_comment(client):
    upload_resp = client.post(
        "/api/v1/upload",
        files={"file": ("face.jpg", io.BytesIO(b"fake-face-data"), "image/jpeg")},
    )
    image_id = upload_resp.json()["data"]["image_id"]

    response = client.post(
        "/api/v1/ai-comment",
        json={
            "image_id": image_id,
            "hairstyle_info": "清爽短发",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "comment_text" in data["data"]
