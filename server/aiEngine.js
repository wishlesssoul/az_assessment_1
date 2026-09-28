export function evaluateCompliance(site) {
  const findings = [];
  const missingDocs = [];
  const documents = Array.isArray(site.documents) ? site.documents : [];

  if (!documents.includes('cv')) {
    missingDocs.push('CV');
  }

  if (!documents.includes('nda')) {
    missingDocs.push('NDA');
  }

  if (!site.trainingComplete) {
    findings.push('Training checklist incomplete.');
  }

  if (site.ndaSigned === false) {
    findings.push('NDA signature is missing or expired.');
  }

  if (site.licenseExpiryDays !== undefined && site.licenseExpiryDays <= 30) {
    findings.push(`License expiry is within ${site.licenseExpiryDays} days.`);
  }

  if (missingDocs.length > 0) {
    findings.push(`Missing required document(s): ${missingDocs.join(', ')}.`);
  }

  if (findings.length === 0) {
    return {
      decision: 'approved',
      status: 'approved',
      riskScore: 'Low',
      summary: 'The investigator profile matches the clinical compliance policy.',
      findings: [],
      adaptiveCard: null
    };
  }

  const riskScore = site.licenseExpiryDays !== undefined && site.licenseExpiryDays <= 30 ? 'High' : 'Medium';

  return {
    decision: 'exception_required',
    status: 'exception_required',
    riskScore,
    summary: 'Automatic compliance review flagged a site-level exception that requires regional approval.',
    findings,
    adaptiveCard: {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '⚠️ Pending Compliance Approval',
          weight: 'Bolder',
          size: 'Medium'
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Site ID:', value: site.siteCode || 'Unknown' },
            { title: 'Investigator:', value: site.investigator || 'Unknown investigator' },
            { title: 'AI Risk Score:', value: `${riskScore} - ${findings[0]}` }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Approve Exception',
          style: 'positive',
          data: {
            action: 'approve',
            siteId: site.siteCode,
            actorRole: 'Regional_Director'
          }
        },
        {
          type: 'Action.Submit',
          title: 'Reject / Request Updates',
          style: 'destructive',
          data: {
            action: 'reject',
            siteId: site.siteCode,
            actorRole: 'Regional_Director'
          }
        }
      ]
    }
  };
}
