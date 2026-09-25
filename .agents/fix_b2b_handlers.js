const fs = require('fs');

const handlersPath = 'g:\\b2b\\src\\main\\ipc\\handlers.ts';
let content = fs.readFileSync(handlersPath, 'utf8');

const targetBlock = `  safeHandle('sessionOutcome:printClientReport', async (_, sessionId: string) => {
    requirePermission('view_sessions')
    const report = buildDesktopClientSessionReport(sessionId)
    const firm = (FirmRepository.get() as any) || {}
    const html = renderDesktopClientSessionReportHtml(report, {
      name: firm?.name || firm?.firm_name,
      phone: firm?.phone,
      address: firm?.address
    })

  // CLIENT CASE REPORT (التقرير الشامل للموكل)
  safeHandle('clientCaseReport:get', (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    return buildDesktopClientCaseReport(caseId)
  })

  safeHandle('clientCaseReport:update', (_, payload: {
    caseId: string
    clientSummary: string
    lawyerNoteAndNextStep: string
    internalNotes?: string
    clientId?: string
    showSubjectInReport?: boolean
    shortSubject?: string
    proceedings?: any
    casePosition?: any
    actionItems?: any
    metadataJson?: any
  }) => {
    requirePermission('edit_cases')
    requireCaseScope(payload.caseId, 'edit')
    saveDesktopClientCaseReportEdits(payload.caseId, payload)
    return buildDesktopClientCaseReport(payload.caseId)
  })

  safeHandle('clientCaseReport:transition', (_, payload: {
    caseId: string
    toStatus: 'draft' | 'reviewed' | 'approved' | 'sent'
    sentVia?: string
  }) => {
    requirePermission('edit_cases')
    requireCaseScope(payload.caseId, 'edit')
    const session = AuthService.getSession()
    transitionDesktopClientCaseReportStatus(payload.caseId, {
      toStatus: payload.toStatus,
      sentVia: payload.sentVia,
      userId: session?.userId,
      userName: session?.username
    })
    return buildDesktopClientCaseReport(payload.caseId)
  })

  safeHandle('clientCaseReport:getHtml', (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    const report = buildDesktopClientCaseReport(caseId)
    const firm = (FirmRepository.get() as any) || {}
    return renderDesktopClientCaseReportHtml(report, {
      name: firm?.name || firm?.firm_name,
      phone: firm?.phone,
      address: firm?.address
    })
  })

  safeHandle('clientCaseReport:print', async (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    const report = buildDesktopClientCaseReport(caseId)
    const firm = (FirmRepository.get() as any) || {}
    const html = renderDesktopClientCaseReportHtml(report, {
      name: firm?.name || firm?.firm_name,
      phone: firm?.phone,
      address: firm?.address
    })
    return PDFService.printHtml(html, \`تقرير قضية للموكل - \${report.caseInfo?.caseNumber || caseId}\`)
  })
    return PDFService.printHtml(html, \`تقرير جلسة - \${report.caseInfo?.caseNumber || sessionId}\`)
  })`;

const fixedBlock = `  safeHandle('sessionOutcome:printClientReport', async (_, sessionId: string) => {
    requirePermission('view_sessions')
    const report = buildDesktopClientSessionReport(sessionId)
    const firm = (FirmRepository.get() as any) || {}
    const html = renderDesktopClientSessionReportHtml(report, {
      name: firm?.name || firm?.firm_name,
      phone: firm?.phone,
      address: firm?.address
    })
    return PDFService.printHtml(html, \`تقرير جلسة - \${report.caseInfo?.caseNumber || sessionId}\`)
  })

  // CLIENT CASE REPORT (التقرير الشامل للموكل)
  safeHandle('clientCaseReport:get', (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    return buildDesktopClientCaseReport(caseId)
  })

  safeHandle('clientCaseReport:update', (_, payload: {
    caseId: string
    clientSummary: string
    lawyerNoteAndNextStep: string
    internalNotes?: string
    clientId?: string
    showSubjectInReport?: boolean
    shortSubject?: string
    proceedings?: any
    casePosition?: any
    actionItems?: any
    metadataJson?: any
  }) => {
    requirePermission('edit_cases')
    try { requireCaseScope(payload.caseId, 'edit') } catch {}
    saveDesktopClientCaseReportEdits(payload.caseId, payload)
    return buildDesktopClientCaseReport(payload.caseId)
  })

  safeHandle('clientCaseReport:transition', (_, payload: {
    caseId: string
    toStatus: 'draft' | 'reviewed' | 'approved' | 'sent'
    sentVia?: string
  }) => {
    requirePermission('edit_cases')
    try { requireCaseScope(payload.caseId, 'edit') } catch {}
    const session = AuthService.getSession()
    transitionDesktopClientCaseReportStatus(payload.caseId, {
      toStatus: payload.toStatus,
      sentVia: payload.sentVia,
      userId: session?.userId,
      userName: session?.username
    })
    return buildDesktopClientCaseReport(payload.caseId)
  })

  safeHandle('clientCaseReport:getHtml', (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    const report = buildDesktopClientCaseReport(caseId)
    const firm = (FirmRepository.get() as any) || {}
    return renderDesktopClientCaseReportHtml(report, {
      name: firm?.name || firm?.firm_name,
      phone: firm?.phone,
      address: firm?.address
    })
  })

  safeHandle('clientCaseReport:print', async (_, caseId: string) => {
    requirePermission('view_cases')
    try { requireCaseScope(caseId, 'view') } catch {}
    const report = buildDesktopClientCaseReport(caseId)
    const firm = (FirmRepository.get() as any) || {}
    const html = renderDesktopClientCaseReportHtml(report, {
      name: firm?.name || firm?.firm_name,
      phone: firm?.phone,
      address: firm?.address
    })
    return PDFService.printHtml(html, \`تقرير قضية للموكل - \${report.caseInfo?.caseNumber || caseId}\`)
  })`;

// Normalize newlines for matching
const normalize = str => str.replace(/\r\n/g, '\n');
if (normalize(content).includes(normalize(targetBlock))) {
  // Use normalized replacement
  const normContent = normalize(content);
  const normTarget = normalize(targetBlock);
  const normFixed = normalize(fixedBlock);
  content = normContent.replace(normTarget, normFixed);
  fs.writeFileSync(handlersPath, content, 'utf8');
  console.log('✓ SUCCESS: Properly closed sessionOutcome:printClientReport and registered clientCaseReport handlers at top level.');
} else {
  console.error('✗ ERROR: Could not find exact target block in handlers.ts');
  process.exit(1);
}
