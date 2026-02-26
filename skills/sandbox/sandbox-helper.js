import { Sandbox } from '@e2b/code-interpreter'
import * as fs from 'fs'
import * as path from 'path'

// ─── Environment ───
const E2B_API_KEY = process.env.E2B_API_KEY
const MAX_HOOKS_DIR = process.env.MAX_HOOKS_DIR
const SESSION_ID = process.env.SESSION_ID || process.env.MAX_SESSION_ID

if (!MAX_HOOKS_DIR) {
  console.error('[E2B] Error: MAX_HOOKS_DIR environment variable not set')
  process.exit(1)
}

if (!SESSION_ID) {
  console.error('[E2B] Error: SESSION_ID environment variable not set')
  process.exit(1)
}

// ─── JSONL Utilities ───

function generateId() {
  return `${Date.now()}${Math.random().toString(36).slice(2, 10)}`
}

/** Get JSONL path for a specific sandboxId */
function jsonlPath(sandboxId) {
  return path.join(MAX_HOOKS_DIR, `e2b-executions-${sandboxId}.jsonl`)
}

/** Append entry to the sandbox-specific JSONL file */
function appendEntry(sandboxId, entry) {
  fs.appendFileSync(jsonlPath(sandboxId), JSON.stringify(entry) + '\n')
}

/** Read entries from a specific JSONL file */
function readEntries(filePath) {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8').trim()
  if (!content) return []
  return content.split('\n').map((line) => JSON.parse(line))
}

/**
 * Scan all e2b-executions-*.jsonl files to find the current active sandbox.
 * Returns the most recently created/resumed sandbox that hasn't been destroyed.
 */
function deriveSandboxState() {
  const files = fs.readdirSync(MAX_HOOKS_DIR)
    .filter((f) => f.startsWith('e2b-executions-') && f.endsWith('.jsonl'))

  let latest = { sandboxId: null, state: null, timestamp: '' }

  for (const file of files) {
    const entries = readEntries(path.join(MAX_HOOKS_DIR, file))
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]
      if (entry.type === 'lifecycle' && entry.timestamp > latest.timestamp) {
        switch (entry.action) {
          case 'create':
          case 'resume':
            latest = { sandboxId: entry.sandboxId, state: 'running', timestamp: entry.timestamp }
            break
          case 'pause':
            latest = { sandboxId: entry.sandboxId, state: 'paused', timestamp: entry.timestamp }
            break
          case 'destroy':
            latest = { sandboxId: null, state: null, timestamp: entry.timestamp }
            break
        }
        break // only need last lifecycle per file
      }
    }
  }

  return { sandboxId: latest.sandboxId, state: latest.state }
}

// ─── Commands ───

async function cmdStatus() {
  const { sandboxId, state } = deriveSandboxState()
  if (sandboxId && state) {
    console.log(`[E2B] Sandbox: ${sandboxId} (${state})`)
    console.log('Type: code-interpreter')
  } else {
    console.log("[E2B] No active sandbox. Use 'create' to start one.")
  }
}

async function cmdCreate() {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  // Check if there's already a running sandbox
  const current = deriveSandboxState()
  if (current.sandboxId && current.state === 'running') {
    console.log(`[E2B] Sandbox already running: ${current.sandboxId}`)
    return
  }

  // If paused, resume instead
  if (current.sandboxId && current.state === 'paused') {
    console.log(`[E2B] Found paused sandbox ${current.sandboxId}, resuming...`)
    await cmdResume()
    return
  }

  console.log('[E2B] Creating sandbox...')
  const sandbox = await Sandbox.create({
    apiKey: E2B_API_KEY,
    timeoutMs: 600_000,
  })

  appendEntry(sandbox.sandboxId, {
    id: generateId(),
    type: 'lifecycle',
    action: 'create',
    sandboxId: sandbox.sandboxId,
    sessionId: SESSION_ID,
    source: 'agent',
    timestamp: new Date().toISOString(),
  })

  console.log(`[E2B] Sandbox created: ${sandbox.sandboxId}`)
}

