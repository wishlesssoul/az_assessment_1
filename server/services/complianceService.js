const policyLibrary = [
  {
    id: 'clinical-compliance-baseline',
    title: 'Clinical Compliance Policy',
    tags: ['site', 'investigator', 'cv', 'nda', 'training', 'protocol', 'licensing', 'clinical'],
    content: 'All investigator onboarding requires a current CV, signed NDA, completed GCP training, protocol access clearance, and valid licensure before a clinical site can be approved. Expired or near-term credentials must be flagged for exception review.'
  },
  {
    id: 'gcp-training-requirement',
    title: 'GCP Training Requirement',
    tags: ['gcp', 'training', 'compliance'],
    content: 'Every investigator must complete GCP training and maintain current documentation. Missing or expired training requires an exception review and must be routed to the safety or regional approver.'
  },
  {
    id: 'nda-signature-policy',
    title: 'NDA Signature Control',
    tags: ['nda', 'signature', 'approved', 'sensitive', 'data'],
    content: 'A signed NDA is mandatory before access to trial data or study materials is granted. If the NDA is absent or not signed, the site must be placed into exception handling.'
  },
  {
    id: 'licensure-expiry-monitoring',
    title: 'License Expiry Monitoring',
    tags: ['license', 'expiry', 'monitoring', 'regional', 'approvals'],
    content: 'Practitioner licenses expiring within 30 days or already expired are high-risk. The workflow must escalate a case to regional approval and document the exception in the audit ledger.'
  }
];

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function retrieveRelevantPolicies(query = '') {
  const tokens = new Set(
    normalizeText(query)
      .split(/\s+/)
      .filter(Boolean)
  );

  return policyLibrary
    .map((policy) => {
      const haystack = normalizeText(`${policy.title} ${policy.content} ${policy.tags.join(' ')}`);
      const matches = [...tokens].filter((token) => haystack.includes(token));
      const score = matches.length + (haystack.includes('clinical') && tokens.has('clinical') ? 1 : 0);
      return { ...policy, score, matchedTerms: matches };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function buildDecisionSummary(policyEvidence, findings) {
  const evidenceTitles = policyEvidence.map((policy) => policy.title).join(', ');
  return `Retrieved policy context from ${evidenceTitles} and flagged the following compliance risks: ${findings.join('; ')}.`;
}

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

  if (!documents.includes('protocol')) {
    missingDocs.push('Protocol access');
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

  const query = [
    site.siteCode,
    site.investigator,
    site.region,
    site.trainingComplete ? 'training complete' : 'training incomplete',
    site.ndaSigned ? 'nda signed' : 'nda missing',
    Array.isArray(site.documents) ? site.documents.join(' ') : '',
    site.licenseExpiryDays ?? 'license expiry unknown'
  ].join(' ');

  const policyEvidence = retrieveRelevantPolicies(query);
  const riskScore = site.licenseExpiryDays !== undefined && site.licenseExpiryDays <= 30 ? 'High' : 'Medium';

  if (findings.length === 0) {
    return {
      decision: 'approved',
      status: 'approved',
      riskScore: 'Low',
      summary: `Policy retrieval confirmed compliance and approved the site using ${policyEvidence.length} relevant policy references.`,
      findings: [],
      policyEvidence,
      agenticReasoning: {
        steps: [
          'retrieve_relevant_policy_context',
          'compare_site_fields_against_policy_requirements',
          'approve_or_route_for_exception'
        ]
      },
      adaptiveCard: null
    };
  }

  return {
    decision: 'exception_required',
    status: 'exception_required',
    riskScore,
    summary: buildDecisionSummary(policyEvidence, findings),
    findings,
    policyEvidence,
    agenticReasoning: {
      steps: [
        'retrieve_relevant_policy_context',
        'map_site_findings_to_policy_requirements',
        'route_for_regional_approval'
      ]
    },
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
            { title: 'AI Risk Score:', value: `${riskScore} - ${findings[0]}` },
            { title: 'Policy Evidence:', value: policyEvidence.length ? policyEvidence[0].title : 'Policy review captured' }
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
