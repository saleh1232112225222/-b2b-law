# Antigravity IDE — Mandatory Security Remediation and Recovery Prompt

## Role and authority

You are the implementation agent. Codex is the independent supervisor and approval authority.

This is a high-risk legal-office data recovery system. The data includes privileged legal records, financial records, credentials, MFA secrets, documents, and tenant-isolated information. Treat confidentiality, tenant isolation, integrity, recoverability, and auditability as release-blocking requirements.

You must not reinterpret, shorten, bypass, or silently relax this prompt.

## Repositories and scope

- Web application: `G:\w2w`
- Windows desktop application: `G:\b2b`
- Existing progress report: `G:\w2w\SUPERVISOR_PROGRESS_REPORT.md`
- Current remediation target: the uncommitted backup/export/import implementation in `G:\w2w`
- `G:\b2b` is read-only until a later phase is explicitly approved.

Preserve all existing user work, database content, entity names, Arabic labels, routes, migrations, encryption behavior, themes, desktop/mobile layouts, light/dark modes, and unrelated changes.

## Absolute prohibitions

Until the supervisor explicitly approves the relevant phase, you MUST NOT:

1. Commit, push, deploy, publish, merge, or create a release.
2. Reset, clean, checkout, delete, overwrite, or discard any existing change.
3. run destructive database commands or use a production database.
4. modify migrations, production schemas, tenant data, encryption keys, secrets, or credentials.
5. modify `G:\b2b`.
6. mount or expose a new production API route.
7. claim that a test passed unless you executed it and recorded its exact command, exit code, and relevant output.
8. claim Web-to-Windows compatibility without a real round-trip test through both applications and their real adapters.
9. claim attachment coverage when real attachment bytes were not exported, verified, restored, and hash-checked.
10. claim disk-full, interruption, rollback, or recovery safety based only on code inspection or mocks.
11. use `SELECT *` for backup export.
12. construct SQL table names or column names from untrusted package content.
13. expose password hashes, session tokens, API keys, refresh tokens, OTP/MFA secrets, recovery codes, or encryption keys in exports, logs, reports, or test fixtures.
14. use last-write-wins updates for approved financial, audit, or append-only entities.

If any instruction conflicts with safety, data preservation, or tenant isolation, stop and report the conflict to the supervisor.

## Mandatory phase gate

Perform **PHASE R0 ONLY** in the current run.

After completing PHASE R0, stop completely and wait for the exact text:

`SUPERVISOR APPROVAL: BEGIN PHASE R1`

Approval for one phase is not approval for any later phase. At the end of every phase, stop and wait for the exact approval string naming the next phase.

Do not edit application logic, tests, configuration, or documentation during PHASE R0, including this prompt and the existing progress report.

---

# PHASE R0 — Forensic inventory and remediation design only

## R0.1 Preserve and identify the review baseline

Record without modifying anything:

- current branch and `HEAD` SHA;
- complete `git status --short` for both repositories;
- tracked and untracked files involved in the previous implementation;
- whether any relevant changes are staged;
- exact route-mounting state of `/api/tenant`;
- generated `.js`, `.d.ts`, and `.map` artifacts located beside TypeScript source files;
- byte-identical duplicated shared modules and how they became duplicated.

Do not stage or remove any file.

## R0.2 Reproduce and verify every supervisor finding

For each item below, provide exact file and line evidence, a minimal safe reproduction or data-flow proof, impact, severity, and proposed remediation. Do not fix it yet.

### Critical security findings

1. Cross-tenant overwrite through caller-controlled IDs combined with `ON CONFLICT (id) DO UPDATE`.
2. SQL injection or malformed SQL through package-controlled JSON keys used as SQL identifiers.
3. Whole-office export/import being available to any authenticated user without a dedicated backup/restore permission.
4. Export of authentication secrets caused by `SELECT *` and unenforced `sensitiveFields` metadata.
5. Tenant mismatch being treated as a warning instead of a hard rejection.
6. Root `companies` records being updateable without a tenant-safe ownership predicate.
7. Internal database or exception details being returned to the client.

### Recovery-integrity findings

8. No verified pre-restore safety backup.
9. No signed/expiring confirmation token binding preview to execution.
10. No isolated staging database/schema and no validation-before-live-write workflow.
11. Export silently replacing failed entity reads with empty arrays and still reporting success.
12. Real attachment bytes not being exported or restored; missing attachments being warnings only.
13. `append_only`, immutable, financial, and audit policies being declared but ignored by import execution.
14. Merge/upsert behavior being presented as complete restore despite not reconciling deletions or absence.
15. No post-restore verification of counts, hashes, foreign keys, financial invariants, or attachment hashes.
16. Legacy JSON import accepting insufficiently validated objects.

