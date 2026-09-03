import { createHash, randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { pipeline } from 'stream/promises'
import { DecryptStream, EncryptStream, StreamDecryptSecret } from '../shared/streamingCrypto'

export interface CommandResult { stdout: string; stderr: string }
export type CommandRunner = (command: string, args: string[], options: { env: NodeJS.ProcessEnv }) => Promise<CommandResult>

export const spawnCommand: CommandRunner = (command, args, options) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env: options.env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''; let stderr = ''
  child.stdout.on('data', chunk => { stdout += String(chunk) }); child.stderr.on('data', chunk => { stderr += String(chunk) })
  child.once('error', reject)
  child.once('close', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command.toUpperCase()}_FAILED:${code}:${stderr.slice(0, 500)}`)))
})

interface DatabaseCommand {
  env: NodeJS.ProcessEnv
  connectionArgs: string[]
}

export interface DisasterRecoveryManifest {
  formatVersion: 1
  createdAt: string
  verifiedAt: string
  dump: { file: 'database.dump'; format: 'postgres-custom'; byteLength: number; sha256: string }
  attachments: Array<{ relativePath: string; byteLength: number; sha256: string }>
}

function databaseCommand(databaseUrl: string): DatabaseCommand {
  const url = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) throw new Error('DR_DATABASE_URL_INVALID')
  return {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    connectionArgs: ['--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username), '--dbname', decodeURIComponent(url.pathname.slice(1))]
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

async function backupAttachments(root: string, destinationRoot: string): Promise<DisasterRecoveryManifest['attachments']> {
  if (!fs.existsSync(root)) return []
  const realRoot = fs.realpathSync.native(root)
  const result: DisasterRecoveryManifest['attachments'] = []
  const visit = async (directory: string): Promise<void> => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error('DR_ATTACHMENT_SYMLINK_FORBIDDEN')
      if (entry.isDirectory()) await visit(candidate)
      else if (entry.isFile()) {
        const real = fs.realpathSync.native(candidate)
        const relativePath = path.relative(realRoot, real).replaceAll('\\', '/')
        if (!relativePath || relativePath.startsWith('../') || path.isAbsolute(relativePath)) throw new Error('DR_ATTACHMENT_PATH_ESCAPE')
        const destination = path.join(destinationRoot, ...relativePath.split('/'))
        fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 })
        fs.copyFileSync(real, destination, fs.constants.COPYFILE_EXCL)
        const sourceHash = await hashFile(real); const copiedHash = await hashFile(destination)
        if (sourceHash !== copiedHash) { fs.rmSync(destination, { force: true }); throw new Error('DR_ATTACHMENT_COPY_HASH_MISMATCH') }
        result.push({ relativePath, byteLength: fs.statSync(real).size, sha256: sourceHash })
      }
    }
  }
  await visit(realRoot)
  return result.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

export class PostgresDisasterRecovery {
  constructor(private readonly run: CommandRunner) {}

  async backup(input: { databaseUrl: string; outputDir: string; attachmentRoot: string }): Promise<DisasterRecoveryManifest> {
    const outputDir = path.resolve(input.outputDir)
    fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 })
    const temporaryDump = path.join(outputDir, `.database-${randomUUID()}.tmp`)
    const finalDump = path.join(outputDir, 'database.dump')
    if (fs.existsSync(finalDump)) throw new Error('DR_BACKUP_ALREADY_EXISTS')
    const command = databaseCommand(input.databaseUrl)
    try {
      await this.run('pg_dump', [...command.connectionArgs, '--format', 'custom', '--compress', '9', '--no-owner', '--file', temporaryDump], { env: command.env })
      if (!fs.existsSync(temporaryDump) || fs.statSync(temporaryDump).size < 1) throw new Error('DR_DUMP_EMPTY')
      await this.run('pg_restore', ['--list', temporaryDump], { env: command.env })
      const dumpHash = await hashFile(temporaryDump)
      fs.renameSync(temporaryDump, finalDump)
      const manifest: DisasterRecoveryManifest = {
        formatVersion: 1,
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        dump: { file: 'database.dump', format: 'postgres-custom', byteLength: fs.statSync(finalDump).size, sha256: dumpHash },
        attachments: await backupAttachments(input.attachmentRoot, path.join(outputDir, 'attachments'))
      }
      const temporaryManifest = path.join(outputDir, `.manifest-${randomUUID()}.tmp`)
      fs.writeFileSync(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
      fs.renameSync(temporaryManifest, path.join(outputDir, 'manifest.json'))
      return manifest
    } catch (error) {
      fs.rmSync(temporaryDump, { force: true })
      throw error
    }
  }

  async restore(input: { databaseUrl: string; backupDir: string; attachmentTargetRoot?: string }): Promise<void> {
    const command = databaseCommand(input.databaseUrl)
    const emptiness = await this.run('psql', [...command.connectionArgs, '--tuples-only', '--no-align', '--command', "SELECT COUNT(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')"], { env: command.env })
    if (Number(emptiness.stdout.trim()) !== 0) throw new Error('DR_TARGET_DATABASE_NOT_EMPTY')
    const backupDir = path.resolve(input.backupDir)
    const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8')) as DisasterRecoveryManifest
    const dumpPath = path.join(backupDir, manifest.dump.file)
    if (await hashFile(dumpPath) !== manifest.dump.sha256 || fs.statSync(dumpPath).size !== manifest.dump.byteLength) throw new Error('DR_DUMP_INTEGRITY_FAILED')
    const targetRoot = input.attachmentTargetRoot ? path.resolve(input.attachmentTargetRoot) : undefined
    if (targetRoot) {
      fs.mkdirSync(targetRoot, { recursive: true, mode: 0o700 })
      if (fs.readdirSync(targetRoot).length) throw new Error('DR_ATTACHMENT_TARGET_NOT_EMPTY')
    }
    await this.run('pg_restore', [...command.connectionArgs, '--exit-on-error', '--no-owner', dumpPath], { env: command.env })
    if (targetRoot) {
      for (const attachment of manifest.attachments) {
        const source = path.join(backupDir, 'attachments', ...attachment.relativePath.split('/'))
        if (await hashFile(source) !== attachment.sha256) throw new Error('DR_ATTACHMENT_BACKUP_INTEGRITY_FAILED')
        const destination = path.resolve(targetRoot, ...attachment.relativePath.split('/'))
        if (!destination.startsWith(`${targetRoot}${path.sep}`)) throw new Error('DR_ATTACHMENT_PATH_ESCAPE')
        fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 }); fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL)
        if (await hashFile(destination) !== attachment.sha256) throw new Error('DR_ATTACHMENT_RESTORE_HASH_MISMATCH')
      }
    }
  }
}

export interface RetentionPolicyOptions {
  keepLatest?: number
  maxAgeDays?: number
  daily?: number
  weekly?: number
  monthly?: number
}

export interface RetentionPolicyResult {
  retained: string[]
  deleted: string[]
}

export function applyRetentionPolicy(
  backupsRoot: string,
  options: RetentionPolicyOptions
): RetentionPolicyResult {
  const root = path.resolve(backupsRoot)
  if (!fs.existsSync(root)) return { retained: [], deleted: [] }
  const keepCount = Math.max(1, options.keepLatest || 1)
  const entries = fs.readdirSync(root, { withFileTypes: true })
  const validBackups: Array<{ dirName: string; fullPath: string; createdAt: number }> = []
  const unverified: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dirPath = path.join(root, entry.name)
    const manifestPath = path.join(dirPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) continue
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as DisasterRecoveryManifest
      const time = Date.parse(manifest.createdAt)
      const verified = Date.parse(manifest.verifiedAt)
      if (Number.isFinite(time) && Number.isFinite(verified) && verified >= time) {
        validBackups.push({ dirName: entry.name, fullPath: dirPath, createdAt: time })
      } else unverified.push(entry.name)
    } catch { unverified.push(entry.name) }
  }

  // Sort newest first
  validBackups.sort((a, b) => b.createdAt - a.createdAt)

  const retained: string[] = [...unverified]
  const deleted: string[] = []
  const now = Date.now()
  const maxAgeMs = options.maxAgeDays ? options.maxAgeDays * 24 * 60 * 60 * 1000 : Infinity

  const selected = new Set(validBackups.slice(0, keepCount).map((item) => item.dirName))
  const bucket = (limit: number, key: (date: Date) => string) => {
    if (limit <= 0) return
    const seen = new Set<string>()
    for (const backup of validBackups) {
      const value = key(new Date(backup.createdAt))
      if (seen.has(value)) continue
      seen.add(value); selected.add(backup.dirName)
      if (seen.size >= limit) break
    }
  }
  bucket(options.daily ?? 14, (date) => date.toISOString().slice(0, 10))
  bucket(options.weekly ?? 8, (date) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return `${d.getUTCFullYear()}-${Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)}`
  })
  bucket(options.monthly ?? 12, (date) => date.toISOString().slice(0, 7))

  for (let i = 0; i < validBackups.length; i++) {
    const backup = validBackups[i]
    if (selected.has(backup.dirName)) {
      retained.push(backup.dirName)
      continue
    }

    const age = now - backup.createdAt
    if (age > maxAgeMs || !options.maxAgeDays) {
      fs.rmSync(backup.fullPath, { recursive: true, force: true })
      deleted.push(backup.dirName)
    } else {
      retained.push(backup.dirName)
    }
  }

  return { retained, deleted }
}

export async function encryptDumpFile(
  sourceDumpPath: string,
  destinationEncryptedPath: string,
  secret: string | { recoveryPassphrase: string; automationKey: Buffer }
): Promise<{ sha256: string; byteLength: number }> {
  const encrypter = new EncryptStream(secret)
  const tempDest = `${destinationEncryptedPath}.${randomUUID()}.tmp`
  await pipeline(fs.createReadStream(sourceDumpPath), encrypter, fs.createWriteStream(tempDest, { flags: 'wx', mode: 0o600 }))
  fs.renameSync(tempDest, destinationEncryptedPath)
  const hash = await hashFile(destinationEncryptedPath)
  return { sha256: hash, byteLength: fs.statSync(destinationEncryptedPath).size }
}

export async function decryptDumpFile(
  encryptedDumpPath: string,
  destinationDecryptedPath: string,
  secret: StreamDecryptSecret
): Promise<void> {
  const decrypter = new DecryptStream(secret)
  const tempDest = `${destinationDecryptedPath}.${randomUUID()}.tmp`
  await pipeline(fs.createReadStream(encryptedDumpPath), decrypter, fs.createWriteStream(tempDest, { flags: 'wx', mode: 0o600 }))
  fs.renameSync(tempDest, destinationDecryptedPath)
}
