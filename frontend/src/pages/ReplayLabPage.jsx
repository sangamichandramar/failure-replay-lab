import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Code,
  Zap,
  Info
} from 'lucide-react';
import { fetchIncidents, fetchIncidentEvents, fetchServices } from '../services/api';
import DependencyGraph from '../components/DependencyGraph';
import SeverityBadge from '../components/SeverityBadge';
import ServiceModal from '../components/ServiceModal';

/**
 * REPLAY ENGINE CONSTANTS
 * Base interval duration in milliseconds for 1x playback speed.
 * At 1x speed, each event step transitions after 2500ms.
 * At 2x speed: 1250ms.
 * At 5x speed: 500ms.
 */
const BASE_SPEED_MS = 2500;

export default function ReplayLabPage({ initialIncidentId = null, onSelectIncidentDetails }) {
  // 1. Incidents selector state
  const [incidentsList, setIncidentsList] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId || '');
  
  // 2. Incident event stream state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 3. Topology services
  const [allServices, setAllServices] = useState([]);
  const [inspectedService, setInspectedService] = useState(null);

  // 4. Replay State Machine
  // currentIndex: zero-based index of the currently active revealed event
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x

  // Timer ref to prevent race conditions & memory leaks on unmount
  const timerRef = useRef(null);

  // Ref to hold latest state for interval closures
  const stateRef = useRef({ currentIndex: 0, totalEvents: 0, isPlaying: false });
  stateRef.current = { currentIndex, totalEvents: events.length, isPlaying };

  // Load all incidents on mount to populate the incident selector dropdown
  useEffect(() => {
    fetchIncidents()
      .then(res => {
        const list = res.incidents || [];
        setIncidentsList(list);
        if (!selectedIncidentId && list.length > 0) {
          // Default to the first incident if none passed
          setSelectedIncidentId(list[0].incident_id);
        }
      })
      .catch(err => console.error('Failed to fetch incidents list:', err));

    fetchServices()
      .then(res => setAllServices(res.services || []))
      .catch(err => console.error('Failed to fetch services:', err));
  }, []);

  // When selected incident changes, fetch and initialize its events
  useEffect(() => {
    if (!selectedIncidentId) return;

    // Reset playback whenever switching incidents
    stopPlayback();
    setCurrentIndex(0);
    setLoading(true);
    setError(null);

    fetchIncidentEvents(selectedIncidentId)
      .then(res => {
        // Events are guaranteed sorted chronologically from backend
        const evts = res.events || [];
        setEvents(evts);
        setCurrentIndex(0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load incident events');
        setLoading(false);
      });

    // Cleanup timer on incident switch or unmount
    return () => stopPlayback();
  }, [selectedIncidentId]);

  /**
   * PLAYBACK ENGINE TIMER EFFECT
   * Runs whenever isPlaying, currentIndex, or playbackSpeed changes.
   * Advances the playback step-by-step using setTimeout to avoid duplicate intervals.
   */
  useEffect(() => {
    if (!isPlaying) {
      stopPlayback();
      return;
    }

    // Check if we reached the final event
    if (currentIndex >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalTime = Math.max(200, Math.round(BASE_SPEED_MS / playbackSpeed));

    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= events.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, currentIndex, playbackSpeed, events.length]);

  const stopPlayback = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Playback Control Handlers
  const handlePlay = () => {
    if (events.length === 0) return;
    // If user is at the end, restart from 0
    if (currentIndex >= events.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    stopPlayback();
  };

  const handleRestart = () => {
    stopPlayback();
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handlePrev = () => {
    stopPlayback();
    setIsPlaying(false);
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    stopPlayback();
    setIsPlaying(false);
    setCurrentIndex(prev => Math.min(events.length - 1, prev + 1));
  };

  const handleSeek = (newIndex) => {
    stopPlayback();
    setIsPlaying(false);
    setCurrentIndex(Math.max(0, Math.min(events.length - 1, newIndex)));
  };

  /**
   * COMPUTE DYNAMIC SERVICE STATUSES UP TO CURRENT REPLAY STEP
   * Evaluates the sequence of events revealed so far:
   * 1. Start all services as 'healthy'.
   * 2. Sequentially apply state transitions from event 0 to currentIndex.
   * 3. Cascade 'affected' status to services whose upstream dependencies have 'failed'.
   */
  const computeActiveStatuses = () => {
    const statuses = {};
    allServices.forEach(s => {
      statuses[s.service_name] = 'healthy';
    });

    if (events.length === 0) return statuses;

    // Apply events from step 0 through the current step
    for (let i = 0; i <= currentIndex && i < events.length; i++) {
      const evt = events[i];
      const svc = evt.service_name;
      const sev = (evt.severity || '').toLowerCase();
      const etype = (evt.event_type || '').toLowerCase();
      const desc = (evt.description || '').toLowerCase();

      if (!statuses[svc]) statuses[svc] = 'healthy';

      if (etype === 'state_change' && (desc.includes('restored') || desc.includes('healthy') || desc.includes('recovers'))) {
        statuses[svc] = 'healthy';
      } else if (etype === 'action' && desc.includes('rollback')) {
        // Pods draining / recovering
        statuses[svc] = 'degraded';
      } else if (sev === 'critical' || sev === 'error') {
        statuses[svc] = 'failed';
      } else if (sev === 'warning' || etype === 'metric_anomaly') {
        // Do not downgrade a failed service to degraded
        if (statuses[svc] !== 'failed') {
          statuses[svc] = 'degraded';
        }
      }
    }

    // Mark direct dependents as 'affected' if an upstream dependency is failed
    allServices.forEach(s => {
      if (statuses[s.service_name] === 'healthy') {
        const hasFailedDependency = (s.dependencies || []).some(
          dep => statuses[dep] === 'failed'
        );
        if (hasFailedDependency) {
          statuses[s.service_name] = 'affected';
        }
      }
    });

    return statuses;
  };

  const activeServiceStatuses = computeActiveStatuses();
  const currentEvent = events[currentIndex] || null;
  const currentIncident = incidentsList.find(i => i.incident_id === selectedIncidentId);

  return (
    <div className="replay-dashboard">
      {/* Page Header with Incident Selector */}
      <div className="page-header" style={{ marginBottom: '14px' }}>
        <div className="page-title-group">
          <h2>Replay Lab — The Time Machine</h2>
          <p>Inspect simulated software incidents event-by-event with synchronized microservice telemetry</p>
        </div>

        {/* Incident Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Select Incident:</span>
          <select
            className="select-field"
            value={selectedIncidentId}
            onChange={e => setSelectedIncidentId(e.target.value)}
            style={{ fontWeight: 600, color: '#38bdf8', minWidth: '280px' }}
          >
            {incidentsList.map(inc => (
              <option key={inc.incident_id} value={inc.incident_id}>
                {inc.incident_id} - {inc.title.substring(0, 36)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="state-box">
          <Clock size={28} className="animate-spin" />
          <h4>Preparing Incident Time Machine...</h4>
          <p>Loading chronological event streams and microservice graph bindings.</p>
        </div>
      ) : error ? (
        <div className="state-box" style={{ borderColor: 'var(--status-failed)' }}>
          <AlertTriangle size={32} color="#ef4444" />
          <h4>Failed to Load Replay Events</h4>
          <p>{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="state-box">
          <Info size={32} />
          <h4>No Events Found For This Incident</h4>
          <p>Please seed sample data or pick another incident from the selector.</p>
        </div>
      ) : (
        <>
          {/* Replay Controls Banner */}
          <div className="replay-controls-card">
            <div className="controls-top-row">
              {/* Playback Button Group */}
              <div className="playback-buttons">
                <button
                  className="ctrl-btn"
                  onClick={handleRestart}
                  title="Restart from Event #1 (⏮)"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="ctrl-btn"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  title="Previous Event (◀)"
                >
                  <SkipBack size={16} />
                </button>

                {isPlaying ? (
                  <button
                    className="ctrl-btn ctrl-btn-play"
                    onClick={handlePause}
                    title="Pause Replay (⏸)"
                  >
                    <Pause size={20} />
                  </button>
                ) : (
                  <button
                    className="ctrl-btn ctrl-btn-play"
                    onClick={handlePlay}
                    title="Play Forward (▶)"
                  >
                    <Play size={20} />
                  </button>
                )}

                <button
                  className="ctrl-btn"
                  onClick={handleNext}
                  disabled={currentIndex === events.length - 1}
                  title="Next Event (▶)"
                >
                  <SkipForward size={16} />
                </button>
              </div>

              {/* Center Status: Step Indicator & Simulated Timestamp */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Event <span style={{ color: '#38bdf8' }}>{currentIndex + 1}</span> of {events.length}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                  marginTop: '2px'
                }}>
                  <Clock size={13} color="#06b6d4" />
                  <span>
                    Simulated Time: {currentEvent?.timestamp ? new Date(currentEvent.timestamp).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Speed Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>SPEED:</span>
                <div className="speed-selector">
                  {[1, 2, 5].map(spd => (
                    <button
                      key={spd}
                      className={`speed-btn ${playbackSpeed === spd ? 'active' : ''}`}
                      onClick={() => setPlaybackSpeed(spd)}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline Scrubber */}
            <div className="scrubber-container">
              <div
                className="scrubber-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const pct = Math.max(0, Math.min(1, clickX / rect.width));
                  const targetIdx = Math.round(pct * (events.length - 1));
                  handleSeek(targetIdx);
                }}
              >
                <div
                  className="scrubber-fill"
                  style={{
                    width: `${events.length > 1 ? (currentIndex / (events.length - 1)) * 100 : 100}%`
                  }}
                />
              </div>

              <div className="scrubber-labels">
                <span>Start: {events[0]?.timestamp ? new Date(events[0].timestamp).toLocaleTimeString() : ''}</span>
                <span>
                  {isPlaying ? '▶ Replaying Live' : currentIndex === events.length - 1 ? '✓ Complete' : '⏸ Paused'}
                </span>
                <span>End: {events[events.length - 1]?.timestamp ? new Date(events[events.length - 1].timestamp).toLocaleTimeString() : ''}</span>
              </div>
            </div>
          </div>

          {/* Split View: Event Stream Feed on Left, Live Dependency Graph + Inspector on Right */}
          <div className="replay-grid">
            {/* Left Column: Revealed Event Feed */}
            <div className="card">
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="#3b82f6" />
                  Revealed Incident Timeline
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {currentIndex + 1} / {events.length} Events Revealed
                </span>
              </div>

              <div className="event-feed">
                {events.map((evt, idx) => {
                  const isRevealed = idx <= currentIndex;
                  const isActive = idx === currentIndex;

                  return (
                    <div
                      key={evt.event_id}
                      className={`event-card ${isActive ? 'active-step' : ''} ${!isRevealed ? 'unrevealed' : ''}`}
                      onClick={() => handleSeek(idx)}
                    >
                      <div className="event-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            background: isActive ? '#2563eb' : 'var(--bg-input)',
                            color: '#fff',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.86rem' }}>
                            {evt.service_name}
                          </span>
                          <SeverityBadge severity={evt.severity} />
                        </div>
                        <span className="event-time">
                          {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>

                      <p className="event-desc">{evt.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Live Dependency Map + Telemetry Inspector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Synchronized Dependency Map */}
              <div className="card">
                <div className="card-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="#06b6d4" />
                    Synchronized Dependency Graph
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Live status at Event #{currentIndex + 1}
                  </span>
                </div>

                <DependencyGraph
                  activeStatuses={activeServiceStatuses}
                  onSelectService={setInspectedService}
                  highlightedServices={[currentEvent?.service_name]}
                />
              </div>

              {/* Active Step Telemetry Card */}
              {currentEvent && (
                <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <div className="card-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={18} color="#38bdf8" />
                      Active Step Diagnostic Telemetry
                    </span>
                    <span className="tag" style={{ textTransform: 'uppercase' }}>
                      {currentEvent.event_type}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <span className="diff-label">Originating Service</span>
                      <div style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 600, marginTop: '2px' }}>
                        {currentEvent.service_name}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <span className="diff-label">Simulated Timestamp</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#38bdf8', marginTop: '2px' }}>
                        {currentEvent.timestamp}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <span className="diff-label">Event Description</span>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
                      {currentEvent.description}
                    </p>
                  </div>

                  <div>
                    <span className="diff-label">Raw Telemetry Attributes</span>
                    <pre style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      color: '#a5f3fc',
                      marginTop: '6px',
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(currentEvent.details || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Service Inspector Modal */}
      {inspectedService && (
        <ServiceModal
          serviceName={inspectedService}
          onClose={() => setInspectedService(null)}
          onReplayIncident={(incId) => {
            setSelectedIncidentId(incId);
            setInspectedService(null);
          }}
        />
      )}
    </div>
  );
}
