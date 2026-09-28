import crypto from 'crypto';
import { getSiteById, persistSite, recordAudit } from '../data/siteStore.js';

export function createSiteRecord(payload = {}) {
  const siteId = crypto.randomUUID();
  const site = {
    id: siteId,
    siteCode: payload.siteCode || 'US-1001',
    investigator: payload.investigator || 'Dr. Sarah Chen',
    region: payload.region || 'North America',
    documents: Array.isArray(payload.documents) ? payload.documents : ['cv', 'nda'],
    ndaSigned: payload.ndaSigned ?? true,
    trainingComplete: payload.trainingComplete ?? true,
    licenseExpiryDays: Number(payload.licenseExpiryDays ?? 45),
    status: 'submitted',
    riskScore: 'N/A',
    summary: 'New site submission received.',
    aiDecision: 'pending_review',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    adaptiveCard: null,
    findings: []
  };

  persistSite(site);
  recordAudit(site.id, 'system', 'site_submitted', null, site, { role: 'clinical_ops' });
  return site;
}

export function transitionSite(siteId, nextStatus, actorId, summary, metadata = {}) {
  const current = getSiteById(siteId);
  if (!current) return null;

  const oldState = { ...current };
  const updatedSite = {
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

  persistSite(updatedSite);
  recordAudit(siteId, actorId || 'system', `status_${nextStatus}`, oldState, updatedSite, {
    role: metadata.actorRole || 'system',
    decisionAction: metadata.decisionAction || null
  });

  return updatedSite;
}
