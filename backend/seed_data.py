"""
Failure Replay Lab - Seed Data
------------------------------
This module defines realistic simulated incidents, events, and services.
It provides a safe seed function that populates MongoDB without creating
duplicate records on repeated runs.

All timestamps are stored in UTC ISO-8601 format.
All incidents and events are explicitly marked as simulated data.
"""

import sys
import os
from datetime import datetime, timezone

# Ensure backend root is on Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import get_db, init_indexes

# 6 Core Services in the simulated microservice architecture
SAMPLE_SERVICES = [
    {
        "service_name": "Frontend",
        "description": "Client-facing web application rendering developer and consumer interfaces",
        "dependencies": ["API Gateway"],
        "status": "healthy"
    },
    {
        "service_name": "API Gateway",
        "description": "Ingress reverse proxy, SSL termination, and API routing controller",
        "dependencies": ["Authentication Service", "Order Service"],
        "status": "healthy"
    },
    {
        "service_name": "Authentication Service",
        "description": "Identity verification, OAuth2 tokens, and user permission management",
        "dependencies": ["Database", "Cache Service"],
        "status": "healthy"
    },
    {
        "service_name": "Order Service",
        "description": "Order processing, checkout workflows, and transaction state management",
        "dependencies": ["Database", "Cache Service"],
        "status": "healthy"
    },
    {
        "service_name": "Cache Service",
        "description": "High-throughput in-memory Redis cluster for session data and cached queries",
        "dependencies": [],
        "status": "healthy"
    },
    {
        "service_name": "Database",
        "description": "Primary transactional database cluster handling persistent storage and ACID transactions",
        "dependencies": [],
        "status": "healthy"
    }
]

# 5 Realistic Simulated Incidents
SAMPLE_INCIDENTS = [
    {
        "incident_id": "INC-2024-001",
        "title": "Database Connection Pool Exhaustion Under Peak Load",
        "description": "A surge in unindexed analytic queries consumed all database connection slots, causing connection starvation and cascade 500 errors across Order Service and API Gateway.",
        "severity": "critical",
        "status": "resolved",
        "started_at": "2024-10-12T14:10:00Z",
        "ended_at": "2024-10-12T14:32:00Z",
        "affected_services": ["Database", "Order Service", "API Gateway", "Frontend"],
        "suspected_root_cause": "Long-running unindexed queries held database connections indefinitely, exhausting the maximum connection pool limit of 100 connections.",
        "recovery_action": "Terminated rogue query processes, increased maximum connection pool size from 100 to 250, and recycled idle connection pools."
    },
    {
        "incident_id": "INC-2024-002",
        "title": "Failed Application Deployment v2.4.1 Schema Mismatch",
        "description": "Deployment of v2.4.1 introduced a breaking database schema change that caused Order Service to throw NullPointerExceptions on order checkout.",
        "severity": "high",
        "status": "resolved",
        "started_at": "2024-10-13T09:15:00Z",
        "ended_at": "2024-10-13T09:33:00Z",
        "affected_services": ["Order Service", "API Gateway", "Frontend"],
        "suspected_root_cause": "Order Service deployment v2.4.1 expected a non-null 'discount_code_id' column that had not yet been migrated in production.",
        "recovery_action": "Executed automated rollback to stable version v2.4.0 in Kubernetes cluster and drained bad pods."
    },
    {
        "incident_id": "INC-2024-003",
        "title": "Cache Service Outage Inducing Thundering Herd",
        "description": "Redis Cache node crashed following an out-of-memory error. The sudden 100% cache miss rate caused direct query overload on the primary database.",
        "severity": "high",
        "status": "resolved",
        "started_at": "2024-10-13T16:00:00Z",
        "ended_at": "2024-10-13T16:22:00Z",
        "affected_services": ["Cache Service", "Database", "Authentication Service", "Order Service", "API Gateway"],
        "suspected_root_cause": "Cache Service maxmemory policy failed to evict volatile keys, causing an OOM crash. Subsequent cache misses produced a thundering herd on Database.",
        "recovery_action": "Restarted Redis cluster with allkeys-lru eviction policy and warmed up essential session and product keys."
    },
    {
        "incident_id": "INC-2024-004",
        "title": "Authentication Service Latency & Cascading Token Timeouts",
        "description": "Cryptographic key rotation lock contention degraded Authentication Service latency from 20ms to over 8000ms, causing API Gateway token validation timeouts.",
        "severity": "critical",
        "status": "resolved",
        "started_at": "2024-10-14T02:00:00Z",
        "ended_at": "2024-10-14T02:24:00Z",
        "affected_services": ["Authentication Service", "API Gateway", "Frontend"],
        "suspected_root_cause": "Thread deadlock inside the JWKS key rotation cache mutex caused request queue backup and synchronous gateway timeouts.",
        "recovery_action": "Restarted Authentication Service instances with patched non-blocking JWKS cache and temporary static key fallback."
    },
    {
        "incident_id": "INC-2024-005",
        "title": "Memory Leak in Order Service Worker Nodes",
        "description": "Gradual uncollected buffers in Order Service batch worker threads are increasing JVM heap pressure and elevating checkout latency.",
        "severity": "medium",
        "status": "investigating",
        "started_at": "2024-10-14T03:00:00Z",
        "ended_at": None,
        "affected_services": ["Order Service", "API Gateway"],
        "suspected_root_cause": "Undrained event listener callbacks accumulating in memory during high-volume batch processing.",
        "recovery_action": "Heap dump capture initiated; rolling restart of affected worker pods pending investigation."
    }
]

