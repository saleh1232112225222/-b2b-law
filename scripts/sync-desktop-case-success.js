/**
 * sync-desktop-case-success.js
 * Synchronizes the Case Success Metrics & Judicial Performance feature to the Desktop application (g:\b2b).
 */

const fs = require('fs');
const path = require('path');

const B2B_ROOT = path.resolve(__dirname, '../../b2b');
const W2W_ROOT = path.resolve(__dirname, '..');

console.log('=== SYNC CASE SUCCESS FEATURE TO B2B DESKTOP ===');
console.log('B2B Root:', B2B_ROOT);
console.log('W2W Root:', W2W_ROOT);

if (!fs.existsSync(B2B_ROOT)) {
  console.error(`Error: B2B directory not found at ${B2B_ROOT}`);
  process.exit(1);
}

// 1. Update G:\b2b\src\main\db\database.ts
console.log('\n[1/6] Updating b2b/src/main/db/database.ts...');
const dbPath = path.join(B2B_ROOT, 'src/main/db/database.ts');
if (fs.existsSync(dbPath)) {
  let content = fs.readFileSync(dbPath, 'utf8');

  if (!content.includes("'final_outcome'")) {
    const target = "addColumn('cases', 'archive_reason', 'archive_reason TEXT')";
    const addition = `addColumn('cases', 'archive_reason', 'archive_reason TEXT')
    addColumn('cases', 'final_outcome', "final_outcome TEXT DEFAULT 'pending'")
    addColumn('cases', 'claimed_amount', 'claimed_amount REAL DEFAULT 0')
    addColumn('cases', 'awarded_amount', 'awarded_amount REAL DEFAULT 0')
    addColumn('cases', 'failure_reason', 'failure_reason TEXT')

    db.exec(\`
      CREATE INDEX IF NOT EXISTS idx_cases_final_outcome ON cases(final_outcome);
      CREATE INDEX IF NOT EXISTS idx_cases_client_role ON cases(client_role);
      
      UPDATE cases 
      SET final_outcome = CASE 
        WHEN (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%ضد%'
          OR (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%خصم%'
          THEN 'lost'
        WHEN (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%جزئي%'
          OR (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%شبه كلي%'
          THEN 'partial_win'
        WHEN (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%صلح%'
          OR (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%تسوية%'
          THEN 'settled'
        WHEN (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%لصالح%'
          OR (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%للموكل%'
          OR ((SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%الموكل%' AND (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) NOT LIKE '%ضد%')
          THEN (CASE WHEN cases.client_role LIKE '%مدعى عليه%' OR cases.client_role LIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
        WHEN cases.status IN ('منتهية', 'مغلقة', 'بانتظار التنفيذ', 'محكومة', 'محكومة بحكم نهائي')
          THEN (CASE WHEN cases.client_role LIKE '%مدعى عليه%' OR cases.client_role LIKE '%مدعي عليه%' THEN 'dismissed' ELSE 'full_win' END)
        ELSE 'pending'
      END,
      failure_reason = CASE 
        WHEN (failure_reason IS NULL OR failure_reason = '') 
          AND ((SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%ضد%'
               OR (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%خصم%')
          THEN COALESCE(
            (SELECT NULLIF(TRIM(j.notes), '') FROM judgments j WHERE j.case_id = cases.id AND (j.favor LIKE '%ضد%' OR j.favor LIKE '%خصم%') ORDER BY j.judgment_date DESC LIMIT 1),
            'أسباب موضوعية / حكم ضد الموكل'
          )
        ELSE failure_reason
      END,
      claimed_amount = COALESCE(NULLIF(claimed_amount, 0), contract_amount, 0),
      awarded_amount = CASE 
        WHEN (awarded_amount IS NULL OR awarded_amount = 0)
          AND (
            (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%لصالح%'
            OR (SELECT j.favor FROM judgments j WHERE j.case_id = cases.id ORDER BY j.judgment_date DESC LIMIT 1) LIKE '%للموكل%'
            OR cases.status IN ('منتهية', 'مغلقة', 'بانتظار التنفيذ')
          )
          THEN COALESCE(NULLIF(awarded_amount, 0), NULLIF(claimed_amount, 0), contract_amount, 0)
        ELSE awarded_amount
      END
      WHERE (final_outcome IS NULL OR final_outcome = 'pending');
    \`)`;

    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(dbPath, content, 'utf8');
      console.log('  -> Added final_outcome columns, indexes, and backfill in ensureCriticalSchema.');
    }
  } else {
    console.log('  -> database.ts already contains final_outcome.');
  }
}

