/**
 * Failure Replay Lab - API Client
 * --------------------------------
 * Centralized HTTP service to interface React with the Flask Python backend.
 * Uses Vite proxy or fallback URL, parses JSON, and provides beginner-friendly error messages.
 */

const API_BASE = '/api';

/**
 * Generic request helper with error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// 1. System Health
export async function fetchHealth() {
  return request('/health');
}

// 2. Dashboard Aggregates
export async function fetchDashboard() {
  return request('/dashboard');
}

// 3. Incidents List with Filters & Search
export async function fetchIncidents({ search = '', severity = '', status = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (severity) params.append('severity', severity);
  if (status) params.append('status', status);
  
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return request(`/incidents${queryStr}`);
}

// 4. Single Incident
export async function fetchIncident(incidentId) {
  return request(`/incidents/${encodeURIComponent(incidentId)}`);
}

// 5. Incident Chronological Events (Replay feed)
export async function fetchIncidentEvents(incidentId) {
  return request(`/incidents/${encodeURIComponent(incidentId)}/events`);
}

// 6. Incident Root-Cause Analysis
export async function fetchIncidentAnalysis(incidentId) {
  return request(`/incidents/${encodeURIComponent(incidentId)}/analysis`);
}

// 7. Services List
export async function fetchServices() {
  return request('/services');
}

// 8. Single Service with Telemetry History
export async function fetchService(serviceName) {
  return request(`/services/${encodeURIComponent(serviceName)}`);
}

// 8b. Update Service Status or Details
export async function updateService(serviceName, updateData) {
  return request(`/services/${encodeURIComponent(serviceName)}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
}

// 9. Create Incident
export async function createIncident(incidentData) {
  return request('/incidents', {
    method: 'POST',
    body: JSON.stringify(incidentData),
  });
}

// 10. Update Incident
export async function updateIncident(incidentId, updateData) {
  return request(`/incidents/${encodeURIComponent(incidentId)}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
}

// 11. Delete Incident
export async function deleteIncident(incidentId) {
  return request(`/incidents/${encodeURIComponent(incidentId)}`, {
    method: 'DELETE',
  });
}
