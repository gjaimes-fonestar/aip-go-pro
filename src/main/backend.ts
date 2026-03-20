import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import net from 'net'
import { join } from 'path'
import { app } from 'electron'
import type { BackendInfo, BackendStatus } from '../shared/ipc'

const HEALTH_CHECK_INTERVAL_MS = 500
const HEALTH_CHECK_TIMEOUT_MS  = 30_000

// ─── Binary resolution ────────────────────────────────────────────────────────

function getBinaryPath(): string {
  const isWin       = process.platform === 'win32'
  const binaryName  = isWin ? 'aip-backend.exe' : 'aip-backend'
  const platformDir = isWin ? 'windows' : 'linux'

  if (app.isPackaged) {
    // Production: extra-resources are unpacked next to app.asar
    return join(process.resourcesPath, 'bin', binaryName)
  }

  // Development: resources/bin/<platform>/
  return join(app.getAppPath(), 'resources', 'bin', platformDir, binaryName)
}

// ─── Port discovery ───────────────────────────────────────────────────────────

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

// ─── Health check ─────────────────────────────────────────────────────────────

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/health`)
      if (res.ok) return
    } catch {
      // not ready yet — keep polling
    }
    await new Promise((r) => setTimeout(r, HEALTH_CHECK_INTERVAL_MS))
  }
  throw new Error(`Backend did not become ready within ${timeoutMs / 1000}s`)
}

// ─── BackendManager ───────────────────────────────────────────────────────────

type StatusListener = (info: BackendInfo) => void

export class BackendManager {
  private process: ChildProcess | null = null
  private info: BackendInfo = { status: 'stopped', url: null, pid: null }
  private listeners = new Set<StatusListener>()

  // ── Internal ──

  private emit(patch: Partial<BackendInfo>): void {
    this.info = { ...this.info, ...patch }
    this.listeners.forEach((cb) => cb(this.info))
  }

  // ── Public API ──

  getInfo(): BackendInfo {
    return this.info
  }

  /** Subscribe to status changes. Returns an unsubscribe function. */
  onStatusChange(cb: StatusListener): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async start(): Promise<void> {
    if (this.process) return

    const binaryPath = getBinaryPath()

    if (!existsSync(binaryPath)) {
      const msg = `Go binary not found: ${binaryPath}`
      console.error(`[backend] ${msg}`)
      this.emit({ status: 'error', error: msg })
      return
    }

    const port = await findFreePort()
    const url  = `http://127.0.0.1:${port}`

    this.emit({ status: 'starting', url, pid: null, error: undefined })
    console.log(`[backend] Starting on port ${port}`)

    this.process = spawn(binaryPath, ['--port', String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env:   { ...process.env, AIP_PORT: String(port) },
    })

    this.process.stdout?.on('data', (d: Buffer) =>
      console.log('[backend]', d.toString().trimEnd())
    )
    this.process.stderr?.on('data', (d: Buffer) =>
      console.error('[backend]', d.toString().trimEnd())
    )

    this.process.on('exit', (code, signal) => {
      console.log(`[backend] Exited — code=${code} signal=${signal}`)
      this.process = null
      this.emit({
        status: 'stopped',
        pid:    null,
        error:  code !== 0 ? `Exited with code ${code}` : undefined,
      })
    })

    this.emit({ pid: this.process.pid ?? null })

    try {
      await waitForReady(url, HEALTH_CHECK_TIMEOUT_MS)
      this.emit({ status: 'ready' })
      console.log(`[backend] Ready at ${url}`)
    } catch (err) {
      this.emit({ status: 'error', error: String(err) })
    }
  }

  async stop(): Promise<void> {
    if (!this.process) return

    this.process.kill()

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 5_000)
      this.process!.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    this.process = null
    this.emit({ status: 'stopped', pid: null })
  }

  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }
}

export const backendManager = new BackendManager()
