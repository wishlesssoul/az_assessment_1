import crypto from 'crypto';

const sites = new Map();
const auditLog = [];

function hashRecord(record) {
  return crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

export function getAllSites() {
  return [...sites.values()].map((site) => ({ ...site }));
}

export function getSiteById(siteId) {
  const site = sites.get(siteId);
  return site ? { ...site } : null;
}

export function persistSite(site) {
  sites.set(site.id, { ...site });
  return { ...site };
}

export function recordAudit(siteId, actorId, actionType, oldState, newState, permissionContext = {}) {
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

export function getAuditEntries() {
  return [...auditLog];
}
