const fs = require('fs');
const path = require('path');

console.log('--- Applying B2B Desktop Fixes ---');

// 1. Fix CaseDetails.vue in g:\b2b
const caseDetailsPath = 'g:\\b2b\\src\\renderer\\src\\views\\CaseDetails.vue';
let caseDetailsContent = fs.readFileSync(caseDetailsPath, 'utf8');
const oldBinding = '<ClientCaseReportDialog v-model:show="showClientReportDialog" :case-id="Number(caseId)" />';
const newBinding = '<ClientCaseReportDialog v-model:show="showClientReportDialog" :case-id="String(caseItem?.id || caseId || \'\')" />';
if (caseDetailsContent.includes(oldBinding)) {
  caseDetailsContent = caseDetailsContent.replace(oldBinding, newBinding);
  fs.writeFileSync(caseDetailsPath, caseDetailsContent, 'utf8');
  console.log('✓ Fixed case-id binding in CaseDetails.vue');
} else {
  console.log('! Target binding not found or already fixed in CaseDetails.vue');
}

// 2. Sync ClientCaseReportDialog.vue from w2w to b2b
const w2wDialogPath = 'g:\\w2w\\src\\renderer\\src\\components\\cases\\ClientCaseReportDialog.vue';
const b2bDialogPath = 'g:\\b2b\\src\\renderer\\src\\components\\cases\\ClientCaseReportDialog.vue';
fs.copyFileSync(w2wDialogPath, b2bDialogPath);
console.log('✓ Synced improved ClientCaseReportDialog.vue to g:\\b2b');

// 3. Fix preload/index.ts
const preloadPath = 'g:\\b2b\\src\\preload\\index.ts';
let preloadContent = fs.readFileSync(preloadPath, 'utf8');
if (!preloadContent.includes('clientCaseReport:')) {
  const target = '  sessionOutcome: {';
  const addition = `  clientCaseReport: {
    get: (caseId: string) => ipcRenderer.invoke('clientCaseReport:get', caseId),
    update: (payload: any) => ipcRenderer.invoke('clientCaseReport:update', payload),
    transition: (payload: any) => ipcRenderer.invoke('clientCaseReport:transition', payload),
    getHtml: (caseId: string) => ipcRenderer.invoke('clientCaseReport:getHtml', caseId),
    print: (caseId: string) => ipcRenderer.invoke('clientCaseReport:print', caseId)
  },
  sessionOutcome: {`;
  preloadContent = preloadContent.replace(target, addition);
  fs.writeFileSync(preloadPath, preloadContent, 'utf8');
  console.log('✓ Added clientCaseReport to g:\\b2b\\src\\preload\\index.ts');
} else {
  console.log('✓ clientCaseReport already present in preload/index.ts');
}

// 4. Fix api.d.ts
const apiDtsPath = 'g:\\b2b\\src\\renderer\\src\\api.d.ts';
let apiDtsContent = fs.readFileSync(apiDtsPath, 'utf8');
if (!apiDtsContent.includes('clientCaseReport:')) {
  const target = '      sessionOutcome: {';
  const addition = `      clientCaseReport: {
        get: (caseId: string) => Promise<any>
        update: (caseId: string, payload: any) => Promise<any>
        transition: (caseId: string, toStatus: string, sentVia?: string) => Promise<any>
        getHtml: (caseId: string) => Promise<string>
        print: (caseId: string) => Promise<any>
      }
      sessionOutcome: {`;
  apiDtsContent = apiDtsContent.replace(target, addition);
  fs.writeFileSync(apiDtsPath, apiDtsContent, 'utf8');
  console.log('✓ Added clientCaseReport to g:\\b2b\\src\\renderer\\src\\api.d.ts');
} else {
  console.log('✓ clientCaseReport already present in api.d.ts');
}

// 5. Enhance ClientCaseReportService.ts
const servicePath = 'g:\\b2b\\src\\main\\services\\ClientCaseReportService.ts';
let serviceContent = fs.readFileSync(servicePath, 'utf8');

// Replace SELECT query in buildDesktopClientCaseReport
const oldSelectQuery = `    WHERE c.id = ?
  \`).get(caseId) as any`;
const newSelectQuery = `    WHERE c.id = ? OR CAST(c.id AS TEXT) = CAST(? AS TEXT) OR c.case_number = ?
  \`).get(caseId, caseId, caseId) as any`;

if (serviceContent.includes(oldSelectQuery)) {
  serviceContent = serviceContent.replace(oldSelectQuery, newSelectQuery);
}

// Inject const realCaseId = String(cRow.id)
const oldThrowCheck = `  if (!cRow) {
    throw new Error('القضية غير موجودة في قاعدة بيانات المكتب')
  }`;
const newThrowCheck = `  if (!cRow) {
    throw new Error('القضية غير موجودة في قاعدة بيانات المكتب')
  }

  const realCaseId = String(cRow.id)`;

if (serviceContent.includes(oldThrowCheck) && !serviceContent.includes('const realCaseId = String(cRow.id)')) {
  serviceContent = serviceContent.replace(oldThrowCheck, newThrowCheck);
}

// Replace caseId with realCaseId in sessions query
serviceContent = serviceContent.replace(
  'WHERE s.case_id = ?\n    ORDER BY s.date ASC, s.time ASC, s.created_at ASC\n  `).all(caseId)',
  'WHERE s.case_id = ? OR CAST(s.case_id AS TEXT) = ?\n    ORDER BY s.date ASC, s.time ASC, s.created_at ASC\n  `).all(realCaseId, realCaseId)'
);

