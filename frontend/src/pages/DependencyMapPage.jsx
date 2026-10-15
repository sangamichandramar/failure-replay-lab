import React, { useEffect, useState } from 'react';
import { GitBranch, RefreshCw, Layers, ShieldCheck, AlertTriangle, XCircle, Share2, Info } from 'lucide-react';
import { fetchServices, updateService } from '../services/api';
import DependencyGraph from '../components/DependencyGraph';
import ServiceModal from '../components/ServiceModal';

export default function DependencyMapPage({ onReplayIncident }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [activeStatuses, setActiveStatuses] = useState({});

  const loadServices = () => {
    setLoading(true);
    fetchServices()
      .then(res => {
        const list = res.services || [];
        setServices(list);
        const initialMap = {};
        list.forEach(s => {
          initialMap[s.service_name] = s.status || 'healthy';
        });
        setActiveStatuses(initialMap);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load services:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadServices();
  }, []);

  // Quick interactive simulation tester
  const simulateStatusChange = async (serviceName, newStatus) => {
    try {
      await updateService(serviceName, { status: newStatus });
      loadServices();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const resetAllHealthy = async () => {
    try {
      for (const s of services) {
        if (s.status !== 'healthy') {
          await updateService(s.service_name, { status: 'healthy' });
        }
      }
      loadServices();
    } catch (err) {
      alert(`Failed to reset services: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Service Dependency Map</h2>
          <p>Interactive architectural topology with directed dependency graph and health status inspection</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={resetAllHealthy}>
            <ShieldCheck size={14} color="#10b981" /> Set All Healthy
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadServices}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '20px' }}>
        {/* Main Graph SVG Card */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitBranch size={18} color="#3b82f6" />
              Microservice Architecture Graph (Click Any Node to Inspect)
            </span>
          </div>

          <DependencyGraph
            activeStatuses={activeStatuses}
            onSelectService={setSelectedService}
            selectedService={selectedService}
          />

          <div style={{
            marginTop: '16px',
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Info size={18} color="#38bdf8" />
            <span>
              <strong>Topology Rule:</strong> Arrows represent caller-callee dependencies. When an upstream service (like Database) fails, downstream dependents (Order Service, API Gateway) are automatically flagged as <em>affected</em> during replay.
            </span>
          </div>
        </div>

        {/* Interactive Service Inspector & Simulator Panel */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#06b6d4" />
              Service Status Simulator
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Simulate ad-hoc service degradation or failures to test how the topology renders:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {services.map(svc => (
              <div
                key={svc.service_name}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem', cursor: 'pointer' }}
                    onClick={() => setSelectedService(svc.service_name)}
                  >
                    {svc.service_name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {svc.dependencies?.length > 0 ? `Calls: ${svc.dependencies.join(', ')}` : 'Independent core tier'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: svc.status === 'healthy' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                    onClick={() => simulateStatusChange(svc.service_name, 'healthy')}
                    title="Set Healthy"
                  >
                    Healthy
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: svc.status === 'degraded' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}
                    onClick={() => simulateStatusChange(svc.service_name, 'degraded')}
                    title="Set Degraded"
                  >
                    Degraded
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: svc.status === 'failed' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                    onClick={() => simulateStatusChange(svc.service_name, 'failed')}
                    title="Set Failed"
                  >
                    Failed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Modal Drawer */}
      {selectedService && (
        <ServiceModal
          serviceName={selectedService}
          onClose={() => setSelectedService(null)}
          onReplayIncident={onReplayIncident}
        />
      )}
    </div>
  );
}
