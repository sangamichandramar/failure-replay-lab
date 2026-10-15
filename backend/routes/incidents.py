"""
Failure Replay Lab - Incidents Route
------------------------------------
Handles CRUD operations for incidents, event retrieval sorted chronologically,
and triggers the root-cause analysis engine.
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from database import get_db, serialize_doc, check_db_connection
from services.root_cause_engine import analyze_incident, parse_iso_timestamp

incidents_bp = Blueprint("incidents", __name__)

VALID_SEVERITIES = {"critical", "high", "medium", "low"}
VALID_STATUSES = {"open", "investigating", "resolved"}

@incidents_bp.route("/incidents", methods=["GET"])
def list_incidents():
    """
    GET /api/incidents
    Query parameters:
    - search: Filter by incident_id or title
    - severity: Filter by critical, high, medium, low
    - status: Filter by open, investigating, resolved
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    db = get_db()
    query = {}

    search = request.args.get("search", "").strip()
    severity = request.args.get("severity", "").strip().lower()
    status = request.args.get("status", "").strip().lower()

    if search:
        query["$or"] = [
            {"incident_id": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}}
        ]

    if severity and severity in VALID_SEVERITIES:
        query["severity"] = severity

    if status and status in VALID_STATUSES:
        query["status"] = status

    incidents = list(db.incidents.find(query))
    
    # Sort newest first by started_at
    sorted_incidents = sorted(
        incidents,
        key=lambda x: parse_iso_timestamp(x.get("started_at")),
        reverse=True
    )

    return jsonify({
        "count": len(sorted_incidents),
        "incidents": [serialize_doc(inc) for inc in sorted_incidents]
    }), 200

@incidents_bp.route("/incidents/<incident_id>", methods=["GET"])
def get_incident(incident_id):
    """
    GET /api/incidents/<incident_id>
    Fetches an individual incident by its business key (e.g. INC-2024-001).
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    db = get_db()
    incident = db.incidents.find_one({"incident_id": incident_id})

    if not incident:
        return jsonify({
            "error": "Incident not found",
            "message": f"No incident with ID '{incident_id}' exists."
        }), 404

    return jsonify({"incident": serialize_doc(incident)}), 200

@incidents_bp.route("/incidents/<incident_id>/events", methods=["GET"])
def get_incident_events(incident_id):
    """
    GET /api/incidents/<incident_id>/events
    Retrieves all events for the given incident, guaranteed chronologically sorted.
    This is the core data feeder for the Replay Lab engine.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    db = get_db()
    incident = db.incidents.find_one({"incident_id": incident_id})
    if not incident:
        return jsonify({"error": "Incident not found", "incident_id": incident_id}), 404

    events = list(db.events.find({"incident_id": incident_id}))

    # Sort events strictly by timestamp ascending (earliest to latest)
    events_sorted = sorted(events, key=lambda e: parse_iso_timestamp(e.get("timestamp")))

    return jsonify({
        "incident_id": incident_id,
        "count": len(events_sorted),
        "events": [serialize_doc(e) for e in events_sorted]
    }), 200

