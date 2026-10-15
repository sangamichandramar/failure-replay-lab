"""
Tests for Root Cause Analysis Engine Rules and Logic
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.root_cause_engine import analyze_incident, parse_iso_timestamp

def test_parse_iso_timestamp():
    """Verify timestamp parser handles Z and offset representations correctly."""
    t1 = parse_iso_timestamp("2024-10-12T14:10:00Z")
    t2 = parse_iso_timestamp("2024-10-12T14:15:00Z")
    assert t1 < t2
    # Invalid timestamp returns datetime.min
    assert parse_iso_timestamp("") < t1
    assert parse_iso_timestamp(None) < t1

def test_empty_events_analysis():
    """Verify engine handles incidents with no events gracefully without crashing."""
    incident = {
        "incident_id": "INC-EMPTY",
        "title": "Incident without events",
        "suspected_root_cause": "Under investigation",
        "recovery_action": "Check metrics"
    }
    result = analyze_incident(incident, [])
    assert result["status"] == "insufficient_data"
    assert result["confidence_label"] == "Low"
    assert result["earliest_symptom"] is None

def test_database_pattern_matching():
    """Verify database connection pool heuristics."""
    incident = {
        "incident_id": "INC-TEST-DB",
        "title": "DB Issue",
        "affected_services": ["Database", "Order Service"]
    }
    events = [
        {
            "event_id": "E1",
            "timestamp": "2024-10-12T14:00:00Z",
            "service_name": "Database",
            "severity": "warning",
            "event_type": "metric_anomaly",
            "description": "Database query latency spikes"
        },
        {
            "event_id": "E2",
            "timestamp": "2024-10-12T14:05:00Z",
            "service_name": "Database",
            "severity": "critical",
            "event_type": "error",
            "description": "Database connection pool exhausted"
        },
        {
            "event_id": "E3",
            "timestamp": "2024-10-12T14:10:00Z",
            "service_name": "Order Service",
            "severity": "critical",
            "event_type": "error",
            "description": "Order Service 500 error"
        }
    ]
    analysis = analyze_incident(incident, events)
    assert analysis["confidence_label"] == "High"
    assert "Database Connection Pool" in analysis["suspected_root_cause"]
    assert analysis["earliest_symptom"]["event_id"] == "E1"
    assert analysis["first_observed_failure"]["event_id"] == "E2"
    # Order Service is downstream
    downstream_svcs = [d["service_name"] for d in analysis["downstream_effects"]]
    assert "Order Service" in downstream_svcs

def test_deployment_pattern_matching():
    """Verify deployment regression heuristics."""
    incident = {"incident_id": "INC-DEP", "title": "Deployment Failure"}
    events = [
        {
            "event_id": "E1",
            "timestamp": "2024-10-13T09:00:00Z",
            "service_name": "Order Service",
            "severity": "info",
            "event_type": "deployment",
            "description": "Version 2.0 deployed"
        },
        {
            "event_id": "E2",
            "timestamp": "2024-10-13T09:02:00Z",
            "service_name": "Order Service",
            "severity": "critical",
            "event_type": "error",
            "description": "NullPointerException on checkout"
        }
    ]
    analysis = analyze_incident(incident, events)
    assert "Post-Deployment Regression" in analysis["suspected_root_cause"]
    assert analysis["confidence_label"] == "High"
    assert "rollback" in analysis["suggested_recovery_action"].lower()
