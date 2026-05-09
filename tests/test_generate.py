"""Hairstyle generation endpoint tests."""

import io
import time


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
    assert "task_id" in data["data"]
    assert data["data"]["status"] == "pending"

    task_id = data["data"]["task_id"]

    # Poll task status (mock provider is fast, but allow a few retries)
    for _ in range(10):
        task_resp = client.get(f"/api/v1/tasks/{task_id}")
        assert task_resp.status_code == 200
        task_data = task_resp.json()["data"]
        if task_data["status"] in ("success", "failed"):
            break
        time.sleep(0.2)

    assert task_data["status"] == "success"
    assert task_data["result_url"] is not None
    assert "result" in task_data
    assert task_data["result"]["result_image_url"] != ""


def test_generate_hairstyle_preview_mode(client):
    upload_resp = client.post(
        "/api/v1/upload",
        files={"file": ("face.jpg", io.BytesIO(b"fake-face-data"), "image/jpeg")},
    )
    image_id = upload_resp.json()["data"]["image_id"]

    response = client.post(
        "/api/v1/generate-hairstyle",
        json={
            "image_id": image_id,
            "custom_prompt": "Short bob",
            "mode": "preview",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "task_id" in data["data"]


def test_generate_hairstyle_not_found(client):
    response = client.post(
        "/api/v1/generate-hairstyle",
        json={
            "image_id": "non-existent-id",
            "custom_prompt": "Test",
        },
    )
    assert response.status_code == 404


def test_get_task_not_found(client):
    response = client.get("/api/v1/tasks/non-existent-id")
    assert response.status_code == 404
