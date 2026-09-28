import { api } from '../services/api.js';
import '../styles/app.css';

const state = {
  currentScreen: 'overview',
  selectedSiteId: null,
  sites: []
};

function statusLabel(value) {
  return value ? value.replace(/_/g, ' ') : 'unknown';
}

function setScreen(name) {
  state.currentScreen = name;
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.screen === name);
  });
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === `screen-${name}`);
  });
}

function renderOverview() {
  const sites = state.sites;
  const approved = sites.filter((site) => site.status === 'approved').length;
  const exceptions = sites.filter((site) => site.status === 'exception_required').length;
  const rejected = sites.filter((site) => site.status === 'rejected').length;

  const stats = [
    { label: 'Total Sites', value: sites.length, trend: '+12.4%' },
    { label: 'Approved', value: approved, trend: '+8.2%' },
    { label: 'Exceptions', value: exceptions, trend: '+2.1%' },
    { label: 'Rejected', value: rejected, trend: '-1.5%' }
  ];

  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = stats.map((card) => `
    <div class="stat-card">
      <div class="stat-label">${card.label}</div>
      <div class="stat-value">${card.value}</div>
      <div class="stat-trend">${card.trend} vs last week</div>
    </div>
  `).join('');

  const pipelineList = document.getElementById('pipelineList');
  pipelineList.innerHTML = sites.length ? sites.slice(0, 5).map((site) => `
    <div class="pipeline-item clickable-row" data-site-id="${site.id}">
      <div>
        <strong>${site.siteCode}</strong><br />
        <span class="muted">${site.investigator}</span>
      </div>
      <span class="status-chip ${site.status}">${statusLabel(site.status)}</span>
    </div>
  `).join('') : '<div class="empty">No site data yet.</div>';

  pipelineList.querySelectorAll('[data-site-id]').forEach((row) => {
    row.addEventListener('click', () => {
      state.selectedSiteId = row.dataset.siteId;
      setScreen('approval');
      renderApprovalDetail();
    });
  });

  const summaryList = document.getElementById('summaryList');
  summaryList.innerHTML = [
    { title: 'Investigator credential validation', detail: 'RAG review matched 93% of policy vectors.' },
    { title: 'Document intake backlog', detail: '12 files awaiting SharePoint ETL indexing.' },
    { title: 'Approval latency', detail: 'Median turnaround is 4.2 hours for exception cases.' }
  ].map((item) => `
    <div class="pipeline-item">
      <div>
        <strong>${item.title}</strong><br />
        <span class="muted">${item.detail}</span>
      </div>
      <span class="status-chip approved">Healthy</span>
    </div>
  `).join('');
}