# Chronological Events for all Incidents
SAMPLE_EVENTS = [
    # INC-2024-001 Events (Database Connection Pool Exhaustion)
    {
        "event_id": "EVT-001-01",
        "incident_id": "INC-2024-001",
        "timestamp": "2024-10-12T14:10:00Z",
        "service_name": "Database",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Database query latency increases from 12ms baseline to 480ms on analytic reporting queries.",
        "details": {"metric": "query_latency_ms", "value": 480, "threshold": 50, "query_type": "SELECT report_data"}
    },
    {
        "event_id": "EVT-001-02",
        "incident_id": "INC-2024-001",
        "timestamp": "2024-10-12T14:13:30Z",
        "service_name": "Database",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Database connection pool usage approaches 92% capacity (92/100 active connections).",
        "details": {"active_connections": 92, "max_connections": 100, "utilization_pct": 92.0}
    },
    {
        "event_id": "EVT-001-03",
        "incident_id": "INC-2024-001",
        "timestamp": "2024-10-12T14:17:00Z",
        "service_name": "Database",
        "event_type": "error",
        "severity": "critical",
        "description": "Database connection pool exhausted. Incoming acquire() calls timing out after 5000ms.",
        "details": {"error": "ConnectionPoolExhaustedException", "active_connections": 100, "waiting_threads": 48}
    },
    {
        "event_id": "EVT-001-04",
        "incident_id": "INC-2024-001",
        "timestamp": "2024-10-12T14:19:15Z",
        "service_name": "Order Service",
        "event_type": "error",
        "severity": "critical",
        "description": "Order Service requests begin failing with database timeout errors on checkout.",
        "details": {"http_status": 500, "failed_route": "POST /api/v1/orders/checkout", "failure_rate_pct": 68.4}
    },
    {
        "event_id": "EVT-001-05",
        "incident_id": "INC-2024-001",
        "timestamp": "2024-10-12T14:21:40Z",
        "service_name": "API Gateway",
        "event_type": "error",
        "severity": "critical",
        "description": "API Gateway returns HTTP 500 Bad Gateway as upstream Order Service fails to respond.",
        "details": {"http_status": 502, "ingress_error_rate_pct": 42.1, "client_impact": "Checkout failures"}
    },
    {
        "event_id": "EVT-001-06",
        "incident_id": "INC-2024-001",
        "timestamp": "2024-10-12T14:26:00Z",
        "service_name": "Database",
        "event_type": "action",
        "severity": "info",
        "description": "On-call engineer executes pg_terminate_backend on idle analytic connections and increases pool size to 250.",
        "details": {"action": "pool_resize_and_connection_kill", "killed_pids": 18, "new_max_pool": 250}
    },
    {
        "event_id": "EVT-001-07",
        "incident_id": "INC-2024-001",
        "timestamp": "2024-10-12T14:32:00Z",
        "service_name": "Database",
        "event_type": "state_change",
        "severity": "info",
        "description": "Database connectivity fully restored. Connection pool usage drops to 24%. Gateway errors subside.",
        "details": {"active_connections": 36, "max_connections": 250, "http_500_rate_pct": 0.0}
    },

    # INC-2024-002 Events (Failed Application Deployment)
    {
        "event_id": "EVT-002-01",
        "incident_id": "INC-2024-002",
        "timestamp": "2024-10-13T09:15:00Z",
        "service_name": "Order Service",
        "event_type": "deployment",
        "severity": "info",
        "description": "New application version v2.4.1 deployed to Order Service pod cluster.",
        "details": {"version": "v2.4.1", "deployed_by": "CI/CD Pipeline #8491", "replicas": 4}
    },
    {
        "event_id": "EVT-002-02",
        "incident_id": "INC-2024-002",
        "timestamp": "2024-10-13T09:17:30Z",
        "service_name": "Order Service",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Order Service application error rate spikes from 0.05% to 18.2% within 2 minutes of rollout.",
        "details": {"error_rate_pct": 18.2, "baseline_pct": 0.05}
    },
    {
        "event_id": "EVT-002-03",
        "incident_id": "INC-2024-002",
        "timestamp": "2024-10-13T09:20:00Z",
        "service_name": "Order Service",
        "event_type": "error",
        "severity": "critical",
        "description": "Order Service begins throwing unhandled NullPointerException: discount_code_id column missing.",
        "details": {"exception": "NullPointerException", "file": "OrderDiscountValidator.java:74", "status_code": 500}
    },
    {
        "event_id": "EVT-002-04",
        "incident_id": "INC-2024-002",
        "timestamp": "2024-10-13T09:22:15Z",
        "service_name": "API Gateway",
        "event_type": "error",
        "severity": "critical",
        "description": "API Gateway reports surge in HTTP 500 responses on /api/orders. Synthetic alerts trigger.",
        "details": {"gateway_5xx_count": 312, "alert": "HighErrorRateOnCriticalService"}
    },
    {
        "event_id": "EVT-002-05",
        "incident_id": "INC-2024-002",
        "timestamp": "2024-10-13T09:27:00Z",
        "service_name": "Order Service",
        "event_type": "action",
        "severity": "info",
        "description": "Engineering team initiates automated rollback of Order Service deployment to v2.4.0.",
        "details": {"rollback_target": "v2.4.0", "initiated_by": "Incident Commander"}
    },
    {
        "event_id": "EVT-002-06",
        "incident_id": "INC-2024-002",
        "timestamp": "2024-10-13T09:33:00Z",
        "service_name": "Order Service",
        "event_type": "state_change",
        "severity": "info",
        "description": "Order Service pods on v2.4.0 fully healthy. Error rates return to nominal 0.03%.",
        "details": {"active_version": "v2.4.0", "error_rate_pct": 0.03, "status": "resolved"}
    },

    # INC-2024-003 Events (Cache Service Outage)
    {
        "event_id": "EVT-003-01",
        "incident_id": "INC-2024-003",
        "timestamp": "2024-10-13T16:00:00Z",
        "service_name": "Cache Service",
        "event_type": "error",
        "severity": "critical",
        "description": "Cache Service becomes unavailable due to out-of-memory crash on primary Redis node.",
        "details": {"error": "OOM command not allowed when used memory > 'maxmemory'", "memory_used_mb": 4096}
    },
    {
        "event_id": "EVT-003-02",
        "incident_id": "INC-2024-003",
        "timestamp": "2024-10-13T16:03:00Z",
        "service_name": "Cache Service",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Cache miss rate escalates from 4% baseline to 99.8% across Authentication and Order services.",
        "details": {"cache_miss_rate_pct": 99.8, "baseline_pct": 4.0}
    },
    {
        "event_id": "EVT-003-03",
        "incident_id": "INC-2024-003",
        "timestamp": "2024-10-13T16:06:20Z",
        "service_name": "Database",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Database request volume surges by 420% as downstream services bypass inactive cache.",
        "details": {"qps_baseline": 450, "qps_current": 2340, "cpu_pct": 94}
    },
    {
        "event_id": "EVT-003-04",
        "incident_id": "INC-2024-003",
        "timestamp": "2024-10-13T16:10:00Z",
        "service_name": "Database",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Database query latency spikes from 8ms to 750ms under unbuffered traffic surge.",
        "details": {"p95_latency_ms": 750, "p99_latency_ms": 2200}
    },
    {
        "event_id": "EVT-003-05",
        "incident_id": "INC-2024-003",
        "timestamp": "2024-10-13T16:13:30Z",
        "service_name": "API Gateway",
        "event_type": "error",
        "severity": "critical",
        "description": "API response times deteriorate across endpoints; client timeouts recorded at gateway.",
        "details": {"p99_latency_ms": 6500, "client_timeout_count": 188}
    },
    {
        "event_id": "EVT-003-06",
        "incident_id": "INC-2024-003",
        "timestamp": "2024-10-13T16:18:00Z",
        "service_name": "Cache Service",
        "event_type": "action",
        "severity": "info",
        "description": "Redis cluster rebooted with increased memory limits and volatile-lru eviction policy.",
        "details": {"action": "redis_restart", "memory_limit_mb": 8192, "eviction_policy": "allkeys-lru"}
    },
    {
        "event_id": "EVT-003-07",
        "incident_id": "INC-2024-003",
        "timestamp": "2024-10-13T16:22:00Z",
        "service_name": "Cache Service",
        "event_type": "state_change",
        "severity": "info",
        "description": "Cache Service restored to healthy status. Cache hit ratio stabilizes at 95.2%. Database load normalizes.",
        "details": {"cache_hit_pct": 95.2, "database_cpu_pct": 22}
    },

    # INC-2024-004 Events (Authentication Service Failure)
    {
        "event_id": "EVT-004-01",
        "incident_id": "INC-2024-004",
        "timestamp": "2024-10-14T02:00:00Z",
        "service_name": "Authentication Service",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Authentication Service latency increases from 18ms to 3200ms due to key rotation lock contention.",
        "details": {"latency_ms": 3200, "baseline_ms": 18, "lock_wait_ms": 3150}
    },
    {
        "event_id": "EVT-004-02",
        "incident_id": "INC-2024-004",
        "timestamp": "2024-10-14T02:04:15Z",
        "service_name": "Authentication Service",
        "event_type": "error",
        "severity": "critical",
        "description": "Authentication token verification requests begin timing out on the /oauth/token endpoint.",
        "details": {"timeout_threshold_ms": 5000, "timeout_pct": 74.5}
    },
    {
        "event_id": "EVT-004-03",
        "incident_id": "INC-2024-004",
        "timestamp": "2024-10-14T02:08:00Z",
        "service_name": "API Gateway",
        "event_type": "error",
        "severity": "critical",
        "description": "API Gateway rejects incoming user traffic with HTTP 401 and 504 Gateway Timeout errors.",
        "details": {"status_code": 504, "rejected_requests_per_min": 1420}
    },
    {
        "event_id": "EVT-004-04",
        "incident_id": "INC-2024-004",
        "timestamp": "2024-10-14T02:11:30Z",
        "service_name": "Frontend",
        "event_type": "error",
        "severity": "critical",
        "description": "Frontend users encounter repeated session expired prompts and login failures on Web portal.",
        "details": {"user_facing_impact": "Complete login blockage", "failed_login_attempts": 650}
    },
    {
        "event_id": "EVT-004-05",
        "incident_id": "INC-2024-004",
        "timestamp": "2024-10-14T02:18:00Z",
        "service_name": "Authentication Service",
        "event_type": "action",
        "severity": "info",
        "description": "Engineers release lock contention by deploying hotfix to bypass synchronous JWKS disk sync.",
        "details": {"action": "jwks_mutex_hotfix", "deployment_duration_sec": 45}
    },
    {
        "event_id": "EVT-004-06",
        "incident_id": "INC-2024-004",
        "timestamp": "2024-10-14T02:24:00Z",
        "service_name": "Authentication Service",
        "event_type": "state_change",
        "severity": "info",
        "description": "Authentication Service recovers. User token validation latency returns to 15ms. Login flow normalizes.",
        "details": {"token_validation_ms": 15, "login_success_rate_pct": 99.9}
    },

    # INC-2024-005 Events (Ongoing Memory Leak in Order Service)
    {
        "event_id": "EVT-005-01",
        "incident_id": "INC-2024-005",
        "timestamp": "2024-10-14T03:00:00Z",
        "service_name": "Order Service",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Order Service memory consumption exceeds 85% threshold across worker replicas.",
        "details": {"heap_used_pct": 87.2, "threshold_pct": 85.0}
    },
    {
        "event_id": "EVT-005-02",
        "incident_id": "INC-2024-005",
        "timestamp": "2024-10-14T03:08:00Z",
        "service_name": "Order Service",
        "event_type": "metric_anomaly",
        "severity": "warning",
        "description": "Major garbage collection pause times spike to 4500ms, triggering thread stalls.",
        "details": {"gc_pause_ms": 4500, "gc_type": "Full GC (Ergonomics)"}
    },
    {
        "event_id": "EVT-005-03",
        "incident_id": "INC-2024-005",
        "timestamp": "2024-10-14T03:15:00Z",
        "service_name": "Order Service",
        "event_type": "error",
        "severity": "warning",
        "description": "Order checkout endpoint experiences severe response latency (P99 > 8s).",
        "details": {"p99_latency_ms": 8200, "active_threads": 128}
    },
    {
        "event_id": "EVT-005-04",
        "incident_id": "INC-2024-005",
        "timestamp": "2024-10-14T03:21:00Z",
        "service_name": "API Gateway",
        "event_type": "state_change",
        "severity": "warning",
        "description": "Circuit breaker trips between API Gateway and Order Service to protect downstream traffic.",
        "details": {"circuit_breaker_state": "OPEN", "fallback_action": "Serve cached degraded response"}
    }
]