// 2. Update G:\b2b\src\main\services\ReportService.ts
console.log('\n[2/6] Updating b2b/src/main/services/ReportService.ts...');
const reportServicePath = path.join(B2B_ROOT, 'src/main/services/ReportService.ts');
if (fs.existsSync(reportServicePath)) {
  let content = fs.readFileSync(reportServicePath, 'utf8');

  if (content.includes('getCaseSuccessStats:')) {
    console.log('  -> ReportService already contains getCaseSuccessStats.');
  } else {
    // Strip previous broken static methods if present
    const staticIndex = content.indexOf('static getCaseSuccessStats');
  if (staticIndex !== -1) {
    content = content.substring(0, staticIndex).trimEnd();
    if (!content.endsWith(',')) {
      content += ',\n';
    }
  } else {
    // If not present, find the end of the object
    const lastBraceIndex = content.lastIndexOf('}');
    content = content.substring(0, lastBraceIndex).trimEnd();
    if (!content.endsWith(',')) {
      content += ',\n';
    }
  }

  const methodsToAdd = `
  getCaseSuccessStats: (params: any = {}) => {
    const db = getDb()
    const conditions: string[] = ["1=1"]
    const sqlParams: any[] = []

    if (params.from) {
      conditions.push("c.registration_date >= ?")
      sqlParams.push(params.from)
    }
    if (params.to) {
      conditions.push("c.registration_date <= ?")
      sqlParams.push(params.to)
    }
    if (params.court) {
      conditions.push("c.court = ?")
      sqlParams.push(params.court)
    }
    if (params.clientRole && params.clientRole !== 'الكل') {
      conditions.push("c.client_role = ?")
      sqlParams.push(params.clientRole)
    }

    const whereClause = conditions.join(" AND ")

    const statsSql = \`
      SELECT 
        COUNT(*) as total_cases,
        SUM(CASE WHEN c.final_outcome = 'full_win' THEN 1 ELSE 0 END) as full_win,
        SUM(CASE WHEN c.final_outcome = 'dismissed' THEN 1 ELSE 0 END) as dismissed,
        SUM(CASE WHEN c.final_outcome = 'settled' THEN 1 ELSE 0 END) as settled,
        SUM(CASE WHEN c.final_outcome = 'partial_win' THEN 1 ELSE 0 END) as partial_win,
        SUM(CASE WHEN c.final_outcome = 'lost' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN c.final_outcome IS NULL OR c.final_outcome = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(COALESCE(c.claimed_amount, 0)) as total_claimed,
        SUM(COALESCE(c.awarded_amount, 0)) as total_awarded,
        AVG(
          CASE 
            WHEN j.judgment_date IS NOT NULL AND c.registration_date IS NOT NULL 
            THEN (julianday(j.judgment_date) - julianday(c.registration_date))
            ELSE NULL 
          END
        ) as avg_duration_days
      FROM cases c
      LEFT JOIN (
        SELECT case_id, MAX(judgment_date) as judgment_date
        FROM judgments
        GROUP BY case_id
      ) j ON j.case_id = c.id
      WHERE \${whereClause}
    \`

    const r = db.prepare(statsSql).get(...sqlParams) as any || {}

    const fullWin = Number(r.full_win) || 0
    const dismissed = Number(r.dismissed) || 0
    const settled = Number(r.settled) || 0
    const partialWin = Number(r.partial_win) || 0
    const lost = Number(r.lost) || 0
    const pending = Number(r.pending) || 0
    const totalCases = Number(r.total_cases) || 0
    const closedCases = fullWin + dismissed + settled + partialWin + lost

    const weightedSuccessPoints = fullWin + dismissed + (settled * 0.75) + (partialWin * 0.5)
    const successRate = closedCases > 0 ? Math.round((weightedSuccessPoints / closedCases) * 1000) / 10 : 0
    const pureWinRate = closedCases > 0 ? Math.round(((fullWin + dismissed) / closedCases) * 1000) / 10 : 0

    const totalClaimed = Number(r.total_claimed) || 0
    const totalAwarded = Number(r.total_awarded) || 0
    const financialRecoveryRate = totalClaimed > 0 ? Math.round((totalAwarded / totalClaimed) * 1000) / 10 : 0
    const avgDurationDays = r.avg_duration_days ? Math.round(Number(r.avg_duration_days)) : 0

    return {
      totalCases,
      closedCases,
      pendingCases: pending,
      fullWinCases: fullWin,
      dismissedCases: dismissed,
      settledCases: settled,
      partialWinCases: partialWin,
      lostCases: lost,
      successRate,
      pureWinRate,
      avgDurationDays,
      totalClaimedAmount: totalClaimed,
      totalAwardedAmount: totalAwarded,
      financialRecoveryRate
    }
  },

  getCaseSuccessBreakdown: (params: any = {}) => {
    const db = getDb()
    const conditions: string[] = ["1=1"]
    const sqlParams: any[] = []

    if (params.from) {
      conditions.push("c.registration_date >= ?")
      sqlParams.push(params.from)
    }
    if (params.to) {
      conditions.push("c.registration_date <= ?")
      sqlParams.push(params.to)
    }
    if (params.court) {
      conditions.push("c.court = ?")
      sqlParams.push(params.court)
    }

    const whereClause = conditions.join(" AND ")

    // 1. By Client Role
    const roleRows = db.prepare(\`
      SELECT 
        COALESCE(c.client_role, 'غير محدد') as role,
        COUNT(*) as total,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed') THEN 1 ELSE 0 END) as pure_win,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 ELSE 0 END) as total_success,
        SUM(CASE WHEN c.final_outcome = 'lost' THEN 1 ELSE 0 END) as lost
      FROM cases c
      WHERE \${whereClause}
      GROUP BY COALESCE(c.client_role, 'غير محدد')
      ORDER BY total DESC
    \`).all(...sqlParams)

    // 2. By Case Type
    const typeRows = db.prepare(\`
      SELECT 
        COALESCE(c.case_type, 'أخرى') as case_type,
        COUNT(*) as total,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed') THEN 1 ELSE 0 END) as pure_win,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 ELSE 0 END) as total_success,
        SUM(CASE WHEN c.final_outcome = 'lost' THEN 1 ELSE 0 END) as lost
      FROM cases c
      WHERE \${whereClause}
      GROUP BY COALESCE(c.case_type, 'أخرى')
      ORDER BY total DESC
    \`).all(...sqlParams)

    // 3. By Lawyer
    const lawyerRows = db.prepare(\`
      SELECT 
        COALESCE(u.full_name, u.username, 'غير مسند') as lawyer_name,
        c.responsible_user_id as lawyer_id,
        COUNT(*) as total,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed') THEN 1 ELSE 0 END) as pure_win,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 ELSE 0 END) as total_success,
        SUM(CASE WHEN c.final_outcome = 'lost' THEN 1 ELSE 0 END) as lost
      FROM cases c
      LEFT JOIN users u ON u.id = c.responsible_user_id
      WHERE \${whereClause}
      GROUP BY c.responsible_user_id, COALESCE(u.full_name, u.username, 'غير مسند')
      ORDER BY total DESC
    \`).all(...sqlParams)

    // 4. By Quarter
    const trendRows = db.prepare(\`
      SELECT 
        strftime('%Y', COALESCE(j.judgment_date, c.registration_date)) || '-Q' || ((CAST(strftime('%m', COALESCE(j.judgment_date, c.registration_date)) AS INTEGER) + 2) / 3) as period,
        COUNT(*) as total,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed') THEN 1 ELSE 0 END) as pure_win,
        SUM(CASE WHEN c.final_outcome IN ('full_win', 'dismissed', 'settled', 'partial_win') THEN 1 ELSE 0 END) as total_success
      FROM cases c
      LEFT JOIN (
        SELECT case_id, MAX(judgment_date) as judgment_date
        FROM judgments
        GROUP BY case_id
      ) j ON j.case_id = c.id
      WHERE \${whereClause} AND (c.final_outcome != 'pending' OR c.status IN ('منتهية', 'محكومة بحكم نهائي'))
      GROUP BY period
      ORDER BY period ASC
    \`).all(...sqlParams)

    return {
      byClientRole: roleRows,
      byCaseType: typeRows,
      byLawyer: lawyerRows,
      byQuarter: trendRows
    }
  },

  getCaseFailureAnalysis: (params: any = {}) => {
    const db = getDb()
    const conditions: string[] = ["c.final_outcome = 'lost'"]
    const sqlParams: any[] = []

    if (params.from) {
      conditions.push("c.registration_date >= ?")
      sqlParams.push(params.from)
    }
    if (params.to) {
      conditions.push("c.registration_date <= ?")
      sqlParams.push(params.to)
    }

    const whereClause = conditions.join(" AND ")

    const failureRows = db.prepare(\`
      SELECT 
        COALESCE(NULLIF(TRIM(c.failure_reason), ''), 'أسباب موضوعية / أخرى') as reason,
        COUNT(*) as count
      FROM cases c
      WHERE \${whereClause}
      GROUP BY 1
      ORDER BY count DESC
    \`).all(...sqlParams) as Array<{ reason: string; count: number }>

    const totalLostCases = failureRows.reduce((acc, r) => acc + (Number(r.count) || 0), 0)
    const reasonsWithPct = failureRows.map(r => ({
      reason: r.reason,
      count: Number(r.count) || 0,
      percentage: totalLostCases > 0 ? Math.round(((Number(r.count) || 0) / totalLostCases) * 1000) / 10 : 0
    }))

    return {
      totalLostCases,
      reasons: reasonsWithPct
    }
  }
}
`;

  content += methodsToAdd;
  fs.writeFileSync(reportServicePath, content, 'utf8');
  console.log('  -> Formatted and updated ReportService with object literal methods.');
}

// 3. Update G:\b2b\src\main\ipc\handlers.ts
console.log('\n[3/6] Updating b2b/src/main/ipc/handlers.ts...');
const handlersPath = path.join(B2B_ROOT, 'src/main/ipc/handlers.ts');
if (fs.existsSync(handlersPath)) {
  let content = fs.readFileSync(handlersPath, 'utf8');

  if (!content.includes("'reports:caseSuccessStats'")) {
    const target = "safeHandle('reports:getDocumentsReport'";
    const addition = `safeHandle('reports:caseSuccessStats', (_, params) => {
    requirePermission('export_reports')
    return ReportService.getCaseSuccessStats(params)
  })

  safeHandle('reports:caseSuccessBreakdown', (_, params) => {
    requirePermission('export_reports')
    return ReportService.getCaseSuccessBreakdown(params)
  })

  safeHandle('reports:caseFailureAnalysis', (_, params) => {
    requirePermission('export_reports')
    return ReportService.getCaseFailureAnalysis(params)
  })

  safeHandle('reports:getDocumentsReport'`;

    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(handlersPath, content, 'utf8');
      console.log('  -> Registered IPC handlers for reports:caseSuccessStats, etc.');
    }
  } else {
    console.log('  -> handlers.ts already contains reports:caseSuccessStats.');
  }
}