async function cmdRun(code, language) {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  const { sandboxId, state } = deriveSandboxState()
  if (!sandboxId || state !== 'running') {
    console.error('[E2B] No running sandbox. Use "create" first.')
    process.exit(1)
  }

  console.log(`[E2B] Executing ${language} code...`)

  let sandbox
  try {
    sandbox = await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY, requestTimeoutMs: 600_000 })
  } catch (err) {
    // Connection error — record the attempted code
    const errorMsg = err instanceof Error ? err.message : String(err)
    appendEntry(sandboxId, {
      id: generateId(),
      type: 'execution',
      sandboxId,
      code,
      language,
      result: { stdout: '', stderr: '', error: errorMsg },
      source: 'agent',
      timestamp: new Date().toISOString(),
    })
    throw err
  }

  // For bash, use commands.run which is more reliable for long-running shell commands
  if (language === 'bash' || language === 'sh') {
    let result
    try {
      result = await sandbox.commands.run(code, { timeoutMs: 0 })
    } catch (e) {
      // commands.run throws on non-zero exit code by default
      if (e.stdout !== undefined || e.stderr !== undefined) {
        result = e
      } else {
        // Timeout or other error — record the code
        const errorMsg = e instanceof Error ? e.message : String(e)
        appendEntry(sandboxId, {
          id: generateId(),
          type: 'execution',
          sandboxId,
          code,
          language,
          result: { stdout: '', stderr: '', error: errorMsg },
          source: 'agent',
          timestamp: new Date().toISOString(),
        })
        throw e
      }
    }
    const stdout = result.stdout || ''
    const stderr = result.stderr || ''
    if (stdout) console.log('--- stdout ---\n' + stdout)
    if (stderr) console.log('--- stderr ---\n' + stderr)
    if (result.exitCode !== undefined && result.exitCode !== 0) console.log(`--- error ---\n: ${result.exitCode}`)
    console.log('--- end ---')

    appendEntry(sandboxId, {
      id: generateId(),
      type: 'execution',
      sandboxId,
      code,
      language,
      result: {
        stdout,
        stderr,
        error: result.exitCode !== undefined && result.exitCode !== 0
          ? `Exit code: ${result.exitCode}`
          : null,
      },
      source: 'agent',
      timestamp: new Date().toISOString(),
    })
    return
  }

  let execution
  try {
    execution = await sandbox.runCode(code, {
      language: language || undefined,
      timeoutMs: 0,
    })
  } catch (err) {
    // Timeout or other error — record the code
    const errorMsg = err instanceof Error ? err.message : String(err)
    appendEntry(sandboxId, {
      id: generateId(),
      type: 'execution',
      sandboxId,
      code,
      language,
      result: { stdout: '', stderr: '', error: errorMsg },
      source: 'agent',
      timestamp: new Date().toISOString(),
    })
    throw err
  }

  // Build artifacts
  const artifacts = []
  for (const result of execution.results) {
    if (result.png) artifacts.push({ type: 'image/png', data: result.png })
    else if (result.jpeg) artifacts.push({ type: 'image/jpeg', data: result.jpeg })
    else if (result.svg) artifacts.push({ type: 'image/svg+xml', data: result.svg })
    else if (result.html) artifacts.push({ type: 'text/html', data: result.html })
  }

  const text = execution.text ?? ''
  const stdout = execution.logs.stdout.join('\n') + (text ? (execution.logs.stdout.length > 0 ? '\n' : '') + text : '')
  const stderr = execution.logs.stderr.join('\n')
  const error = execution.error
    ? `${execution.error.name}: ${execution.error.value}\n${execution.error.traceback}`
    : null

  appendEntry(sandboxId, {
    id: generateId(),
    type: 'execution',
    sandboxId,
    code,
    language,
    result: {
      stdout,
      stderr,
      error,
      artifacts: artifacts.length > 0 ? artifacts : undefined,
    },
    source: 'agent',
    timestamp: new Date().toISOString(),
  })

  // Human-readable output
  if (stdout) {
    console.log('--- stdout ---')
    console.log(stdout)
  }
  if (stderr) {
    console.log('--- stderr ---')
    console.log(stderr)
  }
  if (error) {
    console.log('--- error ---')
    console.log(error)
  }
  if (!stdout && !stderr && !error) {
    console.log('(no output)')
  }
  console.log('--- end ---')
}

