from app.database import get_db
from app.main import app


def test_health_checks_the_database(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "connected"}


def test_health_reports_database_failure(client):
    original_override = app.dependency_overrides[get_db]

    class BrokenSession:
        def execute(self, _statement):
            raise RuntimeError("database unavailable")

    def broken_database():
        yield BrokenSession()

    app.dependency_overrides[get_db] = broken_database
    try:
        response = client.get("/health")
    finally:
        app.dependency_overrides[get_db] = original_override

    assert response.status_code == 503
    assert response.json() == {"detail": "Database connection failed"}
