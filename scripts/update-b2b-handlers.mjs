import fs from 'fs'

let code = fs.readFileSync('g:/b2b/src/main/ipc/handlers.ts', 'utf8')

// If unused import is there, clean it first
code = code.replace(/import\s*\{\s*buildDesktopClientSessionReport[\s\S]*?\}\s*from\s*'[^']+'\s*;?\r?\n?/, '')

const importStmt = `import {
  buildDesktopClientSessionReport,
  saveDesktopClientSessionReportEdits,
  transitionDesktopReportStatus,
  renderDesktopClientSessionReportHtml
} from '../services/ClientSessionReportService'\n`

code = importStmt + code

const marker = "safeHandle('sessionOutcome:getBySession'"
const idx = code.indexOf(marker)
if (idx !== -1) {
  // Find the end of this handler block: `return SessionOutcomeRepository.getBySessionId(sessionId)` followed by `})`
  const endBlock = code.indexOf('})', idx)
  if (endBlock !== -1) {
    const insertPos = endBlock + 2
    const addition = `\n\n  safeHandle('sessionOutcome:getClientReport', (_, sessionId: string) => {
    requirePermission('view_sessions')
    const s = getDb().prepare('SELECT case_id FROM sessions WHERE id = ?').get(sessionId) as any
    if (s?.case_id) requireCaseScope(s.case_id, 'view')
    return buildDesktopClientSessionReport(sessionId)
  })

  safeHandle('sessionOutcome:updateClientReport', (_, payload: {
    sessionId: string
    clientSummary: string
    lawyerNoteAndNextStep: string
    internalNotes?: string
    caseId?: string
    clientId?: string
  }) => {
    requirePermission('edit_sessions')
    if (payload?.caseId) requireCaseScope(payload.caseId, 'edit')
    saveDesktopClientSessionReportEdits(payload.sessionId, payload)
    return buildDesktopClientSessionReport(payload.sessionId)
  })

  safeHandle('sessionOutcome:transitionClientReport', (_, payload: {
    sessionId: string
    toStatus: 'draft' | 'reviewed' | 'approved' | 'sent'
    sentVia?: string
  }) => {
    requirePermission('edit_sessions')
    const session = AuthService.getSession()
    transitionDesktopReportStatus(payload.sessionId, {
      toStatus: payload.toStatus,
      sentVia: payload.sentVia,
      userId: session?.userId,
      userName: session?.username
    })
    return buildDesktopClientSessionReport(payload.sessionId)
  })

  safeHandle('sessionOutcome:getClientReportHtml', (_, sessionId: string) => {
    requirePermission('view_sessions')
    const report = buildDesktopClientSessionReport(sessionId)
    const firm = FirmRepository.get() as any
    return renderDesktopClientSessionReportHtml(report, {
      name: firm?.name || firm?.firm_name,
      phone: firm?.phone,
      address: firm?.address
    })
  })`

    code = code.slice(0, insertPos) + addition + code.slice(insertPos)
    fs.writeFileSync('g:/b2b/src/main/ipc/handlers.ts', code, 'utf8')
    console.log('✅ Handlers successfully updated with ClientSessionReport IPC channels')
  }
} else {
  console.log('Could not find marker')
}
