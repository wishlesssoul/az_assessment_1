import crypto from 'crypto';

const sites = new Map();
const auditLog = [];

function hashRecord(record) {
  return crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

export function addAudit(siteId, actorId, actionType, oldState, newState, permissionContext = {}) {
  const record = {
    auditId: crypto.randomUUID(),
    siteId,
    actorId,
    actionType,
    oldState,
    newState,
    permissionContext,
    cryptographicSignature: hashRecord({
      siteId,
      actorId,
      actionType,
      oldState,
      newState,
      permissionContext
    }),
    createdAt: new Date().toISOString()
  };

  auditLog.push(record);
  return record;
}

export function createSite(payload = {}) {
  const siteId = crypto.randomUUID();
  const site = {
    id: siteId,
    siteCode: payload.siteCode || 'US-1001',
    investigator: payload.investigator || 'Dr. Sarah Chen',
    region: payload.region || 'North America',
    documents: payload.documents || ['cv', 'nda'],
    ndaSigned: payload.ndaSigned ?? true,
    trainingComplete: payload.trainingComplete ?? true,
    licenseExpiryDays: payload.licenseExpiryDays ?? 45,
    status: 'submitted',
    riskScore: 'N/A',
    summary: 'New site submission received.',
    aiDecision: 'pending_review',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    adaptiveCard: null,
    findings: []
  };

  sites.set(siteId, site);
  addAudit(siteId, 'system', 'site_submitted', null, site, { role: 'clinical_ops' });
  return site;
}

export function getSites() {
  return [...sites.values()].map((site) => ({ ...site }));
}

export function getSiteById(siteId) {
  const site = sites.get(siteId);
  return site ? { ...site } : null;
}

export function setSiteStatus(siteId, nextStatus, actorId, summary, metadata = {}) {
  const current = sites.get(siteId);

  if (!current) {
    return null;
  }

  const oldState = { ...current };
  const newState = {
    ...current,
    status: nextStatus,
    summary,
    riskScore: metadata.riskScore ?? current.riskScore,
    aiDecision: metadata.aiDecision ?? current.aiDecision,
    findings: metadata.findings ?? current.findings,
    adaptiveCard: metadata.adaptiveCard ?? current.adaptiveCard,
    actorId: actorId || current.actorId,
    lastUpdated: new Date().toISOString(),
    ...(metadata.extra || {})
  };

  sites.set(siteId, newState);
  addAudit(siteId, actorId || 'system', `status_${nextStatus}`, oldState, newState, {
    role: metadata.actorRole || 'system',
    decisionAction: metadata.decisionAction || null
  });

  return { ...newState };
}

export function getAuditLog() {
  return [...auditLog];
}
