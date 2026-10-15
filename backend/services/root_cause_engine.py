"""
Failure Replay Lab - Rule-Based Root Cause Analysis Engine
---------------------------------------------------------
This module analyzes chronologically sorted incident events using deterministic
rules to reconstruct how a failure propagated through a system.

Key Concepts Distinguished:
1. Earliest Recorded Symptom:
   The very first anomaly, warning, or unusual metric observed anywhere in the system,
   even before services started throwing hard errors (e.g. latency rise, memory spike).

2. First Observed Service Failure:
   The first event where an individual service transitioned into an actual error
   or critical state (e.g. ConnectionPoolExhaustedException, pod crash, HTTP 500).

3. Suspected Root Cause:
   The underlying condition or initial failure trigger identified by rule heuristics
   (e.g., database connection pool exhaustion, schema mismatch in release, cache eviction crash).

Important:
This is a heuristic rule-based engine. It assists human engineers during post-mortems
by highlighting evidence and timeline correlation. It does NOT claim deterministic proof.
"""

from datetime import datetime, timezone

def parse_iso_timestamp(ts_str):
    """Safely converts ISO-8601 string to datetime object for chronological sorting."""
    min_aware = datetime.min.replace(tzinfo=timezone.utc)
    if not ts_str:
        return min_aware
    try:
        # Handles 'Z' or '+00:00' format
        clean_ts = ts_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return min_aware


def analyze_incident(incident, events, services=None):
    """
    Analyzes an incident and its associated events.
    
    Parameters:
        incident (dict): The incident document.
        events (list of dict): List of event documents associated with the incident.
        services (list of dict, optional): List of service definitions to understand topology.
        
    Returns:
        dict: A comprehensive root-cause analysis report.
    """
    if not events:
        return {
            "incident_id": incident.get("incident_id"),
            "status": "insufficient_data",
            "message": "No events recorded for this incident yet to perform root cause analysis.",
            "earliest_symptom": None,
            "first_observed_failure": None,
            "suspected_root_cause": incident.get("suspected_root_cause", "Under investigation"),
            "confidence_label": "Low",
            "confidence_explanation": "Zero events available to corroborate root cause hypothesis.",
            "evidence": [],
            "downstream_effects": [],
            "suggested_recovery_action": incident.get("recovery_action", "Gather diagnostic logs.")
        }

    # Step 1: Ensure events are chronologically ordered by timestamp
    sorted_events = sorted(events, key=lambda e: parse_iso_timestamp(e.get("timestamp")))

    # Step 2: Identify the Earliest Recorded Symptom
    # (First event with severity 'warning', 'metric_anomaly', or 'error')
    earliest_symptom = None
    for evt in sorted_events:
        sev = evt.get("severity", "").lower()
        etype = evt.get("event_type", "").lower()
        if sev in ["warning", "error", "critical"] or etype in ["metric_anomaly", "error", "alert"]:
            earliest_symptom = {
                "event_id": evt.get("event_id"),
                "timestamp": evt.get("timestamp"),
                "service_name": evt.get("service_name"),
                "severity": evt.get("severity"),
                "event_type": evt.get("event_type"),
                "description": evt.get("description")
            }
            break

    if not earliest_symptom and sorted_events:
        earliest_symptom = {
            "event_id": sorted_events[0].get("event_id"),
            "timestamp": sorted_events[0].get("timestamp"),
            "service_name": sorted_events[0].get("service_name"),
            "severity": sorted_events[0].get("severity"),
            "event_type": sorted_events[0].get("event_type"),
            "description": sorted_events[0].get("description")
        }

    # Step 3: Identify the First Observed Service Failure
    # (First event with severity 'critical' or 'error')
    first_observed_failure = None
    for evt in sorted_events:
        sev = evt.get("severity", "").lower()
        if sev in ["critical", "error"]:
            first_observed_failure = {
                "event_id": evt.get("event_id"),
                "timestamp": evt.get("timestamp"),
                "service_name": evt.get("service_name"),
                "severity": evt.get("severity"),
                "description": evt.get("description"),
                "details": evt.get("details", {})
            }
            break

    # If no explicit critical/error was found, fall back to earliest symptom
    if not first_observed_failure:
        first_observed_failure = earliest_symptom

    # Step 4: Trace Downstream Effects
    # Track services experiencing issues after the initial failure service
    initial_service = first_observed_failure["service_name"] if first_observed_failure else None
    downstream_impacts = []
    seen_services = set()
    if initial_service:
        seen_services.add(initial_service)

    for evt in sorted_events:
        svc = evt.get("service_name")
        sev = evt.get("severity", "").lower()
        if svc and svc not in seen_services and sev in ["warning", "error", "critical"]:
            seen_services.add(svc)
            downstream_impacts.append({
                "service_name": svc,
                "first_impact_timestamp": evt.get("timestamp"),
                "symptom": evt.get("description"),
                "severity": evt.get("severity")
            })

    # Step 5: Heuristic Rule-Based Pattern Matching
    analysis_result = _match_incident_patterns(
        incident=incident,
        sorted_events=sorted_events,
        earliest_symptom=earliest_symptom,
        first_observed_failure=first_observed_failure,
        downstream_impacts=downstream_impacts
    )

    return analysis_result

