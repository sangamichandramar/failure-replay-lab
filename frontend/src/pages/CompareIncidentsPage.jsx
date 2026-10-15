import React, { useEffect, useState } from 'react';
import { GitCompare, Clock, ShieldAlert, CheckCircle2, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import { fetchIncidents, fetchIncident, fetchIncidentEvents, fetchIncidentAnalysis } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';

export default function CompareIncidentsPage({ defaultIncA = null, defaultIncB = null, onReplay }) {
  const [incidentsList, setIncidentsList] = useState([]);
  const [idA, setIdA] = useState(defaultIncA || '');
  const [idB, setIdB] = useState(defaultIncB || '');

  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load all incidents for dropdown selectors
  useEffect(() => {
    fetchIncidents()
      .then(res => {
        const list = res.incidents || [];
        setIncidentsList(list);
        if (list.length >= 2) {
          if (!idA) setIdA(list[0].incident_id);
          if (!idB) setIdB(list[1].incident_id);
        } else if (list.length === 1) {
          if (!idA) setIdA(list[0].incident_id);
        }
      })
      .catch(err => console.error('Failed to load incident options:', err));
  }, []);

  // Fetch full telemetry for Incident A
  useEffect(() => {
    if (!idA) return;
    Promise.all([
      fetchIncident(idA),
      fetchIncidentEvents(idA),
      fetchIncidentAnalysis(idA)
    ])
      .then(([inc, evts, ana]) => {
        setDataA({
          incident: inc.incident,
          events: evts.events || [],
          analysis: ana.analysis || null
        });
      })
      .catch(err => console.error('Error fetching Incident A:', err));
  }, [idA]);

  // Fetch full telemetry for Incident B
  useEffect(() => {
    if (!idB) return;
    Promise.all([
      fetchIncident(idB),
      fetchIncidentEvents(idB),
      fetchIncidentAnalysis(idB)
    ])
      .then(([inc, evts, ana]) => {
        setDataB({
          incident: inc.incident,
          events: evts.events || [],
          analysis: ana.analysis || null
        });
      })
      .catch(err => console.error('Error fetching Incident B:', err));
  }, [idB]);

  const calcDuration = (inc) => {
    if (!inc?.started_at || !inc?.ended_at) return 'Ongoing / Not Available';
    const diff = new Date(inc.ended_at) - new Date(inc.started_at);
    if (diff <= 0) return 'Invalid timestamps';
    const mins = Math.round(diff / 60000);
    return `${mins} minutes`;
  };

  const renderIncidentColumn = (bundle, id, setId) => {
    if (!bundle) {
      return (
        <div className="card">
          <p style={{ color: 'var(--text-muted)' }}>Loading incident data...</p>
        </div>
      );
    }

    const { incident, events, analysis } = bundle;
    const duration = calcDuration(incident);

    return (
      <div className="comparison-card">
        {/* Selector Header */}
        <div className="comparison-header">
          <label className="diff-label" style={{ marginBottom: '6px', display: 'block' }}>Choose Incident</label>
          <select
            className="select-field"
            value={id}
            onChange={e => setId(e.target.value)}
            style={{ width: '100%', marginBottom: '12px' }}
          >
            {incidentsList.map(item => (
              <option key={item.incident_id} value={item.incident_id}>
                {item.incident_id}: {item.title}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>{incident.incident_id}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            {onReplay && (
              <button
                className="btn btn-replay btn-sm"
                onClick={() => onReplay(incident.incident_id)}
              >
                Replay In Lab
              </button>
            )}
          </div>
          <h3 style={{ fontSize: '1.1rem', color: '#fff', marginTop: '10px' }}>{incident.title}</h3>
        </div>

        {/* Comparison Attributes */}
        <div className="diff-row">
          <span className="diff-label">Total Duration / Recovery Time</span>
          <span className="diff-value" style={{ fontFamily: 'var(--font-mono)' }}>{duration}</span>
        </div>

        <div className="diff-row">
          <span className="diff-label">First Observed Failure</span>
          <span className="diff-value" style={{ color: '#fca5a5', fontWeight: 600 }}>
            {analysis?.first_observed_failure
              ? `${analysis.first_observed_failure.service_name}: ${analysis.first_observed_failure.description}`
              : 'None recorded'}
          </span>
        </div>

        <div className="diff-row">
          <span className="diff-label">Earliest Symptom</span>
          <span className="diff-value" style={{ color: '#fde68a' }}>
            {analysis?.earliest_symptom
              ? `${analysis.earliest_symptom.service_name}: ${analysis.earliest_symptom.description}`
              : 'None recorded'}
          </span>
        </div>

        <div className="diff-row">
          <span className="diff-label">Suspected Root Cause</span>
          <span className="diff-value" style={{ color: '#fff', fontWeight: 500 }}>
            {analysis?.suspected_root_cause || incident.suspected_root_cause || 'Under investigation'}
          </span>
        </div>

        <div className="diff-row">
          <span className="diff-label">Confidence & Explanation</span>
          <span className="diff-value" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <strong>{analysis?.confidence_label}</strong>: {analysis?.confidence_explanation}
          </span>
        </div>

        <div className="diff-row">
          <span className="diff-label">Recovery Action Taken</span>
          <span className="diff-value" style={{ color: '#6ee7b7' }}>
            {incident.recovery_action || 'Pending'}
          </span>
        </div>

        <div className="diff-row">
          <span className="diff-label">Affected Services ({incident.affected_services?.length || 0})</span>
          <div className="tag-list" style={{ marginTop: '4px' }}>
            {incident.affected_services?.map(s => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>
        </div>

        <div className="diff-row">
          <span className="diff-label">Event Stream Sequence ({events.length} events)</span>
          <div style={{
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px',
            marginTop: '6px'
          }}>
            {events.map((e, idx) => (
              <div key={e.event_id} style={{
                fontSize: '0.78rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '6px 0',
                display: 'flex',
                gap: '8px'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>#{idx + 1}</span>
                <span style={{ color: 'var(--text-primary)' }}><strong>{e.service_name}:</strong> {e.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Find overlapping vs unique affected services
  const servicesA = new Set(dataA?.incident?.affected_services || []);
  const servicesB = new Set(dataB?.incident?.affected_services || []);
  const commonServices = [...servicesA].filter(x => servicesB.has(x));
  const uniqueToA = [...servicesA].filter(x => !servicesB.has(x));
  const uniqueToB = [...servicesB].filter(x => !servicesB.has(x));

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Compare Incidents</h2>
          <p>Side-by-side post-mortem differential analysis: compare blast radius, failure sequences, and recovery actions</p>
        </div>
      </div>

      {/* Cross-Incident Comparison Insights Bar */}
      <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(180deg, #131d31 0%, #0d1525 100%)' }}>
        <h4 style={{ fontSize: '0.86rem', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px' }}>
          Comparative Summary Insights
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div>
            <span className="diff-label">Common Disrupted Services</span>
            <div className="tag-list" style={{ marginTop: '4px' }}>
              {commonServices.length > 0 ? (
                commonServices.map(s => <span key={s} className="tag" style={{ borderColor: '#3b82f6', color: '#fff' }}>{s}</span>)
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>None shared</span>
              )}
            </div>
          </div>
          <div>
            <span className="diff-label">Unique to {dataA?.incident?.incident_id || 'Incident A'}</span>
            <div className="tag-list" style={{ marginTop: '4px' }}>
              {uniqueToA.length > 0 ? (
                uniqueToA.map(s => <span key={s} className="tag">{s}</span>)
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>None</span>
              )}
            </div>
          </div>
          <div>
            <span className="diff-label">Unique to {dataB?.incident?.incident_id || 'Incident B'}</span>
            <div className="tag-list" style={{ marginTop: '4px' }}>
              {uniqueToB.length > 0 ? (
                uniqueToB.map(s => <span key={s} className="tag">{s}</span>)
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="comparison-grid">
        {renderIncidentColumn(dataA, idA, setIdA)}
        {renderIncidentColumn(dataB, idB, setIdB)}
      </div>
    </div>
  );
}
