import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PlaySquare,
  ShieldAlert,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { fetchDashboard } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import ServiceStatusBadge from '../components/ServiceStatusBadge';

export default function OverviewPage({ onReplay, onSelectIncident, onViewDependencies }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchDashboard()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load dashboard metrics.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="state-box">
        <RefreshCw size={28} className="animate-spin" />
        <h4>Calculating observability metrics...</h4>
        <p>Fetching real-time aggregates from MongoDB failure_replay_lab collections.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-box" style={{ borderColor: 'var(--status-failed)' }}>
        <AlertTriangle size={36} color="#ef4444" />
        <h4>Database Communication Error</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadData}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { metrics, severity_distribution, status_distribution, services, recent_incidents } = data || {};

  return (
    <div>
      {/* Page Title */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>Overview Dashboard</h2>
          <p>Real-time post-mortem telemetry, service resilience metrics, and simulated failure trends</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <p>Total Incidents</p>
            <div className="kpi-value">{metrics?.total_incidents || 0}</div>
          </div>
          <div className="kpi-icon">
            <Layers size={22} color="#3b82f6" />
          </div>
        </div>

        <div className="kpi-card critical">
          <div className="kpi-info">
            <p>Critical Incidents</p>
            <div className="kpi-value">{metrics?.critical_incidents || 0}</div>
          </div>
          <div className="kpi-icon">
            <ShieldAlert size={22} color="#f43f5e" />
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-info">
            <p>Active / Investigating</p>
            <div className="kpi-value">
              {(metrics?.open_incidents || 0) + (metrics?.investigating_incidents || 0)}
            </div>
          </div>
          <div className="kpi-icon">
            <Clock size={22} color="#eab308" />
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-info">
            <p>Resolved Incidents</p>
            <div className="kpi-value">{metrics?.resolved_incidents || 0}</div>
          </div>
          <div className="kpi-icon">
            <CheckCircle2 size={22} color="#10b981" />
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-info">
            <p>Avg Recovery Time</p>
            <div className="kpi-value">
              {metrics?.avg_recovery_time_minutes ? `${metrics.avg_recovery_time_minutes}m` : 'N/A'}
            </div>
          </div>
          <div className="kpi-icon">
            <Clock size={22} color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* Two Column Section: Service Health & Severity Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '24px' }}>
        {/* Service Health Card */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#3b82f6" />
              Microservice Topology Status
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onViewDependencies}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
            >
              Open Map <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {services?.list?.map(svc => (
              <div
                key={svc.service_name}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '0.86rem', color: '#fff' }}>{svc.service_name}</strong>
                  <ServiceStatusBadge status={svc.status} />
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {svc.dependencies?.length > 0 ? `Depends on: ${svc.dependencies.join(', ')}` : 'Independent tier'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Severity & Status Distributions */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#f59e0b" />
              Severity & Status Distribution
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Severity Bars */}
            <div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                By Severity
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(severity_distribution || {}).map(([sev, count]) => {
                  const total = metrics?.total_incidents || 1;
                  const pct = Math.round((count / total) * 100);
                  const colorMap = {
                    critical: '#f43f5e',
                    high: '#f97316',
                    medium: '#eab308',
                    low: '#38bdf8'
                  };
                  return (
                    <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                      <span style={{ width: '65px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{sev}</span>
                      <div style={{ flex: 1, height: '7px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: colorMap[sev] || '#3b82f6', borderRadius: '4px' }} />
                      </div>
                      <span style={{ width: '28px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Bars */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                By Status
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-resolved">Resolved: {status_distribution?.resolved || 0}</span>
                <span className="badge badge-investigating">Investigating: {status_distribution?.investigating || 0}</span>
                <span className="badge badge-open">Open: {status_distribution?.open || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="card">
        <div className="card-title">
          <span>Recent Simulated Incidents</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            Latest records stored in MongoDB
          </span>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Incident Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Affected Services</th>
                <th>Started (UTC)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent_incidents?.map(inc => (
                <tr key={inc.incident_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#3b82f6' }}>
                    {inc.incident_id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{inc.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inc.description}
                    </div>
                  </td>
                  <td><SeverityBadge severity={inc.severity} /></td>
                  <td><StatusBadge status={inc.status} /></td>
                  <td>
                    <div className="tag-list">
                      {inc.affected_services?.map(s => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {inc.started_at ? new Date(inc.started_at).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-replay btn-sm"
                        onClick={() => onReplay(inc.incident_id)}
                        title="Open Time-Travel Replay"
                      >
                        <PlaySquare size={13} /> Replay
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSelectIncident(inc.incident_id)}
                      >
                        Details
                      </button>
                    </div>
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