### Contract and architecture findings

17. Registry count and coverage claims not matching the actual PostgreSQL and SQLite schemas.
18. Missing entities, including at minimum `documents`, `finances_new`, `user_case_access`, and `user_client_access`, subject to verification against both real schemas.
19. Registry lacking explicit allowed fields, required/nullable fields, immutable fields, sensitive fields, stable-ID policy, conflict policy, ownership policy, and platform adapters.
20. Numeric sorting being described as topological dependency resolution.
21. Entire records and base64 attachments being buffered in memory rather than streamed with enforceable limits.
22. Manifest missing required schema/contract hashes, canonical record hashes, attachment sizes/hashes, backup lineage/type, signing metadata, and complete KDF/key-slot metadata.
23. Encryption envelope accepting incomplete key-slot conditions or relying on constants not fully represented and validated in metadata.
24. Shared source files being copied between projects without a canonical source or automated equivalence check.
25. Source directories being polluted by generated compilation artifacts.

### Test and report-integrity findings

26. Tests using in-memory mock entities instead of real temporary PostgreSQL and SQLite databases.
27. No API authorization, malicious-package, tenant-collision, interruption, disk-full, large-file, and attachment round-trip tests.
28. Web-to-Windows and new-machine recovery claims not invoking the Windows application or its actual SQLite adapter.
29. Google Sheets synchronization removal claim being false or incomplete: distinguish removed UI instructions from remaining callable synchronization code.
30. Any statement in `SUPERVISOR_PROGRESS_REPORT.md` that is unsupported, overstated, or contradicted by the code or executed evidence.

## R0.3 Build authoritative schema inventories

Create read-only inventories in the report, not in source files:

- PostgreSQL tables, primary keys, unique constraints, foreign keys, tenant ownership columns, and sensitive columns.
- SQLite tables, primary keys, unique constraints, foreign keys, tenant ownership behavior, and sensitive columns.
- mapping table: PostgreSQL entity ↔ canonical contract entity ↔ SQLite entity.
- explicit list of entities present on only one platform.
- explicit list of attachments and their storage locations.
- explicit list of financial/audit entities and their immutability rules.

The inventory must come from actual schema definitions or safe schema introspection. Do not infer full coverage from registry length.

## R0.4 Produce the remediation design

Design, but do not implement, a corrected architecture containing:

1. A single canonical versioned entity contract.
2. Explicit export projections with no `SELECT *`.
3. Per-entity allowed-field and required-field validation.
4. Tenant-safe query templates with no package-controlled SQL identifiers.
5. Dedicated backup and restore RBAC permissions with step-up authentication.
6. Hard tenant/package binding and source-tenant verification.
7. Streaming records and attachments with total/per-entry limits and zip-bomb protections.
8. Canonical deterministic hashing independent of database row order or object-key order.
9. Authenticated encryption and a versioned key-slot/KDF format without exporting secrets.
10. A mandatory verified pre-restore backup stored independently.
11. Preview → signed expiring confirmation token → staging → validation → transactional activation.
12. Safe handling for append-only financial/audit entities without overwrite semantics.
13. Post-restore integrity verification and an append-only audit record.
14. Idempotent retry and interruption recovery.
15. A legacy JSON compatibility path that is isolated, validated, and never silently treated as a modern verified package.
16. A real cross-platform adapter strategy for `G:\w2w` and `G:\b2b`.
17. A rollback strategy for the current uncommitted implementation without destroying unrelated user changes.

Include a threat model covering malicious authenticated users, compromised tenant packages, cross-tenant UUID collisions, stolen backup files, compromised hosting, interrupted writes, disk exhaustion, attachment tampering, schema drift, and operator mistakes.

## R0.5 Define executable acceptance tests

Provide a test matrix that later phases must implement. Every row must specify environment, fixture, operation, expected result, and evidence artifact.

At minimum include:

