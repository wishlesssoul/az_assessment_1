import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { getAllSites, getSiteById, getAuditEntries } from './data/siteStore.js';
import { evaluateCompliance } from './services/complianceService.js';
import { createSiteRecord, transitionSite } from './services/workflowService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'clinical-site-onboarding-poc',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/sites', (req, res) => {
  res.json({ sites: getAllSites() });
});

app.get('/api/audit-log', (req, res) => {
  res.json({ auditLog: getAuditEntries() });
});

app.post('/api/sites', (req, res) => {
  const payload = req.body || {};

  const site = createSiteRecord({
    siteCode: payload.siteCode || `US-${Math.floor(1000 + Math.random() * 9000)}`,
    investigator: payload.investigator || 'Dr. Sarah Chen',
    region: payload.region || 'North America',
    documents: Array.isArray(payload.documents) ? payload.documents : ['cv', 'nda'],
    ndaSigned: payload.ndaSigned ?? true,
    trainingComplete: payload.trainingComplete ?? true,
    licenseExpiryDays: Number(payload.licenseExpiryDays ?? 14)
  });

  const evaluation = evaluateCompliance(site);
  const updatedSite = transitionSite(site.id, evaluation.status, 'ai-engine', evaluation.summary, {
    aiDecision: evaluation.decision,
    riskScore: evaluation.riskScore,
    findings: evaluation.findings,
    adaptiveCard: evaluation.adaptiveCard,
    actorRole: 'AI_Agent'
  });

  res.status(201).json({
    site: updatedSite,
    evaluation
  });
});

app.post('/api/sites/:id/decision', (req, res) => {
  const { id } = req.params;
  const { action = 'approve', actorRole = 'Regional_Director', actorId = 'regional.director@clinic.io' } = req.body || {};
  const site = getSiteById(id);

  if (!site) {
    return res.status(404).json({ message: 'Site not found.' });
  }

  let nextStatus;
  let summary;

  if (action === 'approve') {
    nextStatus = 'approved';
    summary = 'Compliance exception approved and site moved into active onboarding.';
  } else if (action === 'reject') {
    nextStatus = 'rejected';
    summary = 'Compliance exception rejected; corrective documentation requested.';
  } else {
    nextStatus = 'updates_requested';
    summary = 'Approver requested updates and re-submission.';
  }

  const result = transitionSite(id, nextStatus, actorId, summary, {
    actorRole,
    decisionAction: action,
    aiDecision: nextStatus,
    riskScore: site.riskScore || 'Medium',
    findings: site.findings || []
  });

  return res.json({ site: result, message: summary });
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
  console.log(`Clinical onboarding POC running on http://localhost:${port}`);
});
