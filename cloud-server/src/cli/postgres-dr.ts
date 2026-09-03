import { createHash, randomUUID } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PostgresDisasterRecovery, spawnCommand } from '../recovery/postgresDisasterRecovery'
import { createEncryptedDrBundle, extractEncryptedDrBundle } from '../recovery/drBundle'
import { createIndependentBackupStorage } from '../recovery/independentStorage'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function encryptionSecrets(): { recoveryPassphrase: string; automationKey: Buffer } {
  const recoveryPassphrase = process.env.DR_RECOVERY_PASSPHRASE || ''
  const automationKey = Buffer.from(process.env.DR_AUTOMATION_KEY_BASE64 || '', 'base64')
  if (recoveryPassphrase.normalize('NFKC').length < 20 || automationKey.length !== 32) throw new Error('DR_ENCRYPTION_SECRETS_REQUIRED')
  return { recoveryPassphrase, automationKey }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

async function main(): Promise<void> {
  const action = process.argv[2]
  const dr = new PostgresDisasterRecovery(spawnCommand)
  if (action === 'backup') {
    const databaseUrl = process.env.DATABASE_URL
    const outputDir = argument('--output')
    const attachmentRoot = argument('--attachments')
    if (!databaseUrl || !outputDir || !attachmentRoot) throw new Error('Usage: postgres-dr backup --output <catalog-directory> --attachments <storage-root>; DATABASE_URL is required')
    const destinationRoot = path.resolve(outputDir); fs.mkdirSync(destinationRoot, { recursive: true, mode: 0o700 })
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-dr-plain-'))
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const artifact = path.join(destinationRoot, `b2b-dr-${stamp}.b2bdr`)
    try {
      const manifest = await dr.backup({ databaseUrl, outputDir: plain, attachmentRoot: path.resolve(attachmentRoot) })
      const encrypted = await createEncryptedDrBundle(plain, artifact, encryptionSecrets())
      const storage = createIndependentBackupStorage()
      const stored = await storage.putVerified(artifact, path.basename(artifact), encrypted.sha256)
      const downloaded = path.join(os.tmpdir(), `b2b-dr-verify-${randomUUID()}.b2bdr`)
      const extracted = path.join(os.tmpdir(), `b2b-dr-verify-${randomUUID()}`)
      try {
        await storage.download(stored.id, downloaded)
        if (await sha256File(downloaded) !== encrypted.sha256) throw new Error('DR_INDEPENDENT_DOWNLOAD_HASH_MISMATCH')
        await extractEncryptedDrBundle(downloaded, extracted, { automationKey: encryptionSecrets().automationKey })
      } finally {
        fs.rmSync(downloaded, { force: true }); fs.rmSync(extracted, { recursive: true, force: true })
      }
      fs.appendFileSync(path.join(destinationRoot, 'verified-catalog.jsonl'), `${JSON.stringify({ createdAt: manifest.createdAt, artifact: path.basename(artifact), sha256: encrypted.sha256, byteLength: encrypted.byteLength, independentObjectId: stored.id, independentLocation: stored.location, verifiedAt: new Date().toISOString() })}\n`, { encoding: 'utf8', mode: 0o600 })
      process.stdout.write(`Verified encrypted independent PostgreSQL DR artifact created: ${encrypted.sha256}\n`)
    } catch (error) {
      fs.rmSync(artifact, { force: true })
      throw error
    } finally {
      fs.rmSync(plain, { recursive: true, force: true })
    }
    return
  }
  if (action === 'restore') {
    const databaseUrl = process.env.DR_TARGET_DATABASE_URL
    const backupDir = argument('--backup')
    const encryptedBundle = argument('--bundle')
    if (!process.argv.includes('--confirm-empty-target')) throw new Error('DR_RESTORE_CONFIRMATION_REQUIRED')
    if (!databaseUrl || (!backupDir && !encryptedBundle)) throw new Error('Usage: postgres-dr restore (--backup <legacy-directory>|--bundle <encrypted.b2bdr>) --confirm-empty-target; DR_TARGET_DATABASE_URL is required')
    let extracted: string | undefined
    try {
      if (encryptedBundle) {
        extracted = path.join(os.tmpdir(), `b2b-dr-restore-${randomUUID()}`)
        await extractEncryptedDrBundle(path.resolve(encryptedBundle), extracted, encryptionSecrets())
      }
      await dr.restore({ databaseUrl, backupDir: extracted || path.resolve(backupDir!), attachmentTargetRoot: argument('--attachment-target') })
    } finally {
      if (extracted) fs.rmSync(extracted, { recursive: true, force: true })
    }
    process.stdout.write('PostgreSQL restore completed into verified empty target.\n')
    return
  }
  throw new Error('Usage: postgres-dr <backup|restore>')
}

main().catch(error => { process.stderr.write(`${(error as Error).message}\n`); process.exitCode = 1 })
