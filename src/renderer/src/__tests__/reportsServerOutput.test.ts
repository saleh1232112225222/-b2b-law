import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }))

vi.mock('../../../../cloud-server/src/db/connection', () => ({
  query: queryMock
}))

vi.mock('../../../../cloud-server/src/middleware/auth', () => ({
  authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next()
}))

vi.mock('../../../../cloud-server/src/middleware/permission', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next()
}))

vi.mock('../../../../cloud-server/src/middleware/tenant', () => ({
  getCompanyId: () => 'company-1'
}))

import { generateReportHtmlString } from '../../../../cloud-server/src/routes/reports'

describe('report output filtering', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('prints only the selected case for a comprehensive case report', async () => {
    queryMock.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM cases')) {
        return {
          rows: [
            {
              id: 'case-selected',
              case_number: '144855473',
              client_name: 'الموكل المحدد',
              court: 'المحكمة المحددة',
              status: 'قيد النظر',
              subject: 'موضوع القضية المحددة'
            },
            {
              id: 'case-other',
              case_number: '48888888',
              client_name: 'موكل قضية أخرى',
              court: 'محكمة أخرى',
              status: 'قيد النظر',
              subject: 'يجب ألا تظهر هذه القضية'
            }
          ].filter((row) => !sql.includes('c.id =') || row.id === params[1])
        }
      }
      return { rows: [] }
    })

    const html = await generateReportHtmlString(
      'company-1',
      'case-a4',
      { caseId: 'case-selected' },
      false
    )

    expect(html).toContain('تقرير قضية شامل')
    expect(html).toContain('144855473')
    expect(html).toContain('موضوع القضية المحددة')
    expect(html).not.toContain('48888888')
    expect(html).not.toContain('يجب ألا تظهر هذه القضية')
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('c.id = $2'), [
      'company-1',
      'case-selected'
    ])
  })

  it.each([
    {
      type: 'financial',
      params: { caseId: 'case-1', from: '2026-01-01', to: '2026-12-31', type: 'income' },
      sqlParts: ['f.case_id = $2', 'f.date >= $3', 'f.date <= $4', 'f.type = $5'],
      values: ['company-1', 'case-1', '2026-01-01', '2026-12-31', 'income']
    },
    {
      type: 'sessions',
      params: { caseId: 'case-1', from: '2026-01-01', to: '2026-12-31', q: 'جلسة' },
      sqlParts: ['s.case_id = $2', 's.date >= $3', 's.date <= $4', 'ILIKE $5'],
      values: ['company-1', 'case-1', '2026-01-01', '2026-12-31', '%جلسة%']
    },
    {
      type: 'evidence',
      params: { caseId: 'case-1', from: '2026-01-01', to: '2026-12-31' },
      sqlParts: ['e.case_id = $2', 'e.evidence_date >= $3', 'e.evidence_date <= $4'],
      values: ['company-1', 'case-1', '2026-01-01', '2026-12-31']
    },
    {
      type: 'documents',
      params: { linkType: 'case', parentId: 'case-1', from: '2026-01-01', to: '2026-12-31' },
      sqlParts: ['d.link_type = $2', 'd.case_id = $3', 'd.created_at >= $4', 'd.created_at <= $5'],
      values: ['company-1', 'case', 'case-1', '2026-01-01', '2026-12-31']
    },
    {
      type: 'activity',
      params: { from: '2026-01-01', to: '2026-12-31', actor: 'admin' },
      sqlParts: ['timestamp >= $2', 'timestamp <= $3', 'actor = $4'],
      values: ['company-1', '2026-01-01', '2026-12-31', 'admin']
    },
    {
      type: 'memoranda_list',
      params: { caseId: 'case-1', from: '2026-01-01', to: '2026-12-31', q: 'جوابية' },
      sqlParts: ['m.case_id = $2', '>= $3', '<= $4', 'ILIKE $5'],
      values: ['company-1', 'case-1', '2026-01-01', '2026-12-31', '%جوابية%']
    }
  ])(
    'keeps $type report filters in print/export queries',
    async ({ type, params, sqlParts, values }) => {
      queryMock.mockResolvedValue({ rows: [] })

      await generateReportHtmlString('company-1', type, params, false)

      expect(queryMock).toHaveBeenCalledTimes(1)
      const [sql, actualValues] = queryMock.mock.calls[0]
      for (const part of sqlParts) expect(sql).toContain(part)
      expect(actualValues).toEqual(values)
    }
  )

  it('does not silently replace an unknown report with all cases', async () => {
    queryMock.mockResolvedValue({ rows: [{ case_number: 'must-not-leak' }] })

    const html = await generateReportHtmlString('company-1', 'unknown-report', {}, false)

    expect(html).toContain('تعذر إنشاء التقرير المطلوب')
    expect(html).not.toContain('must-not-leak')
    expect(queryMock).not.toHaveBeenCalled()
  })
})
