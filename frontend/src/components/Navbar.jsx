import React, { useEffect, useState } from 'react';
import { Activity, PlaySquare, AlertCircle, GitCompare, GitBranch, Settings, Database, RefreshCw, Terminal } from 'lucide-react';
import { fetchHealth } from '../services/api';

export default function Navbar({ activePage, setActivePage }) {
  const [dbStatus, setDbStatus] = useState({ connected: false, checking: true });

  const checkDb = () => {
    setDbStatus(prev => ({ ...prev, checking: true }));
    fetchHealth()
      .then(res => {
        setDbStatus({
          connected: res?.database?.connected || false,
          checking: false,
          count: res?.database?.counts?.incidents || 0
        });
      })
      .catch(() => {
        setDbStatus({ connected: false, checking: false });
      });
  };

  useEffect(() => {
    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand / Logo */}
        <div className="brand" onClick={() => setActivePage('overview')}>
          <div className="brand-icon">
            <Activity size={22} />
          </div>
          <div className="brand-text">
            <h1>FAILURE REPLAY LAB</h1>
            <p>The Time Machine for Software Bugs</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-links">
          <button
            className={`nav-link ${activePage === 'overview' ? 'active' : ''}`}
            onClick={() => setActivePage('overview')}
          >
            <Activity size={16} />
            <span>Overview</span>
          </button>

          <button
            className={`nav-link ${activePage === 'incidents' ? 'active' : ''}`}
            onClick={() => setActivePage('incidents')}
          >
            <AlertCircle size={16} />
            <span>All Incidents</span>
          </button>

          <button
            className={`nav-link ${activePage === 'replay' ? 'active' : ''}`}
            onClick={() => setActivePage('replay')}
            style={{ fontWeight: 600 }}
          >
            <PlaySquare size={16} color="#38bdf8" />
            <span style={{ color: activePage === 'replay' ? '#fff' : '#38bdf8' }}>Replay Lab</span>
          </button>

          <button
            className={`nav-link ${activePage === 'dependencies' ? 'active' : ''}`}
            onClick={() => setActivePage('dependencies')}
          >
            <GitBranch size={16} />
            <span>Dependency Map</span>
          </button>

          <button
            className={`nav-link ${activePage === 'compare' ? 'active' : ''}`}
            onClick={() => setActivePage('compare')}
          >
            <GitCompare size={16} />
            <span>Compare</span>
          </button>

          <button
            className={`nav-link ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => setActivePage('settings')}
          >
            <Settings size={16} />
            <span>Settings & Info</span>
          </button>
        </nav>

        {/* DB Status Pill */}
        <div className="nav-actions">
          <div
            className="live-pill"
            style={{
              cursor: 'pointer',
              background: dbStatus.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: dbStatus.connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              color: dbStatus.connected ? '#10b981' : '#f87171'
            }}
            title="Click to re-verify MongoDB connection"
            onClick={checkDb}
          >
            <span
              className="live-dot"
              style={{
                background: dbStatus.connected ? '#10b981' : '#ef4444'
              }}
            />
            <Database size={13} />
            <span>{dbStatus.connected ? 'MongoDB Live' : 'MongoDB Offline'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
