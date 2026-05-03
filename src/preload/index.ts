import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  CalendarEvent,
  CalendarCreatePayload,
  CalendarUpdatePayload,
  CalendarTogglePayload,
} from '../shared/calendar'
import type { Scene, SceneCreatePayload, SceneUpdatePayload } from '../shared/scene'
import type { Stream, StreamCreatePayload, StreamUpdatePayload } from '../shared/stream'
import type { AppSettings, UpdateAppSettings } from '../shared/settings'
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
  AipSipExtension,
  AipSipConference,
  AipSipExtensionCredentials,
  AipSipConferenceParticipant,
  AipGateWebConfig,
  AipFileTransferRequest,
  AipFileTransferProgressEvent,
  AipFileTransferCompletedEvent,
  AipAudioFile,
  AipGateConnectionConfig,
  AipGateRemoteFile,
  AipGateRemoteFolder,
  AipGateFilesUpdatedEvent,
  AipGateFoldersUpdatedEvent,
  AipGateOperationErrorEvent,
  AipGateOperationCompletedEvent,
  AipGateChannelPlayer,
  AipGateRemoteScene,
  AipGateRemoteSchedule,
  AipGateChannelPlayersUpdatedEvent,
  AipGateScenesUpdatedEvent,
  AipGateSchedulesUpdatedEvent,
} from '../shared/ipc'

/**
 * Typed surface exposed to the renderer via window.electronAPI.
 * Only the explicitly listed methods are available — no raw ipcRenderer access.
 */
