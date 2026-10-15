import React, { useState } from 'react';
import Navbar from './components/Navbar';
import OverviewPage from './pages/OverviewPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailsPage from './pages/IncidentDetailsPage';
import ReplayLabPage from './pages/ReplayLabPage';
import DependencyMapPage from './pages/DependencyMapPage';
import CompareIncidentsPage from './pages/CompareIncidentsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [compareIncidentA, setCompareIncidentA] = useState(null);

  // Quick navigation helpers
  const handleLaunchReplay = (incidentId) => {
    setSelectedIncidentId(incidentId);
    setActivePage('replay');
  };

  const handleSelectIncident = (incidentId) => {
    setSelectedIncidentId(incidentId);
    setActivePage('details');
  };

  const handleCompare = (incidentId) => {
    setCompareIncidentA(incidentId);
    setActivePage('compare');
  };

  return (
    <div className="app-container">
      {/* Global Navigation Header */}
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      {/* Main Page Workspace */}
      <main className="main-content">
        {activePage === 'overview' && (
          <OverviewPage
            onReplay={handleLaunchReplay}
            onSelectIncident={handleSelectIncident}
            onViewDependencies={() => setActivePage('dependencies')}
          />
        )}

        {activePage === 'incidents' && (
          <IncidentsPage
            onReplay={handleLaunchReplay}
            onSelectIncident={handleSelectIncident}
          />
        )}

        {activePage === 'details' && (
          <IncidentDetailsPage
            incidentId={selectedIncidentId}
            onBack={() => setActivePage('incidents')}
            onReplay={handleLaunchReplay}
            onCompare={handleCompare}
          />
        )}

        {activePage === 'replay' && (
          <ReplayLabPage
            initialIncidentId={selectedIncidentId}
            onSelectIncidentDetails={handleSelectIncident}
          />
        )}

        {activePage === 'dependencies' && (
          <DependencyMapPage
            onReplayIncident={handleLaunchReplay}
          />
        )}

        {activePage === 'compare' && (
          <CompareIncidentsPage
            defaultIncA={compareIncidentA}
            onReplay={handleLaunchReplay}
          />
        )}

        {activePage === 'settings' && (
          <SettingsPage />
        )}
      </main>
    </div>
  );
}
