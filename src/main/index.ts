import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { backendManager } from './backend'
import { registerIpcHandlers } from './ipc'

const isDev = !app.isPackaged

// ─── Window factory ───────────────────────────────────────────────────────────

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    show:            false,
    autoHideMenuBar: true,
    webPreferences: {
      preload:          join(__dirname, '../preload/index.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,
    },
  })

  // Show the window once the renderer is ready to avoid a blank flash
  win.on('ready-to-show', () => win.show())

  // Open target="_blank" links in the system browser
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

  // Start the Go backend early; the renderer polls its status
  backendManager.start().catch(console.error)

  createWindow()

  // macOS: re-create a window when the dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await backendManager.stop()
  if (process.platform !== 'darwin') app.quit()
})