def seed_database(db=None):
    """
    Seeds the MongoDB database with initial sample services, incidents, and events.
    Uses upsert (update with upsert=True) to ensure running this function multiple
    times is completely idempotent and does not create duplicate entries.
    """
    if db is None:
        db = get_db()

    print("[Seed] Initializing database indexes...")
    init_indexes()

    # 1. Upsert Services
    print(f"[Seed] Seeding {len(SAMPLE_SERVICES)} services...")
    for svc in SAMPLE_SERVICES:
        db.services.update_one(
            {"service_name": svc["service_name"]},
            {"$set": svc},
            upsert=True
        )

    # 2. Upsert Incidents
    print(f"[Seed] Seeding {len(SAMPLE_INCIDENTS)} incidents...")
    for inc in SAMPLE_INCIDENTS:
        db.incidents.update_one(
            {"incident_id": inc["incident_id"]},
            {"$set": inc},
            upsert=True
        )

    # 3. Upsert Events
    print(f"[Seed] Seeding {len(SAMPLE_EVENTS)} events...")
    for evt in SAMPLE_EVENTS:
        db.events.update_one(
            {"event_id": evt["event_id"]},
            {"$set": evt},
            upsert=True
        )

    print("[Seed] Database seeding completed successfully!")
    return {
        "services_seeded": len(SAMPLE_SERVICES),
        "incidents_seeded": len(SAMPLE_INCIDENTS),
        "events_seeded": len(SAMPLE_EVENTS)
    }

if __name__ == "__main__":
    try:
        results = seed_database()
        print("Summary:", results)
    except Exception as err:
        print(f"[Error] Failed to seed database: {err}", file=sys.stderr)
        sys.exit(1)
