import { describe, it, expect } from 'vitest'
import {
  CANONICAL_ENTITY_REGISTRY,
  getTopologicallySortedEntities,
  getExportableTenantEntities
} from '../../../shared/entityRegistry'

describe('Canonical Entity Registry & Schema Coverage (Phase 2)', () => {
  it('covers all registered business entities', () => {
    const entities = Object.keys(CANONICAL_ENTITY_REGISTRY)
    expect(entities.length).toBeGreaterThanOrEqual(65)
  })

  it('verifies every registered entity has a primaryKey and valid dependencyOrder', () => {
    for (const [name, entity] of Object.entries(CANONICAL_ENTITY_REGISTRY)) {
      expect(entity.canonicalName).toBe(name)
      expect(entity.primaryKey).toBeTruthy()
      expect(entity.dependencyOrder).toBeGreaterThan(0)
      expect(Array.isArray(entity.dependsOn)).toBe(true)
    }
  })

  it('guarantees topological sorting without dependency cycles', () => {
    const sorted = getTopologicallySortedEntities()
    const visited = new Set<string>()

    for (const entity of sorted) {
      for (const dep of entity.dependsOn) {
        if (CANONICAL_ENTITY_REGISTRY[dep]) {
          expect(visited.has(dep)).toBe(true)
        }
      }
      visited.add(entity.canonicalName)
    }
  })

  it('enforces tenant isolation key on all office business entities', () => {
    const tenantEntities = getExportableTenantEntities()
    for (const entity of tenantEntities) {
      if (entity.canonicalName !== 'companies') {
        expect(entity.hasCompanyId).toBe(true)
        expect(entity.tenantKey).toBe('company_id')
      }
    }
  })

  it('marks financial and audit entities with append-only import policy', () => {
    const financial = Object.values(CANONICAL_ENTITY_REGISTRY).filter(e => e.isFinancial && e.isImmutableAudit)
    for (const entity of financial) {
      expect(entity.importPolicy).toBe('append_only')
    }
  })
})
