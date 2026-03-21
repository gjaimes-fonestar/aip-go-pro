import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  BackendInfo,
  DialogOpenOptions,
  DialogSaveOptions,
  AipNetworkInterface,
  AipChannelConfig,
  AipChannelInfo,
  AipForeignChannelInfo,
  AipChannelPlayerEvent,
} from '../shared/ipc'

/**
 * Typed surface exposed to the renderer via window.electronAPI.
 * Only the explicitly listed methods are available — no raw ipcRenderer access.
 */
const electronAPI = {
  backend: {
    getInfo:  (): Promise<BackendInfo>    => ipcRenderer.invoke(IPC.BACKEND.GET_INFO),
    getUrl:   (): Promise<string | null>  => ipcRenderer.invoke(IPC.BACKEND.GET_URL),
    restart:  (): Promise<void>           => ipcRenderer.invoke(IPC.BACKEND.RESTART),
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

  aip: {
    // ── Core ───────────────────────────────────────────────────────────────
    getStatus: (): Promise<{ initialized: boolean }> =>
      ipcRenderer.invoke(IPC.AIP.GET_STATUS),

    getInterfaces: (): Promise<AipNetworkInterface[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_INTERFACES),

    initialize: (networkInterface: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.INITIALIZE, networkInterface),

    shutdown: (): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.SHUTDOWN),

    /** Subscribe to device push events (device_added / updated / removed). */
    onDeviceEvent: (cb: (json: string) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => cb(json)
      ipcRenderer.on(IPC.AIP.DEVICE_EVENT, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.DEVICE_EVENT, listener)
    },

    /** Subscribe to channel player push events (state changes, errors, metadata, …). */
    onChannelEvent: (cb: (event: AipChannelPlayerEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipChannelPlayerEvent) } catch { /* ignore malformed */ }
      }
      ipcRenderer.on(IPC.AIP.CHANNEL_EVENT, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.CHANNEL_EVENT, listener)
    },

    // ── Devices ────────────────────────────────────────────────────────────
    getDevices: (): Promise<string> =>
      ipcRenderer.invoke(IPC.AIP.GET_DEVICES),

    getDevice: (mac: string): Promise<string> =>
      ipcRenderer.invoke(IPC.AIP.GET_DEVICE, mac),

    setVolume: (mac: string, volume: number): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.SET_VOLUME, mac, volume),

    stopAudio: (mac: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.STOP_AUDIO, mac),

    // ── Channels ───────────────────────────────────────────────────────────
    createChannel: (config: AipChannelConfig): Promise<number> =>
      ipcRenderer.invoke(IPC.AIP.CREATE_CHANNEL, config),

    destroyChannel: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.DESTROY_CHANNEL, id),

    getChannel: (id: number): Promise<AipChannelInfo | undefined> =>
      ipcRenderer.invoke(IPC.AIP.GET_CHANNEL, id),

    getChannels: (): Promise<AipChannelInfo[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_CHANNELS),

    getForeignChannels: (): Promise<AipForeignChannelInfo[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_FOREIGN_CHANNELS),

    playChannel:     (id: number): Promise<void> => ipcRenderer.invoke(IPC.AIP.PLAY_CHANNEL,     id),
    pauseChannel:    (id: number): Promise<void> => ipcRenderer.invoke(IPC.AIP.PAUSE_CHANNEL,    id),
    stopChannel:     (id: number): Promise<void> => ipcRenderer.invoke(IPC.AIP.STOP_CHANNEL,     id),
    nextChannel:     (id: number): Promise<void> => ipcRenderer.invoke(IPC.AIP.NEXT_CHANNEL,     id),
    previousChannel: (id: number): Promise<void> => ipcRenderer.invoke(IPC.AIP.PREVIOUS_CHANNEL, id),

    setChannelVolume: (id: number, volume: number): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.SET_CHANNEL_VOLUME, id, volume),

    linkChannelToDevice: (channelId: number, deviceMac: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.LINK_CHANNEL_TO_DEVICE, channelId, deviceMac),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
