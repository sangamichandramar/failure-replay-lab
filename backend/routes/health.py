"""
Failure Replay Lab - Health Check Route
---------------------------------------
Provides a lightweight health check endpoint that verifies server uptime
and MongoDB database connectivity status.
"""

from flask import Blueprint, jsonify
from database import check_db_connection, get_db

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    GET /api/health
    Returns system status, MongoDB connection health, and record counts.
    """
    db_connected, db_message = check_db_connection()
    
    incident_count = 0
    service_count = 0
    event_count = 0
    
    if db_connected:
        try:
            db = get_db()
            incident_count = db.incidents.count_documents({})
            service_count = db.services.count_documents({})
            event_count = db.events.count_documents({})
        except Exception as e:
            db_connected = False
            db_message = f"Error querying counts: {str(e)}"

    status_code = 200 if db_connected else 503
    return jsonify({
        "status": "healthy" if db_connected else "degraded",
        "app_name": "Failure Replay Lab API",
        "database": {
            "connected": db_connected,
            "message": db_message,
            "counts": {
                "incidents": incident_count,
                "services": service_count,
                "events": event_count
            }
        }
    }), status_code
