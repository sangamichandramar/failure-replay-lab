import React, { useEffect, useState } from 'react';
import { X, Network, AlertTriangle, ArrowRight, Layers } from 'lucide-react';
import { fetchService } from '../services/api';
import ServiceStatusBadge from './ServiceStatusBadge';
import SeverityBadge from './SeverityBadge';

export default function ServiceModal({ serviceName, onClose, onReplayIncident }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!serviceName) return;
    setLoading(true);
    fetchService(serviceName)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [serviceName]);

  if (!serviceName) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} color="#3b82f6" />
            <div>
              <h3>{serviceName}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Microservice Details & Topology</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="state-box">Loading service telemetry...</div>
        ) : error ? (
          <div className="state-box" style={{ borderColor: 'var(--status-failed)' }}>
            <AlertTriangle size={24} color="#ef4444" />
            <p>{error}</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Operational Status</span>
              <ServiceStatusBadge status={data?.service?.status} />
            </div>

            <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-input)' }}>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Role & Architecture</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{data?.service?.description}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Direct Upstream Dependencies</h4>
              {data?.service?.dependencies && data.service.dependencies.length > 0 ? (
                <div className="tag-list">
                  {data.service.dependencies.map(dep => (
                    <span key={dep} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowRight size={10} color="#3b82f6" /> {dep}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Leaf service (no external downstream service dependencies)</p>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Incidents Impacting This Service ({data?.affecting_incidents?.length || 0})
              </h4>
              {data?.affecting_incidents && data.affecting_incidents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.affecting_incidents.map(inc => (
                    <div
                      key={inc.incident_id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#3b82f6' }}>{inc.incident_id}</span>
                          <SeverityBadge severity={inc.severity} />
                        </div>
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginTop: '4px' }}>{inc.title}</p>
                      </div>
                      {onReplayIncident && (
                        <button
                          className="btn btn-replay btn-sm"
                          onClick={() => {
                            onClose();
                            onReplayIncident(inc.incident_id);
                          }}
                        >
                          Replay
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No historical incidents have disrupted this service.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
