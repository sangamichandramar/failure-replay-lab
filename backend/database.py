"""
Failure Replay Lab - Database Connection & Utilities
---------------------------------------------------
This module handles connecting to MongoDB (either local or MongoDB Atlas),
creating necessary collection indexes, and serializing MongoDB BSON documents
into JSON-compatible Python dictionaries.
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from bson import ObjectId

# Load environment variables from .env file if present
load_dotenv()

# Read MongoDB URI and Database Name with safe local defaults
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/failure_replay_lab")
DB_NAME = os.getenv("DB_NAME", "failure_replay_lab")

# Global client cache
_client = None

def get_client():
    """
    Returns a singleton MongoClient instance.
    Uses a 2.5-second timeout so requests fail fast with helpful messages
    if MongoDB is not reachable, rather than hanging indefinitely.
    """
    global _client
    if _client is None:
        _client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=2500,
            connectTimeoutMS=2500,
            socketTimeoutMS=2500
        )
    return _client

def get_db():
    """
    Returns the failure_replay_lab database instance.
    """
    client = get_client()
    return client[DB_NAME]

def check_db_connection():
    """
    Pings MongoDB to verify connectivity.
    Returns:
        tuple (bool, str): (True, "Connected") or (False, error_details)
    """
    try:
        client = get_client()
        # The 'ping' command is very lightweight and confirms server responsiveness
        client.admin.command('ping')
        return True, "Connected to MongoDB successfully"
    except (ConnectionFailure, ServerSelectionTimeoutError) as err:
        return False, f"Could not connect to MongoDB: {str(err)}"
    except Exception as err:
        return False, f"Unexpected database error: {str(err)}"

def serialize_doc(doc):
    """
    Recursively converts MongoDB BSON objects (like ObjectId and datetime)
    into standard JSON-serializable Python data structures.
    
    Why this is needed:
    MongoDB uses BSON types like ObjectId('_id') and datetime objects.
    Standard Python json.dumps() does not know how to serialize these types,
    which causes a TypeError: Object of type ObjectId is not JSON serializable.
    """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        new_doc = {}
        for key, value in doc.items():
            if key == "_id" and isinstance(value, ObjectId):
                new_doc["id"] = str(value)
                new_doc["_id"] = str(value)
            elif isinstance(value, ObjectId):
                new_doc[key] = str(value)
            elif isinstance(value, datetime):
                # Format to ISO 8601 with Z (UTC)
                new_doc[key] = value.isoformat()
            elif isinstance(value, dict):
                new_doc[key] = serialize_doc(value)
            elif isinstance(value, list):
                new_doc[key] = serialize_doc(value)
            else:
                new_doc[key] = value
        return new_doc
    return doc

def init_indexes():
    """
    Creates indexes for optimal query performance:
    1. incidents: unique index on incident_id
    2. events: index on incident_id and compound (incident_id, timestamp)
    3. services: unique index on service_name
    """
    try:
        db = get_db()
        db.incidents.create_index([("incident_id", ASCENDING)], unique=True)
        db.events.create_index([("incident_id", ASCENDING), ("timestamp", ASCENDING)])
        db.events.create_index([("event_id", ASCENDING)], unique=True)
        db.services.create_index([("service_name", ASCENDING)], unique=True)
        return True
    except Exception as err:
        print(f"[Warning] Could not initialize indexes: {err}")
        return False
