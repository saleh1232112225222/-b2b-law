import fs from 'fs'

const b2bPdfServicePath = 'G:/b2b/src/main/services/PDFService.ts'
let pdfServiceContent = fs.readFileSync(b2bPdfServicePath, 'utf8')

// 1. Add import if not present
if (!pdfServiceContent.includes("from './CaseDossierService'")) {
  pdfServiceContent = `import { buildDesktopCaseDossier, renderDesktopMasterCaseDossierHtml } from './CaseDossierService'\n` + pdfServiceContent
}

// 2. Locate renderCaseA4Report start and end
const startIndex = pdfServiceContent.indexOf('  renderCaseA4Report(data: any, firm: any, preparedBy: string): string {')
const endIndex = pdfServiceContent.indexOf('  renderCaseReport(data: any): string {')

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `  renderCaseA4Report(data: any, firm: any, preparedBy: string): string {
    const dossier = data?.dossier || buildDesktopCaseDossier(data?.case?.id || data?.caseId || data?.id)
    return renderDesktopMasterCaseDossierHtml(dossier, firm, preparedBy)
  },\n\n`
  pdfServiceContent = pdfServiceContent.slice(0, startIndex) + replacement + pdfServiceContent.slice(endIndex)
  console.log('Successfully replaced renderCaseA4Report body')
} else {
  console.error('Could not find renderCaseA4Report method bounds', { startIndex, endIndex })
}

fs.writeFileSync(b2bPdfServicePath, pdfServiceContent, 'utf8')
console.log('Saved PDFService.ts')
