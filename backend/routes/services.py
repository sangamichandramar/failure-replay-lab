"""
Failure Replay Lab - Services Route
-----------------------------------
Handles CRUD operations for microservices in the architecture map,
inspects service dependencies, and tracks affected status during incidents.
"""

from flask import Blueprint, request, jsonify
from database import get_db, serialize_doc, check_db_connection

services_bp = Blueprint("services", __name__)

VALID_SERVICE_STATUSES = {"healthy", "degraded", "failed", "affected"}

@services_bp.route("/services", methods=["GET"])
def list_services():
    """
    GET /api/services
    Returns all registered microservices, their dependencies, and current status.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    db = get_db()
    services = list(db.services.find({}))
    return jsonify({
        "count": len(services),
        "services": [serialize_doc(s) for s in services]
    }), 200

@services_bp.route("/services/<service_name>", methods=["GET"])
def get_service(service_name):
    """
    GET /api/services/<service_name>
    Returns single service information and all incidents historically affecting it.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    db = get_db()
    # Case-insensitive match for service name
    service = db.services.find_one({"service_name": {"$regex": f"^{service_name}$", "$options": "i"}})

    if not service:
        return jsonify({
            "error": "Service not found",
            "message": f"Service '{service_name}' does not exist in registry."
        }), 404

    canonical_name = service["service_name"]

    # Find incidents where this service was affected
    affecting_incidents = list(db.incidents.find({"affected_services": canonical_name}))
    # Find recent events associated with this service
    recent_events = list(db.events.find({"service_name": canonical_name}).limit(10))

    return jsonify({
        "service": serialize_doc(service),
        "affecting_incidents": [serialize_doc(inc) for inc in affecting_incidents],
        "recent_events": [serialize_doc(evt) for evt in recent_events]
    }), 200

@services_bp.route("/services", methods=["POST"])
def create_service():
    """
    POST /api/services
    Registers a new service in the dependency graph.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    service_name = data.get("service_name", "").strip()
    if not service_name:
        return jsonify({"error": "Validation failed", "message": "'service_name' is required"}), 400

    db = get_db()
    if db.services.find_one({"service_name": {"$regex": f"^{service_name}$", "$options": "i"}}):
        return jsonify({"error": "Conflict", "message": f"Service '{service_name}' already exists"}), 409

    status = data.get("status", "healthy").lower()
    if status not in VALID_SERVICE_STATUSES:
        status = "healthy"

    new_service = {
        "service_name": service_name,
        "description": data.get("description", "").strip(),
        "dependencies": data.get("dependencies", []),
        "status": status
    }

    result = db.services.insert_one(new_service)
    new_service["_id"] = str(result.inserted_id)

    return jsonify({
        "message": "Service created successfully",
        "service": serialize_doc(new_service)
    }), 201

@services_bp.route("/services/<service_name>", methods=["PUT"])
def update_service(service_name):
    """
    PUT /api/services/<service_name>
    Updates status or details of a service.
    """
    db_connected, db_message = check_db_connection()
    if not db_connected:
        return jsonify({"error": "Database unavailable", "details": db_message}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    db = get_db()
    existing = db.services.find_one({"service_name": {"$regex": f"^{service_name}$", "$options": "i"}})
    if not existing:
        return jsonify({"error": "Service not found", "service_name": service_name}), 404

    update_fields = {}
    if "status" in data:
        st = data["status"].strip().lower()
        if st not in VALID_SERVICE_STATUSES:
            return jsonify({
                "error": "Invalid status",
                "message": f"Status must be one of: {list(VALID_SERVICE_STATUSES)}"
            }), 400
        update_fields["status"] = st

    if "description" in data:
        update_fields["description"] = data["description"].strip()

    if "dependencies" in data:
        update_fields["dependencies"] = data["dependencies"]

    if update_fields:
        db.services.update_one({"service_name": existing["service_name"]}, {"$set": update_fields})

    updated = db.services.find_one({"service_name": existing["service_name"]})
    return jsonify({
        "message": "Service updated successfully",
        "service": serialize_doc(updated)
    }), 200
