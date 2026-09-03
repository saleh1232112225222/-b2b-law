/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/explicit-function-return-type */
/**
 * Contract Freshness & Hash Equivalence Checker
 * Fails with exit code 1 if canonical contracts or synchronized copies are stale.
 * Checks all currently shared recovery modules across the R2-R4 implementation.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const rootDir = path.resolve(__dirname, '..')
const sharedSrc = path.join(rootDir, 'src/shared')
const cloudShared = path.join(rootDir, 'cloud-server/src/shared')
const desktopShared = path.resolve(rootDir, '../b2b/src/shared/recovery')

const sharedRecoveryFiles = [
  'canonicalContract.ts',
  'b2btenant.ts',
  'encryption.ts',
  'streamingCrypto.ts',
  'attachmentEngine.ts',
  'recoveryArchive.ts',
  'restoreProtocol.ts'
]

function sha256(filePath) {
  if (!fs.existsSync(filePath)) return null
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

let hasError = false

for (const file of sharedRecoveryFiles) {
  const srcHash = sha256(path.join(sharedSrc, file))
  const cloudHash = sha256(path.join(cloudShared, file))
  const desktopHash = sha256(path.join(desktopShared, file))

  if (!srcHash) {
    console.error(`[check-contracts] ❌ Source file missing: src/shared/${file}`)
    hasError = true
  } else if (!cloudHash) {
    console.error(`[check-contracts] ❌ Synced file missing: cloud-server/src/shared/${file}`)
    hasError = true
  } else if (srcHash !== cloudHash) {
    console.error(
      `[check-contracts] ❌ Hash mismatch for ${file}: src (${srcHash.slice(0, 8)}) !== cloud (${cloudHash.slice(0, 8)})`
    )
    hasError = true
  } else if (!desktopHash) {
    console.error(`[check-contracts] ❌ Windows copy missing: ../b2b/src/shared/recovery/${file}`)
    hasError = true
  } else if (srcHash !== desktopHash) {
    console.error(
      `[check-contracts] ❌ Hash mismatch for ${file}: src (${srcHash.slice(0, 8)}) !== Windows (${desktopHash.slice(0, 8)})`
    )
    hasError = true
  } else {
    console.log(`[check-contracts] ✅ ${file} verified matching (${srcHash.slice(0, 12)}...)`)
  }
}

if (hasError) {
  console.error(
    '[check-contracts] FAILED: Synchronized contracts are stale. Run "npm run contracts:sync".'
  )
  process.exit(1)
} else {
  console.log('[check-contracts] SUCCESS: All shared contracts are verified and up to date.')
  process.exit(0)
}
