import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const desktop = path.resolve(root, '..', 'b2b')
const node = process.execPath
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('NPM_EXEC_PATH_NOT_AVAILABLE')
const postgresUrl = process.env.TEST_POSTGRES_URL || 'postgresql://b2btest:b2btest_r7_only@127.0.0.1:55432/b2b_r7_native'

function run(label, command, args, cwd, env = {}) {
  console.log(`\n[R7] ${label}`)
  const result = spawnSync(command, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit', shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}`)
}

const npmArgs = (...args) => [npmCli, ...args]
run('Cross-platform contract equality', node, npmArgs('run', 'contracts:check'), root)
run('Web typecheck', node, npmArgs('run', 'typecheck'), root)
run('Web lint', node, npmArgs('run', 'lint', '--', '--quiet'), root)
run('Web tests', node, npmArgs('test'), root)
run('Cloud build', node, npmArgs('run', 'build'), path.join(root, 'cloud-server'))
run('Cloud lint', node, npmArgs('run', 'lint', '--', '--quiet'), path.join(root, 'cloud-server'))
run('Cloud tests', node, npmArgs('test'), path.join(root, 'cloud-server'))
run('Native PostgreSQL restore', node, npmArgs('exec', '--', 'vitest', 'run', '--config', 'vitest.config.ts', 'src/__tests__/postgresRestoreAdapter.native.test.ts'), path.join(root, 'cloud-server'), { TEST_POSTGRES_URL: postgresUrl })
run('Windows typecheck', node, npmArgs('run', 'typecheck'), desktop)
run('Windows lint', node, npmArgs('run', 'lint', '--', '--quiet'), desktop)
run('Windows tests', node, npmArgs('test'), desktop)
run('Windows build', node, npmArgs('run', 'build'), desktop)

console.log('\n[R7] PASS — all mandatory release gates completed successfully.')
