"""
Failure Replay Lab - Flask Application Entrypoint
-------------------------------------------------
Main Flask application initialization, CORS configuration, blueprint registration,
and global error handling.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Import blueprints
from routes.health import health_bp
from routes.dashboard import dashboard_bp
from routes.incidents import incidents_bp
from routes.services import services_bp
from database import init_indexes, check_db_connection

def create_app():
    """
    Application Factory:
    Initializes Flask, sets up CORS for the React Vite frontend,
    registers API endpoints, and defines uniform JSON error handlers.
    """
    app = Flask(__name__)

    # Configure CORS: Allow frontend Vite dev server
    cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
    
    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Register Blueprints with /api prefix
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(incidents_bp, url_prefix="/api")
    app.register_blueprint(services_bp, url_prefix="/api")

    # Global Error Handlers (Clean JSON, no stack traces leaked to client)
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not Found",
            "message": "The requested API resource was not found on this server."
        }), 404

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad Request",
            "message": "The request payload was malformed or missing required fields."
        }), 400

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "error": "Method Not Allowed",
            "message": "The HTTP method is not allowed for the requested route."
        }), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred. Please verify backend logs."
        }), 500

    # Initialize collection indexes on startup
    with app.app_context():
        init_indexes()

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1"
    print(f"[Server] Failure Replay Lab Backend starting on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=debug_mode)



