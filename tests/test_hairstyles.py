"""Hairstyle endpoint tests."""


def test_list_hairstyles(client):
    response = client.get("/api/v1/hairstyles")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"]["items"], list)
    assert data["data"]["total"] > 0


def test_list_hairstyles_filter_category(client):
    response = client.get("/api/v1/hairstyles?category=male")
    assert response.status_code == 200
    data = response.json()
    assert all(item["category"] == "male" for item in data["data"]["items"])
