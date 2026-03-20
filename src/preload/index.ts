import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { BackendInfo, DialogOpenOptions, DialogSaveOptions } from '../shared/ipc'

/**
 * Typed surface exposed to the renderer via window.electronAPI.
 * Only the explicitly listed methods are available — no raw ipcRenderer access.
 */
const electronAPI = {
  backend: {
    getInfo:    (): Promise<BackendInfo>    => ipcRenderer.invoke(IPC.BACKEND.GET_INFO),
    getUrl:     (): Promise<string | null>  => ipcRenderer.invoke(IPC.BACKEND.GET_URL),
    restart:    (): Promise<void>           => ipcRenderer.invoke(IPC.BACKEND.RESTART),
  },
  app: {
    getVersion:  (): Promise<string> => ipcRenderer.invoke(IPC.APP.GET_VERSION),
    getPlatform: (): Promise<string> => ipcRenderer.invoke(IPC.APP.GET_PLATFORM),
  },
  dialog: {
    openFile: (opts?: DialogOpenOptions): Promise<string[] | null> =>
      ipcRenderer.invoke(IPC.DIALOG.OPEN_FILE, opts),
    saveFile: (opts?: DialogSaveOptions): Promise<string | null> =>
      ipcRenderer.invoke(IPC.DIALOG.SAVE_FILE, opts),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
