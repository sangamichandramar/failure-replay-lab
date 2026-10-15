"""
Tests for Failure Replay Lab REST API Endpoints
"""

import sys
import os
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from database import get_db, serialize_doc
from seed_data import seed_database

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def ensure_seed():
    """Ensure database has seed data before running tests."""
    seed_database()

def test_health_endpoint(client):
    """Test GET /api/health returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database" in data
    assert data["database"]["connected"] is True
    assert data["database"]["counts"]["incidents"] >= 4

def test_dashboard_endpoint(client):
    """Test GET /api/dashboard returns computed metrics."""
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.get_json()
    assert "metrics" in data
    assert data["metrics"]["total_incidents"] >= 4
    assert data["metrics"]["critical_incidents"] >= 1
    assert data["metrics"]["resolved_incidents"] >= 3
    assert data["metrics"]["avg_recovery_time_minutes"] > 0
    assert "severity_distribution" in data
    assert "services" in data
    assert len(data["recent_incidents"]) <= 5

def test_list_incidents(client):
    """Test GET /api/incidents returns list of incidents."""
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] >= 4
    assert len(data["incidents"]) >= 4
    # Check required fields
    first = data["incidents"][0]
    assert "incident_id" in first
    assert "title" in first
    assert "severity" in first
    assert "status" in first

def test_incident_filters_and_search(client):
    """Test filtering by severity and searching by text."""
    # Filter by critical
    res_crit = client.get("/api/incidents?severity=critical")
    assert res_crit.status_code == 200
    crit_incidents = res_crit.get_json()["incidents"]
    assert all(i["severity"] == "critical" for i in crit_incidents)

    # Search for connection pool
    res_search = client.get("/api/incidents?search=Connection")
    assert res_search.status_code == 200
    search_data = res_search.get_json()
    assert search_data["count"] >= 1
    assert any("INC-2024-001" == i["incident_id"] for i in search_data["incidents"])

def test_get_individual_incident(client):
    """Test GET /api/incidents/<id> for valid and invalid IDs."""
    # Valid
    res_valid = client.get("/api/incidents/INC-2024-001")
    assert res_valid.status_code == 200
    inc = res_valid.get_json()["incident"]
    assert inc["incident_id"] == "INC-2024-001"
    assert "affected_services" in inc

    # Invalid ID
    res_invalid = client.get("/api/incidents/INC-NONEXISTENT-999")
    assert res_invalid.status_code == 404
    assert "error" in res_invalid.get_json()

def test_chronological_events(client):
    """Test GET /api/incidents/<id>/events returns events sorted by timestamp ascending."""
    response = client.get("/api/incidents/INC-2024-001/events")
    assert response.status_code == 200
    data = response.get_json()
    assert data["incident_id"] == "INC-2024-001"
    events = data["events"]
    assert len(events) >= 6

    # Verify chronological ordering
    for i in range(len(events) - 1):
        assert events[i]["timestamp"] <= events[i + 1]["timestamp"]

def test_incident_analysis_endpoint(client):
    """Test GET /api/incidents/<id>/analysis generates root cause analysis."""
    response = client.get("/api/incidents/INC-2024-001/analysis")
    assert response.status_code == 200
    data = response.get_json()
    analysis = data["analysis"]
    assert analysis["incident_id"] == "INC-2024-001"
    assert analysis["earliest_symptom"] is not None
    assert analysis["first_observed_failure"] is not None
    assert "suspected_root_cause" in analysis
    assert analysis["confidence_label"] in ["High", "Medium", "Low"]
    assert len(analysis["evidence"]) >= 3
    assert "suggested_recovery_action" in analysis

def test_list_and_get_services(client):
    """Test GET /api/services and GET /api/services/<name>."""
    response = client.get("/api/services")
    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 6

    # Check Database service
    res_svc = client.get("/api/services/Database")
    assert res_svc.status_code == 200
    svc_data = res_svc.get_json()
    assert svc_data["service"]["service_name"] == "Database"
    assert len(svc_data["affecting_incidents"]) >= 1

def test_create_and_delete_incident(client):
    """Test POST and DELETE /api/incidents."""
    test_id = "INC-TEST-999"
    new_inc = {
        "incident_id": test_id,
        "title": "Automated Integration Test Incident",
        "description": "Temporary record to verify CRUD functionality",
        "severity": "low",
        "status": "open",
        "affected_services": ["Frontend"]
    }
    # Create
    create_res = client.post("/api/incidents", json=new_inc)
    assert create_res.status_code == 201

    # Verify it exists
    get_res = client.get(f"/api/incidents/{test_id}")
    assert get_res.status_code == 200

    # Delete
    del_res = client.delete(f"/api/incidents/{test_id}")
    assert del_res.status_code == 200

    # Verify 404 after delete
    get_after = client.get(f"/api/incidents/{test_id}")
    assert get_after.status_code == 404
