def test_root_returns_api_info(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert "version" in body


def test_health_reports_dependencies(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()

    assert body["status"] in ("healthy", "degraded", "unhealthy")
    assert "available" in body["mongodb"]
    assert "available" in body["ffmpeg"]
    assert "available" in body["pyav"]
    assert body["pyav"]["available"] is True
    assert "input" in body["formats"] and "output" in body["formats"]


def test_docs_available(client):
    response = client.get("/docs")
    assert response.status_code == 200
