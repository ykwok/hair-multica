"""Hairstyle endpoint tests."""


def test_list_hairstyles(client):
    response = client.get("/api/v1/hairstyles")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"]["items"], list)
    assert data["data"]["total"] >= 30


def test_list_hairstyles_filter_category(client):
    response = client.get("/api/v1/hairstyles?category=male")
    assert response.status_code == 200
    data = response.json()
    assert all(item["category"] == "male" for item in data["data"]["items"])


def test_list_hairstyles_filter_length(client):
    response = client.get("/api/v1/hairstyles?length=short")
    assert response.status_code == 200
    data = response.json()
    assert all(item["length"] == "short" for item in data["data"]["items"])


def test_list_hairstyles_filter_scene(client):
    response = client.get("/api/v1/hairstyles?scene=work")
    assert response.status_code == 200
    data = response.json()
    assert all(item["scene"] == "work" for item in data["data"]["items"])


def test_list_hairstyles_filter_face_type(client):
    response = client.get("/api/v1/hairstyles?face_type=oval")
    assert response.status_code == 200
    data = response.json()
    # face_type is stored as JSON string; basic ilike should match
    assert len(data["data"]["items"]) > 0


def test_list_hairstyles_keyword_search(client):
    response = client.get("/api/v1/hairstyles?keyword=清爽")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) > 0
    # At least one result should contain the keyword in name or description
    assert any("清爽" in (item["name"] + item.get("description", "")) for item in data["data"]["items"])


def test_list_hairstyles_pagination(client):
    response = client.get("/api/v1/hairstyles?page=1&per_page=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) <= 5
    assert data["meta"]["page"] == 1
    assert data["meta"]["per_page"] == 5


def test_list_hairstyles_combined_filters(client):
    response = client.get("/api/v1/hairstyles?category=female&length=long&scene=daily")
    assert response.status_code == 200
    data = response.json()
    for item in data["data"]["items"]:
        assert item["category"] == "female"
        assert item["length"] == "long"
        assert item["scene"] == "daily"
