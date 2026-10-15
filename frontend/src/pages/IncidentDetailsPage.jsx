import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  PlaySquare,
  GitCompare,
  Clock,
  Layers,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  RefreshCw,
  Search
} from 'lucide-react';
import { fetchIncident, fetchIncidentEvents, fetchIncidentAnalysis } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';

export default function IncidentDetailsPage({ incidentId, onBack, onReplay, onCompare }) {
  const [incident, setIncident] = useState(null);
  const [events, setEvents] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!incidentId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchIncident(incidentId),
      fetchIncidentEvents(incidentId),
      fetchIncidentAnalysis(incidentId)
    ])
      .then(([incRes, evtsRes, anaRes]) => {
        setIncident(incRes.incident);
        setEvents(evtsRes.events || []);
        setAnalysis(anaRes.analysis || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch incident details.');
        setLoading(false);
      });
  }, [incidentId]);

  if (loading) {
    return (
      <div className="state-box">
        <RefreshCw size={26} className="animate-spin" />
        <h4>Loading incident details...</h4>
        <p>Retrieving event stream and running root-cause heuristics.</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="state-box" style={{ borderColor: 'var(--status-failed)' }}>
        <AlertTriangle size={32} color="#ef4444" />
        <h4>Incident Not Found</h4>
        <p>{error || 'The requested incident could not be found.'}</p>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to All Incidents
        </button>
      </div>
    );
  }

  // Calculate duration if both timestamps exist
  let durationText = 'Ongoing';
  if (incident.started_at && incident.ended_at) {
    const diffMs = new Date(incident.ended_at) - new Date(incident.started_at);
    if (diffMs > 0) {
      const mins = Math.round(diffMs / 60000);
      durationText = `${mins} minutes`;
    }
  }

  return (
    <div>
      {/* Back button & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Incidents
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onCompare(incidentId)}>
            <GitCompare size={14} /> Compare Incident
          </button>
          <button className="btn btn-replay btn-sm" onClick={() => onReplay(incidentId)}>
            <PlaySquare size={14} /> Replay This Failure
          </button>
        </div>
      </div>

      {/* Main Incident Overview Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}>
                {incident.incident_id}
              </span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 700 }}>{incident.title}</h2>
          </div>
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.6 }}>
          {incident.description}
        </p>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          padding: '14px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <span className="diff-label">Started (Local / UTC)</span>
            <div className="diff-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
              {incident.started_at ? new Date(incident.started_at).toLocaleString() : 'N/A'}
            </div>
          </div>
          <div>
            <span className="diff-label">Resolved At</span>
            <div className="diff-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
              {incident.ended_at ? new Date(incident.ended_at).toLocaleString() : 'Active / Unresolved'}
            </div>
          </div>
          <div>
            <span className="diff-label">Duration</span>
            <div className="diff-value">{durationText}</div>
          </div>
          <div>
            <span className="diff-label">Affected Services</span>
            <div className="tag-list" style={{ marginTop: '4px' }}>
              {incident.affected_services?.map(s => (
                <span key={s} className="tag">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Root Cause Analysis Banner */}
      {analysis && (
        <div className="card" style={{
          marginBottom: '20px',
          borderLeft: '4px solid #8b5cf6',
          background: 'linear-gradient(180deg, #161b2e 0%, #111728 100%)'
        }}>
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} color="#8b5cf6" />
              Automated Root-Cause Diagnostic Report
            </span>
            <span className="badge badge-info" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd' }}>
              Confidence: {analysis.confidence_label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Earliest Recorded Symptom
              </div>
              <div style={{ fontSize: '0.88rem', color: '#fde68a', fontWeight: 600, marginTop: '4px' }}>
                {analysis.earliest_symptom ? `${analysis.earliest_symptom.service_name}: ${analysis.earliest_symptom.description}` : 'None detected'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                First Observed Service Failure
              </div>
              <div style={{ fontSize: '0.88rem', color: '#fca5a5', fontWeight: 600, marginTop: '4px' }}>
                {analysis.first_observed_failure ? `${analysis.first_observed_failure.service_name}: ${analysis.first_observed_failure.description}` : 'None detected'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span className="diff-label">Suspected Root Cause</span>
            <p style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 600, marginTop: '4px' }}>
              {analysis.suspected_root_cause}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {analysis.confidence_explanation}
            </p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span className="diff-label">Suggested Recovery Action</span>
            <p style={{ fontSize: '0.88rem', color: '#6ee7b7', marginTop: '4px' }}>
              {analysis.suggested_recovery_action}
            </p>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            {analysis.disclaimer}
          </div>
        </div>
      )}

      {/* Chronological Event Stream */}
      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#38bdf8" />
            Chronological Event Sequence ({events.length} Events)
          </span>
          <button className="btn btn-replay btn-sm" onClick={() => onReplay(incidentId)}>
            <PlaySquare size={13} /> Replay in Simulator
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Timestamp (UTC)</th>
                <th>Service</th>
                <th>Event Type</th>
                <th>Severity</th>
                <th>Event Description</th>
                <th>Telemetry Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt, idx) => (
                <tr key={evt.event_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-muted)' }}>
                    #{idx + 1}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>
                    {evt.service_name}
                  </td>
                  <td>
                    <span className="tag" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      {evt.event_type}
                    </span>
                  </td>
                  <td><SeverityBadge severity={evt.severity} /></td>
                  <td style={{ fontSize: '0.86rem', color: 'var(--text-primary)', maxWidth: '360px' }}>
                    {evt.description}
                  </td>
                  <td>
                    <pre style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      background: 'var(--bg-input)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)',
                      maxWidth: '240px',
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(evt.details || {}, null, 1)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
