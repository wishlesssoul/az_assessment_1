const API_BASE = 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }

  return response.json();
}

export const api = {
  health: () => request('/health'),
  getSites: () => request('/sites'),
  getAuditLog: () => request('/audit-log'),
  createSite: (payload) => request('/sites', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  submitDecision: (siteId, action, actorRole = 'Regional_Director', actorId = 'regional.director@clinic.io') =>
    request(`/sites/${siteId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ action, actorRole, actorId })
    })
};
