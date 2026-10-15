import React, { useEffect, useState } from 'react';
import { Search, Plus, PlaySquare, AlertCircle, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchIncidents, deleteIncident } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import CreateIncidentModal from '../components/CreateIncidentModal';

export default function IncidentsPage({ onReplay, onSelectIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadIncidents = () => {
    setLoading(true);
    setError(null);
    fetchIncidents({ search, severity, status })
      .then(res => {
        setIncidents(res.incidents || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch incidents.');
        setLoading(false);
      });
  };

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      loadIncidents();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, severity, status]);

  const handleDelete = async (incidentId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete incident '${incidentId}' and all its events?`)) {
      return;
    }
    try {
      await deleteIncident(incidentId);
      loadIncidents();
    } catch (err) {
      alert(`Error deleting incident: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h2>All Incidents</h2>
          <p>Search, filter, and inspect simulated microservice outages across the environment</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadIncidents}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} /> Create Incident
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Search by ID (e.g. INC-2024-001) or title keyword..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="select-field"
          value={severity}
          onChange={e => setSeverity(e.target.value)}
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          className="select-field"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {loading ? (
          <div className="state-box">
            <RefreshCw size={24} className="animate-spin" />
            <p>Querying incidents collection...</p>
          </div>
        ) : error ? (
          <div className="state-box" style={{ borderColor: 'var(--status-failed)' }}>
            <AlertCircle size={28} color="#ef4444" />
            <h4>Failed to load incidents</h4>
            <p>{error}</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="state-box">
            <AlertCircle size={32} />
            <h4>No matching incidents found</h4>
            <p>Try clearing your search query or severity/status filter criteria.</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setSeverity('');
                setStatus('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Title & Description</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Affected Services</th>
                  <th>Started At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr
                    key={inc.incident_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectIncident(inc.incident_id)}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                      {inc.incident_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: '3px' }}>
                        {inc.title}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        maxWidth: '480px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
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
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      {inc.started_at ? new Date(inc.started_at).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-replay btn-sm"
                          onClick={() => onReplay(inc.incident_id)}
                          title="Replay This Failure"
                        >
                          <PlaySquare size={13} /> Replay
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectIncident(inc.incident_id)}
                          title="View Details"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => handleDelete(inc.incident_id, e)}
                          title="Delete Incident"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadIncidents}
      />
    </div>
  );
}