- Web PostgreSQL export → clean Windows SQLite restore.
- Windows SQLite export → clean Web PostgreSQL restore.
- same-platform round trips.
- one-tenant export proving zero rows from other tenants.
- malicious foreign-tenant IDs proving zero cross-tenant writes.
- malicious unknown tables, columns, and JSON keys rejected before SQL execution.
- password/MFA/token fields absent from export.
- complete attachment byte/hash round trip.
- missing/corrupt attachment causes failure.
- tampered manifest/ciphertext/tag/hash/signature causes failure.
- incorrect passphrase causes failure without data mutation.
- schema mismatch and unsupported version produce actionable errors.
- approved financial/audit records cannot be overwritten.
- interruption at every restore stage remains recoverable.
- disk-full simulation produces no false success and no live-data corruption.
- large-data streaming stays within a stated memory bound.
- pre-restore backup is independently restorable.
- post-restore counts, foreign keys, hashes, and financial invariants match.
- retry is idempotent.
- mobile/desktop, light/dark UI checks only after backend security is approved.

Mocks may supplement these tests but cannot be the sole recovery proof.

## R0.6 Required PHASE R0 deliverable

Create exactly one new report:

`G:\w2w\ANTIGRAVITY_REMEDIATION_R0_REPORT.md`

The report must contain:

1. baseline and dirty-worktree inventory;
2. finding-by-finding verification table for all 30 findings;
3. actual dual-schema inventory and mapping;
4. threat model;
5. corrected architecture and data flows;
6. proposed file-by-file change plan for later phases;
7. migration impact assessment explicitly stating whether migrations are required;
8. test matrix;
9. risks, unresolved questions, and decisions requiring supervisor approval;
10. exact commands executed, exit codes, and summarized output;
11. a statement confirming no application code, tests, schemas, or configuration were changed;
12. a final `git status --short` for both repositories.

If the only change is the required R0 report, state that explicitly.

End the report and your response with exactly:

`PHASE R0 COMPLETE — STOPPED FOR CODEX SUPERVISOR REVIEW. NO IMPLEMENTATION AUTHORIZED.`

Then stop. Do not begin PHASE R1.

---

# Later phases — planning reference only, not authorized

The following phases are not authorized by this prompt. They exist only so the remediation sequence is unambiguous.

## PHASE R1 — Containment and security foundation

- Keep unsafe routes unmounted or behind a disabled server-side feature flag.
- Add explicit RBAC and step-up authorization.
- Replace dynamic identifiers with registry-owned allowlisted SQL templates.
- Enforce tenant-safe ownership predicates and hard tenant mismatch rejection.
- Exclude all secrets using explicit export projections.
- Add request/package/record/attachment limits and sanitized errors.
- Add adversarial unit and API tests for the critical security findings.
- Stop for approval.

## PHASE R2 — Canonical contract and complete registry

- Establish one canonical source and generated/verified platform bindings.
- Cover every required PostgreSQL and SQLite entity and attachment.
- Encode field, ownership, sensitivity, dependency, immutable, and conflict policies.
- Add automated schema-to-registry drift checks.
- Remove generated artifacts from source safely without touching unrelated files.
- Stop for approval.

## PHASE R3 — Streaming export and cryptographic package

- Implement bounded streaming, canonical hashing, manifest completeness, authenticated encryption, key slots, and package signing/authentication as approved.
- Fail closed on any mandatory entity or attachment error.
- Add large-data, tamper, secret-exclusion, and memory-bound tests.
- Stop for approval.

## PHASE R4 — Staged restore and financial integrity

- Implement preview, signed confirmation, independent pre-restore backup, staging, validation, safe activation, post-verification, audit, retry, and rollback.
- Enforce append-only and immutable policies.
- Add real temporary PostgreSQL integration tests and failure injection.
- Stop for approval.

## PHASE R5 — Windows adapter and real cross-platform proof

- Modify `G:\b2b` only after explicit approval.
- Implement the approved SQLite adapter without changing unrelated desktop behavior.
- Run real Web ↔ Windows round trips with attachments, financial invariants, and clean-machine recovery.
- Stop for approval.

## PHASE R6 — UI and operational hardening

- Integrate only approved flows into the existing design system.
- Verify desktop/mobile and light/dark modes.
- Add accessible progress, cancellation boundaries, error recovery, and Arabic copy.
- Do not remove Google synchronization or unrelated functionality without a separate explicit decision.
- Stop for approval.

## PHASE R7 — Release readiness

- Run complete lint, TypeScript, unit, integration, migration, build, security, restore-drill, and visual test suites.
- Produce evidence with exact commands and exit codes.
- Perform an independent clean-machine restore drill.
- No commit, push, deployment, or production enablement without final written approval.

## Evidence standard for every later phase

Every phase report must separate:

- implemented and directly verified;
- implemented but not yet integration-tested;
- designed only;
- blocked;
- not attempted.

Never use terms such as “complete,” “secure,” “guaranteed,” “fully covered,” or “production-ready” unless the stated acceptance tests were actually executed and their evidence is included.