async function cmdPause() {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  const { sandboxId, state } = deriveSandboxState()
  if (!sandboxId || state !== 'running') {
    console.error('[E2B] No running sandbox to pause.')
    process.exit(1)
  }

  const sandbox = await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY })
  await sandbox.pause()

  appendEntry(sandboxId, {
    id: generateId(),
    type: 'lifecycle',
    action: 'pause',
    sandboxId,
    source: 'agent',
    timestamp: new Date().toISOString(),
  })

  console.log(`[E2B] Sandbox ${sandboxId} paused.`)
}

async function cmdResume() {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  const { sandboxId, state } = deriveSandboxState()
  if (!sandboxId || state !== 'paused') {
    console.error('[E2B] No paused sandbox to resume.')
    process.exit(1)
  }

  await Sandbox.connect(sandboxId, {
    apiKey: E2B_API_KEY,
    timeoutMs: 60_000,
  })

  appendEntry(sandboxId, {
    id: generateId(),
    type: 'lifecycle',
    action: 'resume',
    sandboxId,
    source: 'agent',
    timestamp: new Date().toISOString(),
  })

  console.log(`[E2B] Sandbox ${sandboxId} resumed.`)
}

async function cmdUpload(localPath, remotePath) {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  const { sandboxId, state } = deriveSandboxState()
  if (!sandboxId || state !== 'running') {
    console.error('[E2B] No running sandbox. Use "create" first.')
    process.exit(1)
  }

  if (!fs.existsSync(localPath)) {
    console.error(`[E2B] Error: Local file not found: ${localPath}`)
    process.exit(1)
  }

  const sandbox = await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY })

  const stat = fs.statSync(localPath)
  if (stat.isDirectory()) {
    // Upload directory recursively
    const files = []
    function collectFiles(dir, baseDir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          collectFiles(fullPath, baseDir)
        } else {
          const relativePath = path.relative(baseDir, fullPath)
          files.push({ local: fullPath, relative: relativePath })
        }
      }
    }
    collectFiles(localPath, localPath)

    const targetDir = remotePath || `/home/user/${path.basename(localPath)}`
    let uploaded = 0
    for (const file of files) {
      const dest = `${targetDir}/${file.relative}`
      const content = fs.readFileSync(file.local)
      await sandbox.files.write(dest, content)
      uploaded++
    }
    console.log(`[E2B] Uploaded ${uploaded} files to ${targetDir}`)
  } else {
    // Upload single file
    const dest = remotePath || `/home/user/${path.basename(localPath)}`
    const content = fs.readFileSync(localPath)
    await sandbox.files.write(dest, content)
    console.log(`[E2B] Uploaded: ${localPath} → ${dest} (${stat.size} bytes)`)
  }
}

async function cmdDownload(remotePath, localPath) {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  const { sandboxId, state } = deriveSandboxState()
  if (!sandboxId || state !== 'running') {
    console.error('[E2B] No running sandbox. Use "create" first.')
    process.exit(1)
  }

  const sandbox = await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY })

  // Check if remote path is a directory
  let isDir = false
  try {
    const entries = await sandbox.files.list(remotePath)
    if (Array.isArray(entries) && entries.length > 0) {
      isDir = true
    }
  } catch {
    // Not a directory, treat as file
  }

  if (isDir) {
    const dest = localPath || path.basename(remotePath)
    let downloaded = 0

    async function downloadDir(remoteDir, localDir) {
      fs.mkdirSync(localDir, { recursive: true })
      const entries = await sandbox.files.list(remoteDir)
      for (const entry of entries) {
        const remoteFull = entry.path || `${remoteDir}/${entry.name}`
        const localFull = path.join(localDir, entry.name)
        if (entry.type === 'dir') {
          await downloadDir(remoteFull, localFull)
        } else {
          const content = await sandbox.files.read(remoteFull, { format: 'bytes' })
          fs.writeFileSync(localFull, content)
          downloaded++
        }
      }
    }

    await downloadDir(remotePath, dest)
    console.log(`[E2B] Downloaded ${downloaded} files to ${dest}`)
  } else {
    // Download single file
    const dest = localPath || path.basename(remotePath)
    const content = await sandbox.files.read(remotePath, { format: 'bytes' })
    fs.mkdirSync(path.dirname(path.resolve(dest)), { recursive: true })
    fs.writeFileSync(dest, content)
    const size = fs.statSync(dest).size
    console.log(`[E2B] Downloaded: ${remotePath} → ${dest} (${size} bytes)`)
  }
}