// 4. Update G:\b2b\src\preload\index.ts
console.log('\n[4/6] Updating b2b/src/preload/index.ts...');
const preloadPath = path.join(B2B_ROOT, 'src/preload/index.ts');
if (fs.existsSync(preloadPath)) {
  let content = fs.readFileSync(preloadPath, 'utf8');

  if (!content.includes('getCaseSuccessStats:')) {
    const target = "getOperationsSummary: () => ipcRenderer.invoke('reports:getOperationsSummary'),";
    const addition = `getOperationsSummary: () => ipcRenderer.invoke('reports:getOperationsSummary'),
    getCaseSuccessStats: (params: any) => ipcRenderer.invoke('reports:caseSuccessStats', params),
    getCaseSuccessBreakdown: (params: any) => ipcRenderer.invoke('reports:caseSuccessBreakdown', params),
    getCaseFailureAnalysis: (params: any) => ipcRenderer.invoke('reports:caseFailureAnalysis', params),`;

    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(preloadPath, content, 'utf8');
      console.log('  -> Added reports methods to preload/index.ts.');
    }
  } else {
    console.log('  -> preload/index.ts already contains getCaseSuccessStats.');
  }
}

// 5. Update Desktop Types, API Adapter, Router, and Views
console.log('\n[5/6] Updating desktop renderer files...');

