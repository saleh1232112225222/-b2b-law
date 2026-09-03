/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Deterministic Cross-Project Shared Module Synchronizer
 * Copies the canonical recovery modules to cloud-server only when content has changed.
 * The src/shared copy is authoritative; cloud-server/src/shared is a verified binding.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const rootDir = path.resolve(__dirname, '..')
const rootSharedDir = path.join(rootDir, 'src/shared')
const cloudSharedDir = path.join(rootDir, 'cloud-server/src/shared')
const desktopSharedDir = path.resolve(rootDir, '../b2b/src/shared/recovery')

if (!fs.existsSync(cloudSharedDir)) {
  fs.mkdirSync(cloudSharedDir, { recursive: true })
}
if (!fs.existsSync(desktopSharedDir)) fs.mkdirSync(desktopSharedDir, { recursive: true })

// Canonical recovery modules shared by the renderer and cloud server.
const sharedRecoveryFiles = [
  'canonicalContract.ts',
  'b2btenant.ts',
  'encryption.ts',
  'streamingCrypto.ts',
  'attachmentEngine.ts',
  'recoveryArchive.ts',
  'restoreProtocol.ts'
]

for (const file of sharedRecoveryFiles) {
  const srcPath = path.join(rootSharedDir, file)
  if (fs.existsSync(srcPath)) {
    const srcContent = fs.readFileSync(srcPath, 'utf8')
    const srcHash = crypto.createHash('sha256').update(srcContent, 'utf8').digest('hex')
    for (const [target, directory] of [['cloud', cloudSharedDir], ['desktop', desktopSharedDir]]) {
      const dstPath = path.join(directory, file)
      if (fs.existsSync(dstPath)) {
        const dstContent = fs.readFileSync(dstPath, 'utf8')
        const dstHash = crypto.createHash('sha256').update(dstContent, 'utf8').digest('hex')
        if (srcHash === dstHash) {
          console.log(`[sync-shared] Unchanged ${target}/${file} (SHA256: ${srcHash.slice(0, 12)}...)`)
          continue
        }
      }
      fs.writeFileSync(dstPath, srcContent, 'utf8')
      console.log(`[sync-shared] Synced ${target}/${file} (SHA256: ${srcHash.slice(0, 12)}...)`)
    }
  }
}