async function cmdLs(remotePath) {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  const { sandboxId, state } = deriveSandboxState()
  if (!sandboxId || state !== 'running') {
    console.error('[E2B] No running sandbox. Use "create" first.')
    process.exit(1)
  }

  const sandbox = await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY })
  const dirPath = remotePath || '/home/user'
  const entries = await sandbox.files.list(dirPath)

  console.log(`[E2B] Contents of ${dirPath}:`)
  for (const entry of entries) {
    const indicator = entry.type === 'dir' ? '/' : ''
    console.log(`  ${entry.name}${indicator}`)
  }
  console.log(`[E2B] Total: ${entries.length} items`)
}

async function cmdDestroy() {
  if (!E2B_API_KEY) {
    console.error('[E2B] Error: E2B_API_KEY environment variable not set')
    process.exit(1)
  }

  const { sandboxId } = deriveSandboxState()
  if (!sandboxId) {
    console.error('[E2B] No sandbox to destroy.')
    process.exit(1)
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: E2B_API_KEY })
    await sandbox.kill()
  } catch {
    // sandbox may already be expired
  }

  appendEntry(sandboxId, {
    id: generateId(),
    type: 'lifecycle',
    action: 'destroy',
    sandboxId,
    source: 'agent',
    timestamp: new Date().toISOString(),
  })

  console.log(`[E2B] Sandbox ${sandboxId} destroyed.`)
}

// ─── CLI ───

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  try {
    switch (command) {
      case 'status':
        await cmdStatus()
        break
      case 'create':
        await cmdCreate()
        break
      case 'run': {
        // Parse --lang flag
        let language = 'python'
        let code = ''
        let i = 1
        while (i < args.length) {
          if (args[i] === '--lang' && i + 1 < args.length) {
            language = args[i + 1]
            i += 2
          } else {
            code = args[i]
            i++
          }
        }
        if (!code) {
          console.error('[E2B] Error: No code provided. Usage: run [--lang <language>] "<code>"')
          process.exit(1)
        }
        await cmdRun(code, language)
        break
      }
      case 'pause':
        await cmdPause()
        break
      case 'resume':
        await cmdResume()
        break
      case 'upload': {
        const localPath = args[1]
        const remotePath = args[2] || undefined
        if (!localPath) {
          console.error('[E2B] Error: No local path provided. Usage: upload <local-path> [remote-path]')
          process.exit(1)
        }
        await cmdUpload(localPath, remotePath)
        break
      }
      case 'download': {
        const remotePath = args[1]
        const localDest = args[2] || undefined
        if (!remotePath) {
          console.error('[E2B] Error: No remote path provided. Usage: download <remote-path> [local-path]')
          process.exit(1)
        }
        await cmdDownload(remotePath, localDest)
        break
      }
      case 'ls': {
        await cmdLs(args[1] || undefined)
        break
      }
      case 'destroy':
        await cmdDestroy()
        break
      default:
        console.error(`[E2B] Unknown command: ${command}`)
        console.error('Usage: e2b-helper.js <status|create|run|upload|download|ls|pause|resume|destroy>')
        process.exit(1)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[E2B] Error: ${message}`)
    // cmdRun already writes a type:"execution" entry with the error,
    // so only write a generic type:"error" for non-run commands
    if (command !== 'run') {
      const { sandboxId } = deriveSandboxState()
      if (sandboxId) {
        appendEntry(sandboxId, {
          id: generateId(),
          type: 'error',
          message,
          source: 'agent',
          timestamp: new Date().toISOString(),
        })
      }
    }
    process.exit(1)
  }
}

main()