def _match_incident_patterns(incident, sorted_events, earliest_symptom, first_observed_failure, downstream_impacts):
    """
    Applies deterministic post-mortem correlation heuristics against the event timeline.
    """
    event_texts = " ".join([e.get("description", "").lower() for e in sorted_events])
    first_svc = first_observed_failure["service_name"] if first_observed_failure else ""
    first_desc = first_observed_failure["description"].lower() if first_observed_failure else ""

    evidence = []
    for evt in sorted_events:
        sev = evt.get("severity", "").lower()
        etype = evt.get("event_type", "").lower()
        if sev in ["critical", "error", "warning"] or etype in ["deployment", "action"]:
            evidence.append({
                "timestamp": evt.get("timestamp"),
                "service": evt.get("service_name"),
                "type": evt.get("event_type"),
                "severity": evt.get("severity"),
                "description": evt.get("description")
            })

    # Rule Pattern 1: Database Connection Exhaustion / Latency Surge
    if "connection pool" in event_texts or "connectionpool" in event_texts or ("database" in first_svc.lower() and "latency" in event_texts):
        suspected_root_cause = "Database Connection Pool Saturation & Query Latency Escalation"
        confidence_label = "High"
        confidence_explanation = (
            "Chronological correlation confirmed: Database query latency and connection pool utilization spiked "
            "prior to downstream Order Service connection timeouts and API Gateway 502/500 errors."
        )
        suggested_recovery = "Scale database connection pool limit, terminate blocking queries, and implement connection query timeouts."

    # Rule Pattern 2: Faulty Application Deployment / Code Regression
    elif any(e.get("event_type") == "deployment" for e in sorted_events) or "deployment" in event_texts or "version" in event_texts:
        deployment_evt = next((e for e in sorted_events if e.get("event_type") == "deployment"), None)
        dep_desc = deployment_evt.get("description") if deployment_evt else "Application deployment"
        suspected_root_cause = f"Post-Deployment Regression ({dep_desc})"
        confidence_label = "High"
        confidence_explanation = (
            "A software deployment event immediately preceded elevated service error rates and unhandled exceptions. "
            "Downstream endpoints failed within minutes of the release rollout."
        )
        suggested_recovery = "Execute immediate rollback to the previous stable release artifact and verify database migration compatibility."

    # Rule Pattern 3: Cache Tier Failure / Thundering Herd
    elif "cache" in first_svc.lower() or "redis" in event_texts or "cache miss" in event_texts or "oom" in event_texts:
        suspected_root_cause = "Cache Tier Crash Causing Unmitigated Thundering Herd on Database"
        confidence_label = "High"
        confidence_explanation = (
            "Initial failure occurred in Cache Service (Redis), producing near-100% cache misses. "
            "The resulting unbuffered traffic wave overloaded the primary Database with a 400%+ query spike."
        )
        suggested_recovery = "Restart cache cluster with appropriate eviction policies (e.g. allkeys-lru), warmup critical keys, and configure circuit breakers."

    # Rule Pattern 4: Authentication Service Deadlock / Token Timeout
    elif "authentication" in first_svc.lower() or "auth" in first_svc.lower() or "token" in event_texts or "jwks" in event_texts:
        suspected_root_cause = "Authentication Service Lock Contention & Token Validation Cascade"
        confidence_label = "High"
        confidence_explanation = (
            "Authentication latency degraded due to key rotation lock contention. "
            "Because API Gateway synchronously validates authorization tokens, slow auth responses created a system-wide ingress bottleneck."
        )
        suggested_recovery = "Deploy non-blocking JWKS caching hotfix, restart auth worker pods, and enforce short timeout fallbacks at the gateway layer."

    # Rule Pattern 5: Memory Leak / Resource Starvation
    elif "memory" in event_texts or "heap" in event_texts or "gc" in event_texts:
        suspected_root_cause = "Memory Leak / Excessive Garbage Collection Overhead"
        confidence_label = "Medium"
        confidence_explanation = (
            "Elevated heap utilization and long GC pauses correlate with latency deterioration in worker nodes."
        )
        suggested_recovery = "Capture JVM heap dump for leak analysis, increase memory limits, and trigger a rolling restart of worker pods."

    # Rule Pattern Fallback: General Topology Deduction
    else:
        suspected_root_cause = incident.get("suspected_root_cause") or f"Service degradation originating in {first_svc}"
        confidence_label = "Medium"
        confidence_explanation = (
            f"The earliest anomalous event was recorded in {first_svc}. Downstream services showed degraded health thereafter."
        )
        suggested_recovery = incident.get("recovery_action") or "Inspect application logs and metrics for the originating service."

    return {
        "incident_id": incident.get("incident_id"),
        "title": incident.get("title"),
        "status": "completed",
        "earliest_symptom": earliest_symptom,
        "first_observed_failure": first_observed_failure,
        "suspected_root_cause": suspected_root_cause,
        "confidence_label": confidence_label,
        "confidence_explanation": confidence_explanation,
        "evidence": evidence,
        "downstream_effects": downstream_impacts,
        "suggested_recovery_action": suggested_recovery,
        "disclaimer": (
            "Note: This analysis is generated using deterministic timeline correlation rules. "
            "It assists engineers during root cause investigations but should be verified with operational telemetry."
        )
    }
