import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { createIncident } from '../services/api';

const AVAILABLE_SERVICES = [
  'Frontend',
  'API Gateway',
  'Authentication Service',
  'Order Service',
  'Cache Service',
  'Database'
];

export default function CreateIncidentModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    incident_id: '',
    title: '',
    description: '',
    severity: 'high',
    status: 'investigating',
    affected_services: ['Order Service', 'API Gateway'],
    suspected_root_cause: '',
    recovery_action: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const toggleService = (svc) => {
    setFormData(prev => {
      const exists = prev.affected_services.includes(svc);
      return {
        ...prev,
        affected_services: exists
          ? prev.affected_services.filter(s => s !== svc)
          : [...prev.affected_services, svc]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.incident_id.trim() || !formData.title.trim()) {
      setError('Incident ID and Title are required.');
      return;
    }
    if (formData.affected_services.length === 0) {
      setError('Please select at least one affected service.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createIncident({
        ...formData,
        incident_id: formData.incident_id.trim().toUpperCase(),
        started_at: new Date().toISOString()
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create incident.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="#3b82f6" />
            <h3>Create Simulated Incident</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-failed-bg)',
            border: '1px solid var(--status-failed-border)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            fontSize: '0.86rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Incident ID *</label>
              <input
                className="form-input"
                placeholder="e.g. INC-2024-006"
                value={formData.incident_id}
                onChange={e => setFormData({ ...formData, incident_id: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Incident Title *</label>
              <input
                className="form-input"
                placeholder="e.g. Memory Spike in Payment Service"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Severity</label>
              <select
                className="form-select"
                value={formData.severity}
                onChange={e => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="investigating">Investigating</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Describe symptoms, impact on users, and behavior..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Affected Services *</label>
            <div className="checkbox-grid">
              {AVAILABLE_SERVICES.map(svc => (
                <label key={svc} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.affected_services.includes(svc)}
                    onChange={() => toggleService(svc)}
                  />
                  <span>{svc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Suspected Root Cause (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Uncollected buffer queue leak"
              value={formData.suspected_root_cause}
              onChange={e => setFormData({ ...formData, suspected_root_cause: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Recovery Action (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Rolling restart of worker pods"
              value={formData.recovery_action}
              onChange={e => setFormData({ ...formData, recovery_action: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
