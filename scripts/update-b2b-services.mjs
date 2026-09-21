import fs from 'fs'
import path from 'path'

const b2bReportServicePath = 'G:/b2b/src/main/services/ReportService.ts'
let reportServiceContent = fs.readFileSync(b2bReportServicePath, 'utf8')

if (!reportServiceContent.includes("from './CaseDossierService'")) {
  reportServiceContent = `import { buildDesktopCaseDossier } from './CaseDossierService'\n` + reportServiceContent
}

if (!reportServiceContent.includes('dossier: buildDesktopCaseDossier(caseId)')) {
  reportServiceContent = reportServiceContent.replace(
    'return {\n      case: caseRow,',
    'const dossier = buildDesktopCaseDossier(caseId)\n    return {\n      dossier,\n      case: caseRow,'
  )
}

fs.writeFileSync(b2bReportServicePath, reportServiceContent, 'utf8')
console.log('ReportService.ts updated successfully')

const b2bPdfServicePath = 'G:/b2b/src/main/services/PDFService.ts'
let pdfServiceContent = fs.readFileSync(b2bPdfServicePath, 'utf8')

if (!pdfServiceContent.includes("from './CaseDossierService'")) {
  pdfServiceContent = `import { buildDesktopCaseDossier, renderDesktopMasterCaseDossierHtml } from './CaseDossierService'\n` + pdfServiceContent
}

const oldRenderCaseA4Regex = /renderCaseA4Report\s*\([\s\S]*?renderCaseReport/
const newRenderCaseA4 = `renderCaseA4Report(data: any, firm: any, preparedBy: string): string {
    const dossier = data?.dossier || buildDesktopCaseDossier(data?.case?.id || data?.caseId || data?.id)
    return renderDesktopMasterCaseDossierHtml(dossier, firm, preparedBy)
  },

  renderCaseReport`

if (oldRenderCaseA4Regex.test(pdfServiceContent)) {
  pdfServiceContent = pdfServiceContent.replace(oldRenderCaseA4Regex, newRenderCaseA4)
  console.log('renderCaseA4Report replaced successfully')
}

// Also update renderCaseReport to use the new dossier HTML
const oldRenderCaseReportRegex = /renderCaseReport\s*\([\s\S]*?renderSessionsReport/
const newRenderCaseReport = `renderCaseReport(data: any): string {
    const dossier = data?.dossier || buildDesktopCaseDossier(data?.case?.id || data?.caseId || data?.id)
    return renderDesktopMasterCaseDossierHtml(dossier, null, 'المحامي المسؤول')
  },

  renderSessionsReport`

if (oldRenderCaseReportRegex.test(pdfServiceContent)) {
  pdfServiceContent = pdfServiceContent.replace(oldRenderCaseReportRegex, newRenderCaseReport)
  console.log('renderCaseReport replaced successfully')
}

fs.writeFileSync(b2bPdfServicePath, pdfServiceContent, 'utf8')
console.log('PDFService.ts updated successfully')