const electronAPI = {
  appWindow: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW.MINIMIZE),
    maximize: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW.MAXIMIZE),
    close:    (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW.CLOSE),
  },

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

  calendar: {
    list:    (): Promise<CalendarEvent[]>            => ipcRenderer.invoke(IPC.CALENDAR.LIST),
    get:     (id: string): Promise<CalendarEvent | null> => ipcRenderer.invoke(IPC.CALENDAR.GET, id),
    create:  (payload: CalendarCreatePayload): Promise<CalendarEvent>        => ipcRenderer.invoke(IPC.CALENDAR.CREATE, payload),
    update:  (payload: CalendarUpdatePayload): Promise<CalendarEvent | null> => ipcRenderer.invoke(IPC.CALENDAR.UPDATE, payload),
    delete:  (id: string): Promise<{ removed: boolean }> => ipcRenderer.invoke(IPC.CALENDAR.DELETE, id),
    toggle:  (payload: CalendarTogglePayload): Promise<CalendarEvent | null> => ipcRenderer.invoke(IPC.CALENDAR.TOGGLE, payload),
    trigger: (id: string): Promise<{ fired: boolean; event?: CalendarEvent }> => ipcRenderer.invoke(IPC.CALENDAR.TRIGGER, id),

    onEventFired: (cb: (id: string, firedAt: string) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, id: string, firedAt: string): void => cb(id, firedAt)
      ipcRenderer.on(IPC.CALENDAR.FIRED, listener)
      return () => ipcRenderer.removeListener(IPC.CALENDAR.FIRED, listener)
    },
  },

  scene: {
    list:    (): Promise<Scene[]>                          => ipcRenderer.invoke(IPC.SCENE.LIST),
    get:     (id: string): Promise<Scene | null>           => ipcRenderer.invoke(IPC.SCENE.GET, id),
    create:  (payload: SceneCreatePayload): Promise<Scene>             => ipcRenderer.invoke(IPC.SCENE.CREATE, payload),
    update:  (payload: SceneUpdatePayload): Promise<Scene | null>      => ipcRenderer.invoke(IPC.SCENE.UPDATE, payload),
    delete:  (id: string): Promise<{ removed: boolean }>  => ipcRenderer.invoke(IPC.SCENE.DELETE, id),
    trigger: (id: string): Promise<{ fired: boolean }>    => ipcRenderer.invoke(IPC.SCENE.TRIGGER, id),
    onSceneFired: (cb: (id: string, name: string, firedAt: string) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, id: string, name: string, firedAt: string): void => cb(id, name, firedAt)
      ipcRenderer.on(IPC.SCENE.FIRED, listener)
      return () => ipcRenderer.removeListener(IPC.SCENE.FIRED, listener)
    },
  },

  stream: {
    list:     (): Promise<Stream[]>                                         => ipcRenderer.invoke(IPC.STREAM.LIST),
    get:      (id: string): Promise<Stream | null>                          => ipcRenderer.invoke(IPC.STREAM.GET, id),
    create:   (payload: StreamCreatePayload): Promise<Stream>               => ipcRenderer.invoke(IPC.STREAM.CREATE, payload),
    update:   (payload: StreamUpdatePayload): Promise<Stream | null>        => ipcRenderer.invoke(IPC.STREAM.UPDATE, payload),
    delete:   (id: string): Promise<{ removed: boolean }>                   => ipcRenderer.invoke(IPC.STREAM.DELETE, id),
    validate: (url: string): Promise<{ ok: boolean; message: string }>      => ipcRenderer.invoke(IPC.STREAM.VALIDATE, url),
  },

  settings: {
    get:  (): Promise<AppSettings>                        => ipcRenderer.invoke(IPC.SETTINGS.GET),
    save: (changes: UpdateAppSettings): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS.SAVE, changes),
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

    // ── SIP extension repository ───────────────────────────────────────────
    getSipExtensions: (): Promise<AipSipExtension[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_SIP_EXTENSIONS),

    saveSipExtension: (ext: AipSipExtension): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.SAVE_SIP_EXTENSION, ext),

    removeSipExtension: (mac: string): Promise<{ removed: boolean }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_SIP_EXTENSION, mac),

    // ── SIP conference repository ──────────────────────────────────────────
    getSipConferences: (): Promise<AipSipConference[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_SIP_CONFERENCES),

    getSipConferencesForDevice: (mac: string): Promise<AipSipConference[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_SIP_CONFERENCES_FOR_DEVICE, mac),

    saveSipConference: (conf: AipSipConference): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.SAVE_SIP_CONFERENCE, conf),

    removeSipConference: (mac: string, conferenceId: number): Promise<{ removed: boolean }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_SIP_CONFERENCE, mac, conferenceId),

    removeSipConferencesForDevice: (mac: string): Promise<{ removed: number }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_SIP_CONFERENCES_FOR_DEVICE, mac),

    // ── SIP device commands ────────────────────────────────────────────────
    addSipExtension: (mac: string, creds: AipSipExtensionCredentials): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.ADD_SIP_EXTENSION, mac, creds),

    deleteSipExtension: (mac: string, creds: AipSipExtensionCredentials): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.DELETE_SIP_EXTENSION, mac, creds),

    createSipConference: (mac: string, conf: AipSipConference): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CREATE_SIP_CONFERENCE, mac, conf),

    addSipConferenceUser: (mac: string, p: AipSipConferenceParticipant): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.ADD_SIP_CONFERENCE_USER, mac, p),

    // ── Gate web config repository ─────────────────────────────────────────
    getGateWebConfigs: (): Promise<AipGateWebConfig[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_GATE_WEB_CONFIGS),

    saveGateWebConfig: (config: AipGateWebConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.SAVE_GATE_WEB_CONFIG, config),

    removeGateWebConfig: (mac: string): Promise<{ removed: boolean }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_GATE_WEB_CONFIG, mac),

    // ── Audio file repository ──────────────────────────────────────────────
    getAudioFiles: (): Promise<AipAudioFile[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_AUDIO_FILES),

    getAudioFilesForDevice: (mac: string, audioType?: number): Promise<AipAudioFile[]> =>
      ipcRenderer.invoke(IPC.AIP.GET_AUDIO_FILES_FOR_DEVICE, mac, audioType),

    removeAudioFile: (mac: string, fileId: number): Promise<{ removed: boolean }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_AUDIO_FILE, mac, fileId),

    removeAudioFilesForDevice: (mac: string): Promise<{ removed: number }> =>
      ipcRenderer.invoke(IPC.AIP.REMOVE_AUDIO_FILES_FOR_DEVICE, mac),

    // ── File transfer ──────────────────────────────────────────────────────
    enqueueFileTransfer: (req: AipFileTransferRequest): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.ENQUEUE_FILE_TRANSFER, req),

    cancelFileTransfer: (): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.CANCEL_FILE_TRANSFER),

    onFileTransferProgress: (cb: (event: AipFileTransferProgressEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipFileTransferProgressEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.FILE_TRANSFER_PROGRESS, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.FILE_TRANSFER_PROGRESS, listener)
    },

    onFileTransferCompleted: (cb: (event: AipFileTransferCompletedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipFileTransferCompletedEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.FILE_TRANSFER_COMPLETED, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.FILE_TRANSFER_COMPLETED, listener)
    },

    // ── Gate filesystem ────────────────────────────────────────────────────
    gateFetchFiles: (mac: string, config: AipGateConnectionConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_FETCH_FILES, mac, config),

    gateFetchFolders: (mac: string, config: AipGateConnectionConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_FETCH_FOLDERS, mac, config),

    gateGetFiles: (mac: string): Promise<AipGateRemoteFile[]> =>
      ipcRenderer.invoke(IPC.AIP.GATE_GET_FILES, mac),

    gateGetFilesByCategory: (mac: string, category: string): Promise<AipGateRemoteFile[]> =>
      ipcRenderer.invoke(IPC.AIP.GATE_GET_FILES_BY_CAT, mac, category),

    gateGetFolders: (mac: string): Promise<AipGateRemoteFolder[]> =>
      ipcRenderer.invoke(IPC.AIP.GATE_GET_FOLDERS, mac),

    gateUploadFile: (mac: string, config: AipGateConnectionConfig, localPath: string, category: string, folder?: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_UPLOAD_FILE, mac, config, localPath, category, folder),

    gateDownloadFile: (mac: string, config: AipGateConnectionConfig, fileId: string, localPath: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_DOWNLOAD_FILE, mac, config, fileId, localPath),

    gateDeleteFile: (mac: string, config: AipGateConnectionConfig, fileId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_DELETE_FILE, mac, config, fileId),

    gateCreateFolder: (mac: string, config: AipGateConnectionConfig, name: string, category: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_CREATE_FOLDER, mac, config, name, category),

    gateDeleteFolder: (mac: string, config: AipGateConnectionConfig, name: string, category: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_DELETE_FOLDER, mac, config, name, category),

    gateRenameFolder: (mac: string, config: AipGateConnectionConfig, name: string, newName: string, category: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_RENAME_FOLDER, mac, config, name, newName, category),

    onGateFilesUpdated: (cb: (event: AipGateFilesUpdatedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipGateFilesUpdatedEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.GATE_FILES_UPDATED, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.GATE_FILES_UPDATED, listener)
    },

    onGateFoldersUpdated: (cb: (event: AipGateFoldersUpdatedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipGateFoldersUpdatedEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.GATE_FOLDERS_UPDATED, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.GATE_FOLDERS_UPDATED, listener)
    },

    onGateOperationError: (cb: (event: AipGateOperationErrorEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipGateOperationErrorEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.GATE_OPERATION_ERROR, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.GATE_OPERATION_ERROR, listener)
    },

    onGateOperationCompleted: (cb: (event: AipGateOperationCompletedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipGateOperationCompletedEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.GATE_OPERATION_COMPLETED, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.GATE_OPERATION_COMPLETED, listener)
    },

    // ── Gate channel players ───────────────────────────────────────────────
    gateFetchChannelPlayers: (mac: string, config: AipGateConnectionConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_FETCH_CHANNEL_PLAYERS, mac, config),

    gateGetChannelPlayers: (mac: string): Promise<AipGateChannelPlayer[]> =>
      ipcRenderer.invoke(IPC.AIP.GATE_GET_CHANNEL_PLAYERS, mac),

    gateActivateChannelPlayer: (mac: string, config: AipGateConnectionConfig, name: string, source: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_ACTIVATE_CHANNEL_PLAYER, mac, config, name, source),

    gateDeactivateChannelPlayer: (mac: string, config: AipGateConnectionConfig, playerId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_DEACTIVATE_CHANNEL_PLAYER, mac, config, playerId),

    onGateChannelPlayersUpdated: (cb: (event: AipGateChannelPlayersUpdatedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipGateChannelPlayersUpdatedEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.GATE_CHANNEL_PLAYERS_UPDATED, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.GATE_CHANNEL_PLAYERS_UPDATED, listener)
    },

    // ── Gate scenes ────────────────────────────────────────────────────────
    gateFetchScenes: (mac: string, config: AipGateConnectionConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_FETCH_SCENES, mac, config),

    gateGetScenes: (mac: string): Promise<AipGateRemoteScene[]> =>
      ipcRenderer.invoke(IPC.AIP.GATE_GET_SCENES, mac),

    gateCreateScene: (mac: string, config: AipGateConnectionConfig, scene: object): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_CREATE_SCENE, mac, config, scene),

    gateUpdateScene: (mac: string, config: AipGateConnectionConfig, sceneId: string, scene: object): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_UPDATE_SCENE, mac, config, sceneId, scene),

    gateDeleteScene: (mac: string, config: AipGateConnectionConfig, sceneId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_DELETE_SCENE, mac, config, sceneId),

    onGateScenesUpdated: (cb: (event: AipGateScenesUpdatedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipGateScenesUpdatedEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.GATE_SCENES_UPDATED, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.GATE_SCENES_UPDATED, listener)
    },

    // ── Gate schedules ─────────────────────────────────────────────────────
    gateFetchSchedules: (mac: string, config: AipGateConnectionConfig): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_FETCH_SCHEDULES, mac, config),

    gateGetSchedules: (mac: string): Promise<AipGateRemoteSchedule[]> =>
      ipcRenderer.invoke(IPC.AIP.GATE_GET_SCHEDULES, mac),

    gateCreateSchedule: (mac: string, config: AipGateConnectionConfig, schedule: object): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_CREATE_SCHEDULE, mac, config, schedule),

    gateUpdateSchedule: (mac: string, config: AipGateConnectionConfig, scheduleId: string, schedule: object): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_UPDATE_SCHEDULE, mac, config, scheduleId, schedule),

    gateDeleteSchedule: (mac: string, config: AipGateConnectionConfig, scheduleId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_DELETE_SCHEDULE, mac, config, scheduleId),

    gateCancelSchedule: (mac: string, config: AipGateConnectionConfig, scheduleId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.AIP.GATE_CANCEL_SCHEDULE, mac, config, scheduleId),

    onGateSchedulesUpdated: (cb: (event: AipGateSchedulesUpdatedEvent) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, json: string): void => {
        try { cb(JSON.parse(json) as AipGateSchedulesUpdatedEvent) } catch { /* ignore */ }
      }
      ipcRenderer.on(IPC.AIP.GATE_SCHEDULES_UPDATED, listener)
      return () => ipcRenderer.removeListener(IPC.AIP.GATE_SCHEDULES_UPDATED, listener)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