// 5a. Case types
const b2bCaseTypes = path.join(B2B_ROOT, 'src/renderer/src/types/case.ts');
if (fs.existsSync(b2bCaseTypes)) {
  let content = fs.readFileSync(b2bCaseTypes, 'utf8');
  if (!content.includes('final_outcome?:')) {
    const target = 'is_archived?: boolean';
    const addition = `is_archived?: boolean
  final_outcome?: 'full_win' | 'partial_win' | 'dismissed' | 'settled' | 'lost' | 'pending'
  claimed_amount?: number
  awarded_amount?: number
  failure_reason?: string`;
    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(b2bCaseTypes, content, 'utf8');
      console.log('  -> Updated b2b Case interface.');
    }
  }
}

// 5b. api.d.ts
const b2bApiDts = path.join(B2B_ROOT, 'src/renderer/src/api.d.ts');
if (fs.existsSync(b2bApiDts)) {
  let content = fs.readFileSync(b2bApiDts, 'utf8');
  if (!content.includes('getCaseSuccessStats:')) {
    const target = 'listTasks: (caseId?: string) => Promise<any[]>';
    const addition = `listTasks: (caseId?: string) => Promise<any[]>
        getCaseSuccessStats: (params?: any) => Promise<any>
        getCaseSuccessBreakdown: (params?: any) => Promise<any>
        getCaseFailureAnalysis: (params?: any) => Promise<any>`;
    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(b2bApiDts, content, 'utf8');
      console.log('  -> Updated b2b api.d.ts.');
    }
  }
}

