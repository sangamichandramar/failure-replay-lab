import React, { useEffect, useState } from 'react';
import {
  Settings,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Layers,
  Info,
  ShieldCheck,
  Cpu,
  GitBranch,
  Activity
} from 'lucide-react';
import { fetchHealth } from '../services/api';

export default function SettingsPage() {
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const checkHealth = () => {
    setLoadingHealth(true);
    setHealthError(null);
    fetchHealth()
      .then(res => {
        setHealthData(res);
        setLoadingHealth(false);
      })
      .catch(err => {
        setHealthError(err.message || 'Health check failed');
        setLoadingHealth(false);
      });
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Platform Settings & Architecture Information</h2>
          <p>Database connectivity telemetry, distributed service topology specifications, and system diagnostics</p>
        </div>
      </div>

      {/* Grid: Database Status & Tech Stack Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* MongoDB Connectivity Card */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#10b981" />
              MongoDB Database Connectivity
            </span>
            <button className="btn btn-secondary btn-sm" onClick={checkHealth}>
              <RefreshCw size={13} className={loadingHealth ? 'animate-spin' : ''} /> Ping DB
            </button>
          </div>

          {loadingHealth ? (
            <p style={{ color: 'var(--text-muted)' }}>Pinging MongoDB...</p>
          ) : healthError ? (
            <div style={{
              background: 'var(--status-failed-bg)',
              border: '1px solid var(--status-failed-border)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              color: '#f87171'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <AlertTriangle size={18} /> Connection Failed
              </div>
              <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>{healthError}</p>
            </div>
          ) : (
            <div>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                color: '#10b981',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <CheckCircle2 size={18} /> {healthData?.database?.message || 'Connected to MongoDB'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span className="diff-label">Incidents</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {healthData?.database?.counts?.incidents ?? 0}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span className="diff-label">Services</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {healthData?.database?.counts?.services ?? 0}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span className="diff-label">Events</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {healthData?.database?.counts?.events ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tech Stack Specs */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#3b82f6" />
              Environment & Stack Specifications
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Frontend Framework:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>React 18 + Vite 5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Backend Server:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>Python 3.13 Flask (REST API)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Database Driver:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>PyMongo (MongoDB 8.0)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Architecture Topology:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>Interactive SVG Dependency Graph</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Root-Cause Engine:</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>Deterministic Rule Heuristics</span>
            </div>
          </div>
        </div>
      </div>

      {/* About Failure Replay Lab Section */}
      <div className="card">
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color="#06b6d4" />
            About Failure Replay Lab
          </span>
          <span className="badge badge-info" style={{ textTransform: 'none' }}>
            Cloud Incident Investigation Platform
          </span>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.6 }}>
          <strong>Failure Replay Lab</strong> is an incident reconstruction and post-mortem observability platform designed for site reliability engineers (SREs), DevOps teams, and cloud developers. In modern microservice architectures, an isolated failure (such as database connection exhaustion or a cache node crash) often causes downstream services to throw misleading 500 errors. Failure Replay Lab chronologically reconstructs simulated outages event-by-event, visualizes service degradation, and isolates the true root cause.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
              <Activity size={16} /> Chronological Replay Engine
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Sequences post-mortem telemetry using a deterministic state machine. Supports play, pause, scrubbing, and variable playback speeds (1x, 2x, 5x) with recursive timeout management and memory leak protection.
            </p>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
              <GitBranch size={16} /> Dependency Graph & Blast Radius
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Maps caller-callee dependencies across 6 architectural tiers. Distinguishes directly failing services from dependent callers that are degraded due to upstream outages.
            </p>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
              <ShieldCheck size={16} /> Rule-Based Root-Cause Analysis
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Applies transparent post-mortem heuristics to separate the earliest recorded symptom from the first service failure and the suspected root cause, with evidence timelines and recovery recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