@incidents_bp.route("/incidents/<incident_id>/analysis", methods=["GET"])
def get_incident_analysis(incident_id):
    """
    GET /api/incidents/<incident_id>/analysis
    Runs the deterministic root cause engine over the incident's event stream.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    db = get_db()
    incident = db.incidents.find_one({"incident_id": incident_id})
    if not incident:
        return jsonify({"error": "Incident not found", "incident_id": incident_id}), 404

    events = list(db.events.find({"incident_id": incident_id}))
    services = list(db.services.find({}))

    analysis = analyze_incident(incident, events, services)
    return jsonify({"analysis": analysis}), 200

@incidents_bp.route("/incidents", methods=["POST"])
def create_incident():
    """
    POST /api/incidents
    Creates a new incident record.
    Validates required fields: incident_id, title, severity, status, affected_services.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body", "message": "Expected JSON payload"}), 400

    incident_id = data.get("incident_id", "").strip()
    title = data.get("title", "").strip()
    severity = data.get("severity", "").strip().lower()
    status = data.get("status", "").strip().lower()
    started_at = data.get("started_at", "").strip() or datetime.now(timezone.utc).isoformat()

    # Validation
    if not incident_id or not title:
        return jsonify({"error": "Validation failed", "message": "'incident_id' and 'title' are required"}), 400

    if severity not in VALID_SEVERITIES:
        return jsonify({
            "error": "Validation failed",
            "message": f"Invalid severity '{severity}'. Must be one of: {list(VALID_SEVERITIES)}"
        }), 400

    if status not in VALID_STATUSES:
        return jsonify({
            "error": "Validation failed",
            "message": f"Invalid status '{status}'. Must be one of: {list(VALID_STATUSES)}"
        }), 400

    db = get_db()
    if db.incidents.find_one({"incident_id": incident_id}):
        return jsonify({
            "error": "Conflict",
            "message": f"Incident with ID '{incident_id}' already exists."
        }), 409

    new_incident = {
        "incident_id": incident_id,
        "title": title,
        "description": data.get("description", "").strip(),
        "severity": severity,
        "status": status,
        "started_at": started_at,
        "ended_at": data.get("ended_at"),
        "affected_services": data.get("affected_services", []),
        "suspected_root_cause": data.get("suspected_root_cause", ""),
        "recovery_action": data.get("recovery_action", "")
    }

    result = db.incidents.insert_one(new_incident)
    new_incident["_id"] = str(result.inserted_id)

    return jsonify({
        "message": "Incident created successfully",
        "incident": serialize_doc(new_incident)
    }), 201

@incidents_bp.route("/incidents/<incident_id>", methods=["PUT"])
def update_incident(incident_id):
    """
    PUT /api/incidents/<incident_id>
    Updates an existing incident.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body", "message": "Expected JSON payload"}), 400

    db = get_db()
    existing = db.incidents.find_one({"incident_id": incident_id})
    if not existing:
        return jsonify({"error": "Incident not found", "incident_id": incident_id}), 404

    update_fields = {}
    if "title" in data:
        update_fields["title"] = data["title"].strip()
    if "description" in data:
        update_fields["description"] = data["description"].strip()
    if "severity" in data:
        sev = data["severity"].strip().lower()
        if sev not in VALID_SEVERITIES:
            return jsonify({"error": "Invalid severity", "allowed": list(VALID_SEVERITIES)}), 400
        update_fields["severity"] = sev
    if "status" in data:
        st = data["status"].strip().lower()
        if st not in VALID_STATUSES:
            return jsonify({"error": "Invalid status", "allowed": list(VALID_STATUSES)}), 400
        update_fields["status"] = st
    if "ended_at" in data:
        update_fields["ended_at"] = data["ended_at"]
    if "affected_services" in data:
        update_fields["affected_services"] = data["affected_services"]
    if "suspected_root_cause" in data:
        update_fields["suspected_root_cause"] = data["suspected_root_cause"].strip()
    if "recovery_action" in data:
        update_fields["recovery_action"] = data["recovery_action"].strip()

    if update_fields:
        db.incidents.update_one({"incident_id": incident_id}, {"$set": update_fields})

    updated = db.incidents.find_one({"incident_id": incident_id})
    return jsonify({
        "message": "Incident updated successfully",
        "incident": serialize_doc(updated)
    }), 200

@incidents_bp.route("/incidents/<incident_id>", methods=["DELETE"])
def delete_incident(incident_id):
    """
    DELETE /api/incidents/<incident_id>
    Deletes an incident and cascades delete to its associated events.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    db = get_db()
    existing = db.incidents.find_one({"incident_id": incident_id})
    if not existing:
        return jsonify({"error": "Incident not found", "incident_id": incident_id}), 404

    # Delete incident
    db.incidents.delete_one({"incident_id": incident_id})
    # Cascading delete events
    evt_res = db.events.delete_many({"incident_id": incident_id})

    return jsonify({
        "message": f"Incident '{incident_id}' and {evt_res.deleted_count} associated events deleted.",
        "incident_id": incident_id,
        "events_deleted": evt_res.deleted_count
    }), 200