// 5c. Copy CaseSuccessReport.vue
const srcReportView = path.join(W2W_ROOT, 'src/renderer/src/views/CaseSuccessReport.vue');
const destReportView = path.join(B2B_ROOT, 'src/renderer/src/views/CaseSuccessReport.vue');
if (fs.existsSync(srcReportView)) {
  fs.copyFileSync(srcReportView, destReportView);
  console.log('  -> Copied CaseSuccessReport.vue to b2b renderer views.');
}

// 5d. Router
const b2bRouter = path.join(B2B_ROOT, 'src/renderer/src/router/index.ts');
if (fs.existsSync(b2bRouter)) {
  let content = fs.readFileSync(b2bRouter, 'utf8');
  if (!content.includes('/reports/case-success')) {
    const target = "path: '/reports/operations',";
    const addition = `path: '/reports/case-success',
    name: 'CaseSuccessReport',
    component: () => import('../views/CaseSuccessReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/operations',`;
    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(b2bRouter, content, 'utf8');
      console.log('  -> Registered CaseSuccessReport route in b2b router.');
    }
  }
}

// 5e. ReportsDashboard.vue
const b2bDashboard = path.join(B2B_ROOT, 'src/renderer/src/views/ReportsDashboard.vue');
if (fs.existsSync(b2bDashboard)) {
  let content = fs.readFileSync(b2bDashboard, 'utf8');
  if (!content.includes('/reports/case-success')) {
    const target = "const reportCards = [";
    const addition = `const reportCards = [
  {
    title: 'نسب نجاح القضايا ومؤشرات الإنجاز',
    subtitle: 'تحليل الأحكام القضائية ومعدلات كسب الدعاوى وتشريح الإخفاق',
    icon: 'award',
    path: '/reports/case-success'
  },`;
    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(b2bDashboard, content, 'utf8');
      console.log('  -> Added report card to b2b ReportsDashboard.vue.');
    }
  }
}

// 5f. ApiAdapter.ts (if present in b2b)
const b2bApiAdapter = path.join(B2B_ROOT, 'src/renderer/src/api/ApiAdapter.ts');
if (fs.existsSync(b2bApiAdapter)) {
  let content = fs.readFileSync(b2bApiAdapter, 'utf8');
  if (!content.includes('getCaseSuccessStats:')) {
    const target = "getPreviewHtml: (payload: any) =>";
    const addition = `getCaseSuccessStats: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:caseSuccessStats', params)
        : cloudRequest({ method: 'GET', url: '/reports/case-success-stats', params }),
    getCaseSuccessBreakdown: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:caseSuccessBreakdown', params)
        : cloudRequest({ method: 'GET', url: '/reports/case-success-breakdown', params }),
    getCaseFailureAnalysis: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:caseFailureAnalysis', params)
        : cloudRequest({ method: 'GET', url: '/reports/case-failure-analysis', params }),
    getPreviewHtml: (payload: any) =>`;
    if (content.includes(target)) {
      content = content.replace(target, addition);
      fs.writeFileSync(b2bApiAdapter, content, 'utf8');
      console.log('  -> Updated b2b ApiAdapter.ts.');
    }
  }
}

console.log('\n[6/6] Sync complete successfully!');
