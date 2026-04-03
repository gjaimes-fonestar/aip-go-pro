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
  AipSipConfigWrite,
  AipSipConfigChangedEvent,
  AipSoundMeterConfig,
  AipSoundMeterConfigChangedEvent,
  AipDeviceNetworkConfig,
  AipSensorRelayConfig,
  AipNetworkChannel,
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

    /** Subscribe to channel player push events. */
    onChannelEvent: (cb: (event: AipChannelPlayerEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipChannelPlayerEvent) } catch { /* ignore malformed */ }
      }
      ipcRenderer.on(IPC.AIP.CHANNEL_EVENT, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.CHANNEL_EVENT, listener)
    },

    /** Subscribe to network channel push events (added / updated / removed). */
    onNetworkChannelEvent: (cb: (json: string) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => cb(json)
      ipcRenderer.on(IPC.AIP.NETWORK_CHANNEL_EVENT, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.NETWORK_CHANNEL_EVENT, listener)
    },

    /** Subscribe to SIP config changed push events. */
    onSipConfigEvent: (cb: (event: AipSipConfigChangedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipSipConfigChangedEvent) } catch { /* ignore malformed */ }
      }
      ipcRenderer.on(IPC.AIP.SIP_CONFIG_EVENT, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.SIP_CONFIG_EVENT, listener)
    },

    /** Subscribe to sound meter config changed push events. */
    onSoundMeterConfigEvent: (cb: (event: AipSoundMeterConfigChangedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipSoundMeterConfigChangedEvent) } catch { /* ignore malformed */ }
      }
      ipcRenderer.on(IPC.AIP.SOUND_METER_CONFIG_EVENT, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.SOUND_METER_CONFIG_EVENT, listener)
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

    // ── Device configuration ───────────────────────────────────────────────
    changeButtonColor: (mac: string, r: number, g: number, b: number): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CHANGE_BUTTON_COLOR, mac, r, g, b),

    requestSIPConfig: (mac: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.REQUEST_SIP_CONFIG, mac),

    changeSIPConfig: (mac: string, config: AipSipConfigWrite): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CHANGE_SIP_CONFIG, mac, config),

    requestSoundMeterConfig: (mac: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.REQUEST_SOUND_METER_CONFIG, mac),

    changeSoundMeterConfig: (mac: string, config: AipSoundMeterConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CHANGE_SOUND_METER_CONFIG, mac, config),

    changeSoundMeterSetting: (mac: string, config: AipSoundMeterConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CHANGE_SOUND_METER_SETTING, mac, config),

    changeNetworkConfig: (mac: string, config: AipDeviceNetworkConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CHANGE_NETWORK_CONFIG, mac, config),

    changeSensorRelayConfig: (mac: string, config: AipSensorRelayConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CHANGE_SENSOR_RELAY_CONFIG, mac, config),

    changeStartupMode: (mac: string, mode: number): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CHANGE_STARTUP_MODE, mac, mode),

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

    linkNetworkChannelToDevice: (
      channelMac: string,
      channelNumber: number,
      deviceMac: string,
    ): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.LINK_NETWORK_CHANNEL_TO_DEVICE, channelMac, channelNumber, deviceMac),

    // ── Network channel repository ─────────────────────────────────────────
    getNetworkChannels: (): Promise<AipNetworkChannel[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_NETWORK_CHANNELS),

    getLocalNetworkChannels: (): Promise<AipNetworkChannel[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_LOCAL_NETWORK_CHANNELS),

    saveNetworkChannel: (channel: AipNetworkChannel): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.SAVE_NETWORK_CHANNEL, channel),

    removeNetworkChannel: (mac: string): Promise<{ removed: boolean }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_NETWORK_CHANNEL, mac),

    removeNetworkChannelByKey: (mac: string, channelNumber: number): Promise<{ removed: boolean }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_NETWORK_CHANNEL_BY_KEY, mac, channelNumber),

    requestAllStreams: (): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.REQUEST_ALL_STREAMS),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
