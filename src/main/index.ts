import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { backendManager } from './backend'
import { daemonManager } from './daemon'
import { registerIpcHandlers } from './ipc'
import { aipCore } from './aip'
import { schedulerManager } from './schedulerManager'

const isDev = !app.isPackaged

// ─── Window factory ───────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    show:            false,
    frame:           false,
    autoHideMenuBar: true,
    webPreferences: {
      preload:          join(__dirname, '../preload/index.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,
    },
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']!)
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  registerIpcHandlers()

  // Start the Go backend and aip-daemon in parallel.
  // The daemon starts with a default interface; the user will pick a real one
  // in the UI which triggers daemonManager.restart(iface) via aip:initialize.
  backendManager.start().catch(console.error)
  schedulerManager.start().catch(console.error)
  // Daemon is started by the user via the interface selection modal (aip:initialize)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ─── Cleanup ─────────────────────────────────────────────────────────────────

let cleanupStarted = false

async function runCleanup(): Promise<void> {
  if (cleanupStarted) return
  cleanupStarted = true

  aipCore.disconnect()

  schedulerManager.stop()

  try {
    await Promise.race([
      Promise.allSettled([
        daemonManager.stop(),
        backendManager.stop(),
      ]),
      new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
    ])
  } catch {
    // ignore — we are exiting regardless
  }
}

app.on('before-quit', (event) => {
  if (cleanupStarted) return
  event.preventDefault()
  runCleanup().finally(() => app.exit(0))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('SIGTERM', () => app.quit())
process.on('SIGINT',  () => app.quit())
