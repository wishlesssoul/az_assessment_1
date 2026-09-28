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

export function seedDemoData() {
  if (sites.size > 0) {
    return [...sites.values()].map((site) => ({ ...site }));
  }

  const demoSites = [
    {
      siteCode: 'US-2047',
      investigator: 'Dr. Emily Ng',
      region: 'Western Europe',
      documents: ['cv', 'nda', 'gcp', 'protocol'],
      ndaSigned: true,
      trainingComplete: true,
      licenseExpiryDays: 12,
      status: 'exception_required',
      riskScore: 'High',
      summary: 'Site flagged for license expiry and regional approval before activation.',
      aiDecision: 'exception_required',
      findings: ['License expiry is within 12 days.', 'Protocol access verification pending.'],
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [{ type: 'TextBlock', text: '⚠️ Pending Compliance Approval' }],
        actions: [{ type: 'Action.Submit', title: 'Approve Exception' }]
      }
    },
    {
      siteCode: 'US-1189',
      investigator: 'Dr. Marcus Bell',
      region: 'North America',
      documents: ['cv', 'nda', 'gcp', 'protocol'],
      ndaSigned: true,
      trainingComplete: true,
      licenseExpiryDays: 48,
      status: 'approved',
      riskScore: 'Low',
      summary: 'Investigator profile matched the clinical policy baseline and was approved.',
      aiDecision: 'approved',
      findings: [],
      adaptiveCard: null
    },
    {
      siteCode: 'US-4003',
      investigator: 'Dr. Priya Nair',
      region: 'Asia Pacific',
      documents: ['cv', 'nda'],
      ndaSigned: false,
      trainingComplete: false,
      licenseExpiryDays: 26,
      status: 'updates_requested',
      riskScore: 'Medium',
      summary: 'GCP and NDA documentation are incomplete; re-submission requested.',
      aiDecision: 'updates_requested',
      findings: ['Training checklist incomplete.', 'NDA signature is missing or expired.'],
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [{ type: 'TextBlock', text: '⚠️ Training and NDA follow-up required' }],
        actions: [{ type: 'Action.Submit', title: 'Request Updates' }]
      }
    },
    {
      siteCode: 'US-6621',
      investigator: 'Dr. Sofia Alvarez',
      region: 'Latin America',
      documents: ['cv', 'nda', 'gcp', 'protocol'],
      ndaSigned: true,
      trainingComplete: true,
      licenseExpiryDays: 79,
      status: 'rejected',
      riskScore: 'Medium',
      summary: 'Compliance board rejected the submission due to unresolved credential mismatch.',
      aiDecision: 'rejected',
      findings: ['Credential mismatch in investigator records.'],
      adaptiveCard: null
    },
    {
      siteCode: 'US-7812',
      investigator: 'Dr. Daniel Kim',
      region: 'North America',
      documents: ['cv', 'nda', 'gcp', 'protocol'],
      ndaSigned: true,
      trainingComplete: true,
      licenseExpiryDays: 90,
      status: 'submitted',
      riskScore: 'Low',
      summary: 'New site intake is awaiting AI compliance review and policy validation.',
      aiDecision: 'pending_review',
      findings: [],
      adaptiveCard: null
    },
    {
      siteCode: 'US-5034',
      investigator: 'Dr. Leah Okafor',
      region: 'Middle East',
      documents: ['cv', 'nda', 'protocol'],
      ndaSigned: true,
      trainingComplete: false,
      licenseExpiryDays: 14,
      status: 'exception_required',
      riskScore: 'High',
      summary: 'GCP waiver and near-term license expiry require regional exception handling.',
      aiDecision: 'exception_required',
      findings: ['Training checklist incomplete.', 'License expiry is within 14 days.'],
      adaptiveCard: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [{ type: 'TextBlock', text: '⚠️ Waiver and expiry review required' }],
        actions: [{ type: 'Action.Submit', title: 'Escalate Exception' }]
      }
    }
  ];

  demoSites.forEach((site) => {
    const siteId = crypto.randomUUID();
    const record = {
      id: siteId,
      siteCode: site.siteCode,
      investigator: site.investigator,
      region: site.region,
      documents: site.documents,
      ndaSigned: site.ndaSigned,
      trainingComplete: site.trainingComplete,
      licenseExpiryDays: site.licenseExpiryDays,
      status: site.status,
      riskScore: site.riskScore,
      summary: site.summary,
      aiDecision: site.aiDecision,
      findings: site.findings || [],
      adaptiveCard: site.adaptiveCard || null,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    persistSite(record);
    recordAudit(siteId, 'seed-data', `status_${site.status}`, null, record, {
      role: 'demo_seed',
      source: 'realistic_sample_data'
    });
  });

  return [...sites.values()].map((site) => ({ ...site }));
}

export function getAuditEntries() {
  return [...auditLog];
}
