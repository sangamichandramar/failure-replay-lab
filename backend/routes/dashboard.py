"""
Failure Replay Lab - Dashboard Aggregation Route
------------------------------------------------
Computes dynamic high-level observability metrics from MongoDB:
- Total, critical, open, and resolved incidents
- Average recovery time for resolved incidents with valid timestamps
- Severity and status distributions
- Recent incident activity feed
- Current service health snapshot
"""

from datetime import datetime
from flask import Blueprint, jsonify
from database import get_db, serialize_doc, check_db_connection

dashboard_bp = Blueprint("dashboard", __name__)

def parse_iso_datetime(ts_str):
    """Safely parses ISO timestamp strings to datetime."""
    if not ts_str or not isinstance(ts_str, str):
        return None
    try:
        clean_ts = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean_ts)
    except Exception:
        return None

@dashboard_bp.route("/dashboard", methods=["GET"])
def get_dashboard_summary():
    """
    GET /api/dashboard
    Returns aggregated metrics computed directly from database collections.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({
            "error": "Database connection unavailable",
            "details": db_message
        }), 503

    db = get_db()

    # Retrieve all incidents and services
    incidents = list(db.incidents.find({}))
    services = list(db.services.find({}))

    total_incidents = len(incidents)
    critical_incidents = 0
    open_incidents = 0
    resolved_incidents = 0
    investigating_incidents = 0

    severity_counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
    }

    status_counts = {
        "open": 0,
        "investigating": 0,
        "resolved": 0
    }

    recovery_times_minutes = []

    for inc in incidents:
        sev = (inc.get("severity") or "").lower()
        if sev in severity_counts:
            severity_counts[sev] += 1
        if sev == "critical":
            critical_incidents += 1

        status = (inc.get("status") or "").lower()
        if status in status_counts:
            status_counts[status] += 1
        if status == "open":
            open_incidents += 1
        elif status == "resolved":
            resolved_incidents += 1
        elif status == "investigating":
            investigating_incidents += 1

        # Calculate recovery time for resolved incidents that have valid started_at and ended_at
        if status == "resolved":
            started = parse_iso_datetime(inc.get("started_at"))
            ended = parse_iso_datetime(inc.get("ended_at"))
            if started and ended and ended >= started:
                duration_mins = (ended - started).total_seconds() / 60.0
                recovery_times_minutes.append(duration_mins)

    # Compute average recovery time
    avg_recovery_time_minutes = (
        round(sum(recovery_times_minutes) / len(recovery_times_minutes), 1)
        if recovery_times_minutes else 0.0
    )

    # Sort recent incidents by started_at descending (newest first)
    sorted_incidents = sorted(
        incidents,
        key=lambda x: parse_iso_datetime(x.get("started_at")) or datetime.min,
        reverse=True
    )
    recent_incidents = [serialize_doc(inc) for inc in sorted_incidents[:5]]

    # Service health breakdown
    service_status_summary = {
        "total": len(services),
        "healthy": sum(1 for s in services if (s.get("status") or "").lower() == "healthy"),
        "degraded": sum(1 for s in services if (s.get("status") or "").lower() == "degraded"),
        "failed": sum(1 for s in services if (s.get("status") or "").lower() == "failed"),
        "affected": sum(1 for s in services if (s.get("status") or "").lower() == "affected")
    }

    return jsonify({
        "metrics": {
            "total_incidents": total_incidents,
            "critical_incidents": critical_incidents,
            "open_incidents": open_incidents,
            "investigating_incidents": investigating_incidents,
            "resolved_incidents": resolved_incidents,
            "avg_recovery_time_minutes": avg_recovery_time_minutes,
            "resolved_with_duration_count": len(recovery_times_minutes)
        },
        "severity_distribution": severity_counts,
        "status_distribution": status_counts,
        "services": {
            "summary": service_status_summary,
            "list": [serialize_doc(s) for s in services]
        },
        "recent_incidents": recent_incidents
    }), 200