function renderQueue() {
  const tbody = document.getElementById('siteTableBody');

  if (!state.sites.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty">No sites in workflow queue.</div></td></tr>';
    return;
  }

  tbody.innerHTML = state.sites.map((site) => `
    <tr class="clickable-row" data-site-id="${site.id}">
      <td><strong>${site.siteCode}</strong></td>
      <td>${site.investigator}</td>
      <td>${site.region}</td>
      <td><span class="status-chip ${site.status}">${statusLabel(site.status)}</span></td>
      <td>${site.riskScore || 'N/A'}</td>
      <td>${site.summary || 'Awaiting review'}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-site-id]').forEach((row) => {
    row.addEventListener('click', () => {
      state.selectedSiteId = row.dataset.siteId;
      setScreen('approval');
      renderApprovalDetail();
    });
  });
}

function renderAdaptiveCard(site) {
  const payload = site?.adaptiveCard || {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [{ type: 'TextBlock', text: 'No active exception card.' }],
    actions: []
  };

  const card = document.getElementById('adaptiveCardPreview');
  card.innerHTML = `
    <div class="adaptive-header">⚠️ ${payload.body?.[0]?.text || 'Pending Compliance Approval'}</div>
    <div class="fact"><span>Site</span><strong>${site?.siteCode || 'N/A'}</strong></div>
    <div class="fact"><span>Investigator</span><strong>${site?.investigator || 'N/A'}</strong></div>
    <div class="fact"><span>Risk</span><strong>${site?.riskScore || 'Medium'}</strong></div>
    <div class="fact"><span>Action</span><strong>${payload.actions?.length ? payload.actions.map((a) => a.title).join(' / ') : 'No action'}</strong></div>
    <pre class="mono" style="margin-top:14px; white-space:pre-wrap; overflow:auto;">${JSON.stringify(payload, null, 2)}</pre>
  `;
}

function renderApprovalDetail() {
  const site = state.sites.find((item) => item.id === state.selectedSiteId) || state.sites[0];
  const detail = document.getElementById('approvalDetail');

  if (!site) {
    detail.innerHTML = '<div class="empty">No site selected.</div>';
    renderAdaptiveCard(null);
    return;
  }

  detail.innerHTML = `
    <div class="detail-row"><span class="muted">Site ID</span><strong>${site.siteCode}</strong></div>
    <div class="detail-row"><span class="muted">Investigator</span><strong>${site.investigator}</strong></div>
    <div class="detail-row"><span class="muted">Region</span><strong>${site.region}</strong></div>
    <div class="detail-row"><span class="muted">Status</span><strong><span class="status-chip ${site.status}">${statusLabel(site.status)}</span></strong></div>
    <div class="detail-row"><span class="muted">Risk Score</span><strong>${site.riskScore || 'N/A'}</strong></div>
    <div class="detail-row"><span class="muted">Document Set</span><strong>${(site.documents || []).join(', ')}</strong></div>
    <div class="detail-row"><span class="muted">Vetting Summary</span><strong>${site.summary || 'Awaiting review'}</strong></div>
    ${site.findings?.length ? `<div class="detail-row"><span class="muted">Findings</span><ul>${site.findings.map((item) => `<li>${item}</li>`).join('')}</ul></div>` : ''}
    <div class="pill-row" style="margin-top:12px;">
      <button class="button success" data-decide="approve">Approve</button>
      <button class="button warning" data-decide="updates_requested">Request Updates</button>
      <button class="button danger" data-decide="reject">Reject</button>
    </div>
  `;

  document.querySelectorAll('[data-decide]').forEach((button) => {
    button.addEventListener('click', async () => {
      await submitDecision(site.id, button.dataset.decide);
    });
  });

  renderAdaptiveCard(site);
}

function renderAuditTrail(auditLog) {
  const container = document.getElementById('auditList');
  if (!auditLog.length) {
    container.innerHTML = '<div class="empty">No audit events recorded.</div>';
    return;
  }

  container.innerHTML = auditLog.slice().reverse().map((item) => `
    <div class="audit-item">
      <strong>${item.actionType}</strong>
      <div class="muted">${item.actorId} • ${new Date(item.createdAt).toLocaleString()}</div>
      <div class="muted">Site: ${item.siteId}</div>
      <div style="margin-top:8px;">Signature: <span class="mono">${item.cryptographicSignature.slice(0, 18)}...</span></div>
    </div>
  `).join('');
}

async function submitDecision(siteId, action) {
  const result = await api.submitDecision(siteId, action);
  await loadData();
  state.selectedSiteId = result.site.id;
  setScreen('audit');
}

async function loadData() {
  try {
    const [{ sites }, { auditLog }] = await Promise.all([
      api.getSites(),
      api.getAuditLog()
    ]);

    state.sites = sites;
    if (!state.selectedSiteId && sites.length) {
      state.selectedSiteId = sites[0].id;
    }

    renderOverview();
    renderQueue();
    renderAuditTrail(auditLog);

    if (state.currentScreen === 'approval') {
      renderApprovalDetail();
    }
  } catch (error) {
    console.error(error);
    document.getElementById('auditList').innerHTML = '<div class="empty">Unable to load data.</div>';
  }
}

async function handleCreateSite(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    siteCode: formData.get('siteCode'),
    investigator: formData.get('investigator'),
    region: formData.get('region'),
    licenseExpiryDays: Number(formData.get('licenseExpiryDays')),
    documents: formData.getAll('documents'),
    trainingComplete: formData.get('trainingComplete') === 'true',
    ndaSigned: formData.get('ndaSigned') === 'true'
  };

  const result = await api.createSite(payload);
  state.selectedSiteId = result.site.id;
  setScreen('approval');
  await loadData();
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      setScreen(button.dataset.screen);
      if (button.dataset.screen === 'approval') {
        renderApprovalDetail();
      }
    });
  });

  document.getElementById('newIntakeButton').addEventListener('click', () => setScreen('intake'));
  document.getElementById('seedButton').addEventListener('click', async () => {
    const result = await api.createSite({
      siteCode: 'US-3048',
      investigator: 'Dr. Amina Khan',
      region: 'North America',
      licenseExpiryDays: 9,
      documents: ['cv', 'nda'],
      trainingComplete: false,
      ndaSigned: false
    });
    state.selectedSiteId = result.site.id;
    setScreen('approval');
    await loadData();
  });

  document.getElementById('overviewRefresh').addEventListener('click', loadData);
  document.getElementById('fillSample').addEventListener('click', () => {
    const form = document.getElementById('siteForm');
    form.siteCode.value = 'US-2047';
    form.region.value = 'Western Europe';
    form.investigator.value = 'Dr. Emily Ng';
    form.licenseExpiryDays.value = '12';
    form.trainingComplete.value = 'false';
    form.ndaSigned.value = 'false';
  });

  document.getElementById('siteForm').addEventListener('submit', handleCreateSite);
}

export function initializeApp() {
  bindEvents();
  loadData();
}

initializeApp();
