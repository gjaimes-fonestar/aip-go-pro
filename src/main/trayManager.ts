import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { setExitConfirmed } from './exitState'
import { schedulerManager } from './schedulerManager'
import { IPC } from '../shared/ipc'

let tray: Tray | null = null

function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icons', 'icon.ico')
    : join(app.getAppPath(), 'resources', 'icons', 'icon.ico')
}

export function ensureTray(win: BrowserWindow): void {
  if (tray) return
  let icon = nativeImage.createEmpty()
  try {
    const loaded = nativeImage.createFromPath(getIconPath())
    if (!loaded.isEmpty()) icon = loaded
  } catch { /* no icon file — tray still works on Windows */ }

  tray = new Tray(icon)
  tray.setToolTip('AIP Go Pro')

  const buildMenu = () => Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => { win.show(); win.focus() },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        try {
          const settings = await schedulerManager.db.settings.get()
          if (settings.securityEnabled && settings.securityAskOnExit && settings.securityPassword) {
            win.show()
            win.focus()
            win.webContents.send(IPC.WINDOW.EXIT_REQUESTED)
          } else {
            setExitConfirmed()
            win.close()
          }
        } catch {
          setExitConfirmed()
          win.close()
        }
      },
    },
  ])

  tray.setContextMenu(buildMenu())
  tray.on('click', () => { win.show(); win.focus() })
}

export function destroyTray(): void {
  if (tray) { tray.destroy(); tray = null }
}

export function isTrayActive(): boolean {
  return tray !== null
}
