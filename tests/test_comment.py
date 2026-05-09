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


def test_ai_comment_with_personality(client):
    upload_resp = client.post(
        "/api/v1/upload",
        files={"file": ("face.jpg", io.BytesIO(b"fake-face-data"), "image/jpeg")},
    )
    image_id = upload_resp.json()["data"]["image_id"]

    for personality in ("warm_bestie", "sassy_stylist", "knowledge_blogger"):
        response = client.post(
            "/api/v1/ai-comment",
            json={
                "image_id": image_id,
                "hairstyle_info": "微卷中长发",
                "personality_type": personality,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["personality"] == personality
        assert "comment_text" in data["data"]


def test_ai_comment_with_hairstyle_id(client):
    upload_resp = client.post(
        "/api/v1/upload",
        files={"file": ("face.jpg", io.BytesIO(b"fake-face-data"), "image/jpeg")},
    )
    image_id = upload_resp.json()["data"]["image_id"]

    # Trigger seed data
    client.get("/api/v1/hairstyles")

    response = client.post(
        "/api/v1/ai-comment",
        json={
            "image_id": image_id,
            "hairstyle_id": "hs-001",
            "personality_type": "warm_bestie",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["hairstyle_id"] == "hs-001"


def test_ai_comment_invalid_image(client):
    response = client.post(
        "/api/v1/ai-comment",
        json={
            "image_id": "non-existent-id",
            "hairstyle_info": "清爽短发",
        },
    )
    assert response.status_code == 404
