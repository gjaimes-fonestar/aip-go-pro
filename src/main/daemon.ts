import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import net from 'net'
import { join } from 'path'
import { app } from 'electron'

const READY_POLL_INTERVAL_MS    = 200
const READY_TIMEOUT_MS          = 15_000
const RESTART_DELAY_MS          = 1_000

// ─── Binary resolution ────────────────────────────────────────────────────────

function getBinaryPath(): string {
  const isWin       = process.platform === 'win32'
  const binaryName  = isWin ? 'aip-daemon.exe' : 'aip-daemon'
  const platformDir = isWin ? 'windows' : 'linux'

  if (app.isPackaged) {
    return join(process.resourcesPath, 'bin', binaryName)
  }

  // Development: resources/bin/<platform>/aip-daemon
  return join(app.getAppPath(), 'resources', 'bin', platformDir, binaryName)
}

// ─── TCP readiness probe ──────────────────────────────────────────────────────

function tcpProbe(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port })
    sock.once('connect', () => { sock.destroy(); resolve(true) })
    sock.once('error',   () => resolve(false))
    sock.setTimeout(300, () => { sock.destroy(); resolve(false) })
  })
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await tcpProbe('127.0.0.1', port)) return
    await new Promise((r) => setTimeout(r, READY_POLL_INTERVAL_MS))
  }
  throw new Error(`aip-daemon did not open port ${port} within ${timeoutMs / 1000}s`)
}

// ─── DaemonManager ───────────────────────────────────────────────────────────

export class DaemonManager {
  private process: ChildProcess | null = null
  private currentIface = '127.0.0.1'
  private port = 9000
  private stopping = false

  isRunning(): boolean {
    return this.process !== null
  }

  async start(iface: string, port = 9000): Promise<void> {
    if (this.process) return

    this.currentIface = iface
    this.port = port
    this.stopping = false

    const binaryPath = getBinaryPath()
    if (!existsSync(binaryPath)) {
      console.error(`[daemon] Binary not found: ${binaryPath}`)
      return
    }

    const args = ['--iface', iface, '--port', String(port)]
    console.log(`[daemon] Starting: ${binaryPath} ${args.join(' ')}`)

    this.process = spawn(binaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    this.process.stdout?.on('data', (d: Buffer) =>
      console.log('[daemon]', d.toString().trimEnd())
    )
    this.process.stderr?.on('data', (d: Buffer) =>
      console.error('[daemon]', d.toString().trimEnd())
    )

    // Auto-restart on unexpected exit (crash, OOM, etc.)
    this.process.on('exit', (code, signal) => {
      console.log(`[daemon] Exited — code=${code} signal=${signal}`)
      this.process = null
      if (!this.stopping) {
        console.warn(`[daemon] Unexpected exit — restarting in ${RESTART_DELAY_MS}ms`)
        setTimeout(() => {
          if (!this.stopping)
            this.start(this.currentIface, this.port).catch(console.error)
        }, RESTART_DELAY_MS)
      }
    })

    try {
      await waitForPort(port, READY_TIMEOUT_MS)
      console.log(`[daemon] Ready on port ${port}`)
    } catch (err) {
      console.error(`[daemon] ${err}`)
    }
  }

  async stop(): Promise<void> {
    this.stopping = true
    if (!this.process) return

    this.process.kill('SIGTERM')

    await new Promise<void>((resolve) => {
      const forcekill = setTimeout(() => {
        this.process?.kill('SIGKILL')
        resolve()
      }, 5_000)
      this.process!.once('exit', () => {
        clearTimeout(forcekill)
        resolve()
      })
    })

    this.process = null
  }

  async restart(iface: string): Promise<void> {
    await this.stop()
    await this.start(iface, this.port)
  }
}

export const daemonManager = new DaemonManager()