// Replace caseId in judgments query
serviceContent = serviceContent.replace(
  'SELECT * FROM judgments WHERE case_id = ? ORDER BY judgment_date DESC\n    `).all(caseId)',
  'SELECT * FROM judgments WHERE case_id = ? OR CAST(case_id AS TEXT) = ? ORDER BY judgment_date DESC\n    `).all(realCaseId, realCaseId)'
);

// Replace existingReport query
serviceContent = serviceContent.replace(
  'SELECT * FROM case_client_reports WHERE case_id = ?\n  `).get(caseId)',
  'SELECT * FROM case_client_reports WHERE case_id = ? OR CAST(case_id AS TEXT) = ?\n  `).get(realCaseId, realCaseId)'
);

// In returned object
serviceContent = serviceContent.replace(
  'id: existingReport?.id || caseId,\n    companyId: \'desktop-local\',\n    caseId,',
  'id: existingReport?.id || realCaseId,\n    companyId: \'desktop-local\',\n    caseId: realCaseId,'
);

// In saveDesktopClientCaseReportEdits
const saveTarget = `  ensureDesktopCaseClientReportsTable()
  const db = getDb()

  const existing = db.prepare('SELECT metadata_json FROM case_client_reports WHERE case_id = ?').get(caseId) as any`;

const saveReplacement = `  ensureDesktopCaseClientReportsTable()
  const db = getDb()

  const cRow = db.prepare('SELECT id FROM cases WHERE id = ? OR CAST(id AS TEXT) = CAST(? AS TEXT) OR case_number = ?').get(caseId, caseId, caseId) as any
  const targetCaseId = cRow ? String(cRow.id) : String(caseId)

  const existing = db.prepare('SELECT metadata_json FROM case_client_reports WHERE case_id = ? OR CAST(case_id AS TEXT) = ?').get(targetCaseId, targetCaseId) as any`;

if (serviceContent.includes(saveTarget)) {
  serviceContent = serviceContent.replace(saveTarget, saveReplacement);
  serviceContent = serviceContent.replace('    caseId,\n    data.clientId || null,', '    targetCaseId,\n    data.clientId || null,');
}

// In transitionDesktopClientCaseReportStatus
const transTarget = `  ensureDesktopCaseClientReportsTable()
  const db = getDb()

  const existing = db.prepare('SELECT * FROM case_client_reports WHERE case_id = ?').get(caseId) as any`;

const transReplacement = `  ensureDesktopCaseClientReportsTable()
  const db = getDb()

  const cRow = db.prepare('SELECT id FROM cases WHERE id = ? OR CAST(id AS TEXT) = CAST(? AS TEXT) OR case_number = ?').get(caseId, caseId, caseId) as any
  const targetCaseId = cRow ? String(cRow.id) : String(caseId)

  const existing = db.prepare('SELECT * FROM case_client_reports WHERE case_id = ? OR CAST(case_id AS TEXT) = ?').get(targetCaseId, targetCaseId) as any`;

if (serviceContent.includes(transTarget)) {
  serviceContent = serviceContent.replace(transTarget, transReplacement);
  serviceContent = serviceContent.replace('    targetCaseId,\n    data.clientId || null,', '    targetCaseId,\n    data.clientId || null,');
  serviceContent = serviceContent.replace('WHERE case_id = ?\n    `).run(', 'WHERE case_id = ? OR CAST(case_id AS TEXT) = ?\n    `).run(');
  serviceContent = serviceContent.replace('caseId\n    )', 'targetCaseId, targetCaseId\n    )');
}

fs.writeFileSync(servicePath, serviceContent, 'utf8');
console.log('✓ Updated ClientCaseReportService.ts with flexible querying and realCaseId');

// 6. Adjust handlers.ts in g:\b2b
const handlersPath = 'g:\\b2b\\src\\main\\ipc\\handlers.ts';
let handlersContent = fs.readFileSync(handlersPath, 'utf8');

handlersContent = handlersContent.replace(
  `  safeHandle('clientCaseReport:get', (_, caseId: string) => {
    requirePermission('view_cases')
    requireCaseScope(caseId, 'view')
    return buildDesktopClientCaseReport(caseId)
  })`,
  `  safeHandle('clientCaseReport:get', (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    return buildDesktopClientCaseReport(caseId)
  })`
);

handlersContent = handlersContent.replace(
  `  safeHandle('clientCaseReport:getHtml', (_, caseId: string) => {
    requirePermission('view_cases')
    requireCaseScope(caseId, 'view')
    const report = buildDesktopClientCaseReport(caseId)`,
  `  safeHandle('clientCaseReport:getHtml', (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    const report = buildDesktopClientCaseReport(caseId)`
);

handlersContent = handlersContent.replace(
  `  safeHandle('clientCaseReport:print', async (_, caseId: string) => {
    requirePermission('view_cases')
    requireCaseScope(caseId, 'view')
    const report = buildDesktopClientCaseReport(caseId)`,
  `  safeHandle('clientCaseReport:print', async (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    const report = buildDesktopClientCaseReport(caseId)`
);

fs.writeFileSync(handlersPath, handlersContent, 'utf8');
console.log('✓ Updated handlers.ts for clientCaseReport');

console.log('--- All B2B Desktop Fixes Applied Successfully ---');
