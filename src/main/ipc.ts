import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { ensureTray, destroyTray } from './trayManager'
import http from 'http'
import https from 'https'
import { IPC } from '../shared/ipc'
import { setExitConfirmed } from './exitState'
import type {
  AipChannelConfig,
  AipSipConfigWrite,
  AipSoundMeterConfig,
  AipDeviceNetworkConfig,
  AipSensorRelayConfig,
  AipNetworkChannel,
  AipSipExtension,
  AipSipConference,
  AipSipExtensionCredentials,
  AipSipConferenceParticipant,
  AipGateWebConfig,
  AipFileTransferRequest,
  AipGateConnectionConfig,
} from '../shared/ipc'
import type {
  CalendarCreatePayload,
  CalendarUpdatePayload,
  CalendarTogglePayload,
} from '../shared/calendar'
import type { SceneCreatePayload, SceneUpdatePayload } from '../shared/scene'
import type { StreamCreatePayload, StreamUpdatePayload } from '../shared/stream'
import { backendManager } from './backend'
import { daemonManager } from './daemon'
import { aipCore, aipDevices, aipChannels, aipWebserver } from './aip'
import { schedulerManager } from './schedulerManager'

export function registerIpcHandlers(): void {
  // ── Window controls ───────────────────────────────────────────────────────
  ipcMain.handle(IPC.WINDOW.MINIMIZE, (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.handle(IPC.WINDOW.MAXIMIZE, (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.handle(IPC.WINDOW.CLOSE, (e) => BrowserWindow.fromWebContents(e.sender)?.close())

  // ── Backend ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.BACKEND.GET_INFO, () => backendManager.getInfo())
  ipcMain.handle(IPC.BACKEND.GET_URL,  () => backendManager.getInfo().url)
  ipcMain.handle(IPC.BACKEND.RESTART,  () => backendManager.restart())

  // ── App ──────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.APP.GET_VERSION,  () => app.getVersion())
  ipcMain.handle(IPC.APP.GET_PLATFORM, () => process.platform)

  // ── Dialogs ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.DIALOG.OPEN_FILE, async (_e, opts: { title?: string; filters?: Electron.FileFilter[]; multiSelections?: boolean } = {}) => {
    const properties: Electron.OpenDialogOptions['properties'] = ['openFile']
    if (opts.multiSelections) properties.push('multiSelections')
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title:   opts.title,
      filters: opts.filters,
      properties,
    })
    return canceled ? null : filePaths
  })

  ipcMain.handle(IPC.DIALOG.SAVE_FILE, async (_e, opts: { title?: string; defaultPath?: string; filters?: Electron.FileFilter[] } = {}) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title:       opts.title,
      defaultPath: opts.defaultPath,
      filters:     opts.filters,
    })
    return canceled ? null : filePath
  })

  // ── AIP — Core ───────────────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GET_STATUS,     () => ({ initialized: daemonManager.isRunning() }))
  ipcMain.handle(IPC.AIP.GET_INTERFACES, () => aipCore.getNetworkInterfaces())

  ipcMain.handle(IPC.AIP.INITIALIZE, (_e, networkInterface: string) =>
    daemonManager.restart(networkInterface)
  )

  ipcMain.handle(IPC.AIP.SHUTDOWN, () => daemonManager.stop())

  // ── AIP — Devices ────────────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GET_DEVICES, () => aipDevices.getDevicesJson())

  ipcMain.handle(IPC.AIP.GET_DEVICE, (_e, mac: string) =>
    aipDevices.getDeviceByMacJson(mac)
  )

  ipcMain.handle(IPC.AIP.SET_VOLUME, (_e, mac: string, volume: number) =>
    aipDevices.setVolume(mac, volume)
  )

  ipcMain.handle(IPC.AIP.STOP_AUDIO, (_e, mac: string) =>
    aipDevices.stopAudio(mac)
  )

  // ── AIP — Device configuration ───────────────────────────────────────────
  ipcMain.handle(IPC.AIP.CHANGE_BUTTON_COLOR, (_e, mac: string, r: number, g: number, b: number) =>
    aipDevices.changeButtonColor(mac, r, g, b)
  )

  ipcMain.handle(IPC.AIP.REQUEST_SIP_CONFIG, (_e, mac: string) =>
    aipDevices.requestSIPConfig(mac)
  )

  ipcMain.handle(IPC.AIP.CHANGE_SIP_CONFIG, (_e, mac: string, config: AipSipConfigWrite) =>
    aipDevices.changeSIPConfig(mac, config)
  )

  ipcMain.handle(IPC.AIP.REQUEST_SOUND_METER_CONFIG, (_e, mac: string) =>
    aipDevices.requestSoundMeterConfig(mac)
  )

  ipcMain.handle(IPC.AIP.CHANGE_SOUND_METER_CONFIG, (_e, mac: string, config: AipSoundMeterConfig) =>
    aipDevices.changeSoundMeterConfig(mac, config)
  )

  ipcMain.handle(IPC.AIP.CHANGE_SOUND_METER_SETTING, (_e, mac: string, config: AipSoundMeterConfig) =>
    aipDevices.changeSoundMeterSetting(mac, config)
  )

  ipcMain.handle(IPC.AIP.CHANGE_NETWORK_CONFIG, (_e, mac: string, config: AipDeviceNetworkConfig) =>
    aipDevices.changeNetworkConfig(mac, config)
  )

  ipcMain.handle(IPC.AIP.CHANGE_SENSOR_RELAY_CONFIG, (_e, mac: string, config: AipSensorRelayConfig) =>
    aipDevices.changeSensorRelayConfig(mac, config)
  )

  ipcMain.handle(IPC.AIP.CHANGE_STARTUP_MODE, (_e, mac: string, mode: number) =>
    aipDevices.changeStartupMode(mac, mode)
  )

  // ── AIP — Channels ───────────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.CREATE_CHANNEL, (_e, config: AipChannelConfig) =>
    aipChannels.createChannel(config)
  )

  ipcMain.handle(IPC.AIP.DESTROY_CHANNEL, (_e, id: number) =>
    aipChannels.destroyChannel(id)
  )

  ipcMain.handle(IPC.AIP.GET_CHANNEL, (_e, id: number) =>
    aipChannels.channel(id)
  )

  ipcMain.handle(IPC.AIP.GET_CHANNELS, () => aipChannels.channels())

  ipcMain.handle(IPC.AIP.GET_FOREIGN_CHANNELS, () => aipChannels.foreignChannels())

  ipcMain.handle(IPC.AIP.PLAY_CHANNEL,     (_e, id: number) => aipChannels.playChannel(id))
  ipcMain.handle(IPC.AIP.PAUSE_CHANNEL,    (_e, id: number) => aipChannels.pauseChannel(id))
  ipcMain.handle(IPC.AIP.STOP_CHANNEL,     (_e, id: number) => aipChannels.stopChannel(id))
  ipcMain.handle(IPC.AIP.NEXT_CHANNEL,     (_e, id: number) => aipChannels.nextChannel(id))
  ipcMain.handle(IPC.AIP.PREVIOUS_CHANNEL, (_e, id: number) => aipChannels.previousChannel(id))

  ipcMain.handle(IPC.AIP.SET_CHANNEL_VOLUME, (_e, id: number, volume: number) =>
    aipChannels.setChannelVolume(id, volume)
  )

  ipcMain.handle(IPC.AIP.LINK_CHANNEL_TO_DEVICE, (_e, channelId: number, deviceMac: string) =>
    aipChannels.linkChannelToDevice(channelId, deviceMac)
  )

  ipcMain.handle(
    IPC.AIP.LINK_NETWORK_CHANNEL_TO_DEVICE,
    (_e, channelMac: string, channelNumber: number, deviceMac: string) =>
      aipChannels.linkNetworkChannelToDevice(channelMac, channelNumber, deviceMac),
  )

  // ── AIP — Network channel repository ────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GET_NETWORK_CHANNELS,       () => aipChannels.getNetworkChannels())
  ipcMain.handle(IPC.AIP.GET_LOCAL_NETWORK_CHANNELS, () => aipChannels.getLocalNetworkChannels())

  ipcMain.handle(IPC.AIP.SAVE_NETWORK_CHANNEL, (_e, channel: AipNetworkChannel) =>
    aipChannels.saveNetworkChannel(channel)
  )

  ipcMain.handle(IPC.AIP.REMOVE_NETWORK_CHANNEL, (_e, mac: string) =>
    aipChannels.removeNetworkChannel(mac)
  )

  ipcMain.handle(IPC.AIP.REMOVE_NETWORK_CHANNEL_BY_KEY, (_e, mac: string, channelNumber: number) =>
    aipChannels.removeNetworkChannelByKey(mac, channelNumber)
  )

  ipcMain.handle(IPC.AIP.REQUEST_ALL_STREAMS, () => aipChannels.requestAllStreams())

  // ── AIP — SIP extension repository ──────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GET_SIP_EXTENSIONS, () => aipWebserver.getSipExtensions())

  ipcMain.handle(IPC.AIP.SAVE_SIP_EXTENSION, (_e, ext: AipSipExtension) =>
    aipWebserver.saveSipExtension(ext)
  )

  ipcMain.handle(IPC.AIP.REMOVE_SIP_EXTENSION, (_e, mac: string) =>
    aipWebserver.removeSipExtension(mac)
  )

  // ── AIP — SIP conference repository ─────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GET_SIP_CONFERENCES, () => aipWebserver.getSipConferences())

  ipcMain.handle(IPC.AIP.GET_SIP_CONFERENCES_FOR_DEVICE, (_e, mac: string) =>
    aipWebserver.getSipConferencesForDevice(mac)
  )

  ipcMain.handle(IPC.AIP.SAVE_SIP_CONFERENCE, (_e, conf: AipSipConference) =>
    aipWebserver.saveSipConference(conf)
  )

  ipcMain.handle(IPC.AIP.REMOVE_SIP_CONFERENCE, (_e, mac: string, conferenceId: number) =>
    aipWebserver.removeSipConference(mac, conferenceId)
  )

  ipcMain.handle(IPC.AIP.REMOVE_SIP_CONFERENCES_FOR_DEVICE, (_e, mac: string) =>
    aipWebserver.removeSipConferencesForDevice(mac)
  )

  // ── AIP — SIP device commands ────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.ADD_SIP_EXTENSION, (_e, mac: string, creds: AipSipExtensionCredentials) =>
    aipWebserver.addSipExtension(mac, creds)
  )

  ipcMain.handle(IPC.AIP.DELETE_SIP_EXTENSION, (_e, mac: string, creds: AipSipExtensionCredentials) =>
    aipWebserver.deleteSipExtension(mac, creds)
  )

  ipcMain.handle(IPC.AIP.CREATE_SIP_CONFERENCE, (_e, mac: string, conf: AipSipConference) =>
    aipWebserver.createSipConference(mac, conf)
  )

  ipcMain.handle(
    IPC.AIP.ADD_SIP_CONFERENCE_USER,
    (_e, mac: string, participant: AipSipConferenceParticipant) =>
      aipWebserver.addSipConferenceUser(mac, participant)
  )

  // ── AIP — Gate web config repository ────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GET_GATE_WEB_CONFIGS, () => aipWebserver.getGateWebConfigs())

  ipcMain.handle(IPC.AIP.SAVE_GATE_WEB_CONFIG, (_e, config: AipGateWebConfig) =>
    aipWebserver.saveGateWebConfig(config)
  )

  ipcMain.handle(IPC.AIP.REMOVE_GATE_WEB_CONFIG, (_e, mac: string) =>
    aipWebserver.removeGateWebConfig(mac)
  )

  // ── AIP — Audio file repository ──────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GET_AUDIO_FILES, () => aipWebserver.getAudioFiles())

  ipcMain.handle(IPC.AIP.GET_AUDIO_FILES_FOR_DEVICE, (_e, mac: string, audioType?: number) =>
    aipWebserver.getAudioFilesForDevice(mac, audioType)
  )

  ipcMain.handle(IPC.AIP.REMOVE_AUDIO_FILE, (_e, mac: string, fileId: number) =>
    aipWebserver.removeAudioFile(mac, fileId)
  )

  ipcMain.handle(IPC.AIP.REMOVE_AUDIO_FILES_FOR_DEVICE, (_e, mac: string) =>
    aipWebserver.removeAudioFilesForDevice(mac)
  )

  // ── AIP — File transfer ──────────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.ENQUEUE_FILE_TRANSFER, (_e, request: AipFileTransferRequest) =>
    aipWebserver.enqueueFileTransfer(request)
  )

  ipcMain.handle(IPC.AIP.CANCEL_FILE_TRANSFER, () => aipWebserver.cancelFileTransfer())

  // ── AIP — Gate filesystem ────────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GATE_FETCH_FILES, (_e, mac: string, config: AipGateConnectionConfig) =>
    aipWebserver.gateFetchFiles(mac, config)
  )

  ipcMain.handle(IPC.AIP.GATE_FETCH_FOLDERS, (_e, mac: string, config: AipGateConnectionConfig) =>
    aipWebserver.gateFetchFolders(mac, config)
  )

  ipcMain.handle(IPC.AIP.GATE_GET_FILES, (_e, mac: string) =>
    aipWebserver.gateGetFiles(mac)
  )

  ipcMain.handle(IPC.AIP.GATE_GET_FILES_BY_CAT, (_e, mac: string, category: string) =>
    aipWebserver.gateGetFilesByCategory(mac, category)
  )

  ipcMain.handle(IPC.AIP.GATE_GET_FOLDERS, (_e, mac: string) =>
    aipWebserver.gateGetFolders(mac)
  )

  ipcMain.handle(IPC.AIP.GATE_UPLOAD_FILE,
    (_e, mac: string, config: AipGateConnectionConfig, localPath: string, category: string, folder?: string) =>
      aipWebserver.gateUploadFile(mac, config, localPath, category, folder)
  )

  ipcMain.handle(IPC.AIP.GATE_DOWNLOAD_FILE,
    (_e, mac: string, config: AipGateConnectionConfig, fileId: string, localPath: string) =>
      aipWebserver.gateDownloadFile(mac, config, fileId, localPath)
  )

  ipcMain.handle(IPC.AIP.GATE_DELETE_FILE,
    (_e, mac: string, config: AipGateConnectionConfig, fileId: string) =>
      aipWebserver.gateDeleteFile(mac, config, fileId)
  )

  ipcMain.handle(IPC.AIP.GATE_CREATE_FOLDER,
    (_e, mac: string, config: AipGateConnectionConfig, name: string, category: string) =>
      aipWebserver.gateCreateFolder(mac, config, name, category)
  )

  ipcMain.handle(IPC.AIP.GATE_DELETE_FOLDER,
    (_e, mac: string, config: AipGateConnectionConfig, name: string, category: string) =>
      aipWebserver.gateDeleteFolder(mac, config, name, category)
  )

  ipcMain.handle(IPC.AIP.GATE_RENAME_FOLDER,
    (_e, mac: string, config: AipGateConnectionConfig, name: string, newName: string, category: string) =>
      aipWebserver.gateRenameFolder(mac, config, name, newName, category)
  )

  // ── AIP — Gate channel players ────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GATE_FETCH_CHANNEL_PLAYERS,
    (_e, mac: string, config: AipGateConnectionConfig) =>
      aipWebserver.gateFetchChannelPlayers(mac, config)
  )

  ipcMain.handle(IPC.AIP.GATE_GET_CHANNEL_PLAYERS, (_e, mac: string) =>
    aipWebserver.gateGetChannelPlayers(mac)
  )

  ipcMain.handle(IPC.AIP.GATE_ACTIVATE_CHANNEL_PLAYER,
    (_e, mac: string, config: AipGateConnectionConfig, name: string, source: string) =>
      aipWebserver.gateActivateChannelPlayer(mac, config, name, source)
  )

  ipcMain.handle(IPC.AIP.GATE_DEACTIVATE_CHANNEL_PLAYER,
    (_e, mac: string, config: AipGateConnectionConfig, playerId: string) =>
      aipWebserver.gateDeactivateChannelPlayer(mac, config, playerId)
  )

  // ── AIP — Gate scenes ─────────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GATE_FETCH_SCENES,
    (_e, mac: string, config: AipGateConnectionConfig) =>
      aipWebserver.gateFetchScenes(mac, config)
  )

  ipcMain.handle(IPC.AIP.GATE_GET_SCENES, (_e, mac: string) =>
    aipWebserver.gateGetScenes(mac)
  )

  ipcMain.handle(IPC.AIP.GATE_CREATE_SCENE,
    (_e, mac: string, config: AipGateConnectionConfig, scene: object) =>
      aipWebserver.gateCreateScene(mac, config, scene)
  )

  ipcMain.handle(IPC.AIP.GATE_UPDATE_SCENE,
    (_e, mac: string, config: AipGateConnectionConfig, sceneId: string, scene: object) =>
      aipWebserver.gateUpdateScene(mac, config, sceneId, scene)
  )

  ipcMain.handle(IPC.AIP.GATE_DELETE_SCENE,
    (_e, mac: string, config: AipGateConnectionConfig, sceneId: string) =>
      aipWebserver.gateDeleteScene(mac, config, sceneId)
  )

  // ── AIP — Gate schedules ──────────────────────────────────────────────────
  ipcMain.handle(IPC.AIP.GATE_FETCH_SCHEDULES,
    (_e, mac: string, config: AipGateConnectionConfig) =>
      aipWebserver.gateFetchSchedules(mac, config)
  )

  ipcMain.handle(IPC.AIP.GATE_GET_SCHEDULES, (_e, mac: string) =>
    aipWebserver.gateGetSchedules(mac)
  )

  ipcMain.handle(IPC.AIP.GATE_CREATE_SCHEDULE,
    (_e, mac: string, config: AipGateConnectionConfig, schedule: object) =>
      aipWebserver.gateCreateSchedule(mac, config, schedule)
  )

  ipcMain.handle(IPC.AIP.GATE_UPDATE_SCHEDULE,
    (_e, mac: string, config: AipGateConnectionConfig, scheduleId: string, schedule: object) =>
      aipWebserver.gateUpdateSchedule(mac, config, scheduleId, schedule)
  )

  ipcMain.handle(IPC.AIP.GATE_DELETE_SCHEDULE,
    (_e, mac: string, config: AipGateConnectionConfig, scheduleId: string) =>
      aipWebserver.gateDeleteSchedule(mac, config, scheduleId)
  )

  ipcMain.handle(IPC.AIP.GATE_CANCEL_SCHEDULE,
    (_e, mac: string, config: AipGateConnectionConfig, scheduleId: string) =>
      aipWebserver.gateCancelSchedule(mac, config, scheduleId)
  )

  // ── Calendar — backed by schedulerManager.db.messages ────────────────────

  ipcMain.handle(IPC.CALENDAR.LIST, () =>
    schedulerManager.db.messages.list()
  )

  ipcMain.handle(IPC.CALENDAR.GET, (_e, id: string) =>
    schedulerManager.db.messages.get(id)
  )

  ipcMain.handle(IPC.CALENDAR.CREATE, async (_e, payload: CalendarCreatePayload) => {
    const msg = await schedulerManager.db.messages.create(payload.event)
    void schedulerManager.reload()
    return msg
  })

  ipcMain.handle(IPC.CALENDAR.UPDATE, async (_e, payload: CalendarUpdatePayload) => {
    const msg = await schedulerManager.db.messages.update(payload.id, payload.changes)
    if (msg) void schedulerManager.reload()
    return msg
  })

  ipcMain.handle(IPC.CALENDAR.DELETE, async (_e, id: string) => {
    const removed = await schedulerManager.db.messages.delete(id)
    if (removed) void schedulerManager.reload()
    return { removed }
  })

  ipcMain.handle(IPC.CALENDAR.TOGGLE, async (_e, payload: CalendarTogglePayload) => {
    const msg = await schedulerManager.db.messages.toggle(payload.id, payload.enabled)
    if (msg) void schedulerManager.reload()
    return msg
  })

  ipcMain.handle(IPC.CALENDAR.TRIGGER, (_e, id: string) =>
    schedulerManager.triggerNow(id)
  )

  // ── Scene — backed by schedulerManager.db.scenes ──────────────────────────

  ipcMain.handle(IPC.SCENE.LIST, () =>
    schedulerManager.db.scenes.list()
  )

  ipcMain.handle(IPC.SCENE.GET, (_e, id: string) =>
    schedulerManager.db.scenes.get(id)
  )

  ipcMain.handle(IPC.SCENE.CREATE, (_e, payload: SceneCreatePayload) =>
    schedulerManager.db.scenes.create(payload.scene)
  )

  ipcMain.handle(IPC.SCENE.UPDATE, (_e, payload: SceneUpdatePayload) =>
    schedulerManager.db.scenes.update(payload.id, payload.changes)
  )

  ipcMain.handle(IPC.SCENE.DELETE, async (_e, id: string) => {
    const removed = await schedulerManager.db.scenes.delete(id)
    return { removed }
  })

  ipcMain.handle(IPC.SCENE.TRIGGER, (_e, id: string) =>
    schedulerManager.triggerScene(id)
  )

  // ── Stream — backed by schedulerManager.db.streams ────────────────────────

  ipcMain.handle(IPC.STREAM.LIST, () =>
    schedulerManager.db.streams.list()
  )

  ipcMain.handle(IPC.STREAM.GET, (_e, id: string) =>
    schedulerManager.db.streams.get(id)
  )

  ipcMain.handle(IPC.STREAM.CREATE, (_e, payload: StreamCreatePayload) =>
    schedulerManager.db.streams.create(payload.stream)
  )

  ipcMain.handle(IPC.STREAM.UPDATE, (_e, payload: StreamUpdatePayload) =>
    schedulerManager.db.streams.update(payload.id, payload.changes)
  )

  ipcMain.handle(IPC.STREAM.DELETE, async (_e, id: string) => {
    const removed = await schedulerManager.db.streams.delete(id)
    return { removed }
  })

  ipcMain.handle(IPC.STREAM.VALIDATE, (_e, url: string): Promise<{ ok: boolean; message: string }> => {
    return new Promise((resolve) => {
      const mod = url.startsWith('https') ? https : http
      try {
        const req = mod.request(url, { method: 'GET', timeout: 8000 }, (res) => {
          const status = res.statusCode ?? 0
          const ct = (res.headers['content-type'] ?? '').toLowerCase()
          res.destroy()
          req.destroy()
          if (status >= 200 && status < 400) {
            const typeLabel = ct ? ` · ${ct.split(';')[0].trim()}` : ''
            resolve({ ok: true, message: `HTTP ${status}${typeLabel}` })
          } else {
            resolve({ ok: false, message: `Server returned HTTP ${status}` })
          }
        })
        req.on('error', (err: Error) => resolve({ ok: false, message: err.message }))
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, message: 'Connection timeout (8 s)' }) })
        req.end()
      } catch (e) {
        resolve({ ok: false, message: String(e) })
      }
    })
  })

  // ── AudioChannel — persistent channel storage ────────────────────────────

  ipcMain.handle(IPC.CHANNEL.LIST, () =>
    schedulerManager.db.channels.list()
  )

  ipcMain.handle(IPC.CHANNEL.GET, (_e, id: number) =>
    schedulerManager.db.channels.get(id)
  )

  ipcMain.handle(IPC.CHANNEL.CREATE, (_e, data: import('../shared/audioChannel').NewAudioChannel) =>
    schedulerManager.db.channels.create({
      name:                 data.name,
      audioSource:          data.audioSource,
      quality:              data.quality,
      isMono:               data.isMono,
      loopAll:              data.loopAll,
      shuffle:              data.shuffle,
      startWhenCreated:     data.startWhenCreated,
      restoreDeviceList:    data.restoreDeviceList,
      restorePlaybackState: data.restorePlaybackState,
      sources:              data.sources.map((s) => ({ path: s.path })),
      devices:              data.devices.map((d) => ({ mac: d.mac })),
    })
  )

  ipcMain.handle(IPC.CHANNEL.UPDATE, (_e, id: number, changes: import('../shared/audioChannel').UpdateAudioChannel) =>
    schedulerManager.db.channels.update(id, changes)
  )

  ipcMain.handle(IPC.CHANNEL.DELETE, async (_e, id: number) => {
    const removed = await schedulerManager.db.channels.delete(id)
    return { removed }
  })

  ipcMain.handle(IPC.CHANNEL.ADD_SOURCE, (_e, channelId: number, path: string) =>
    schedulerManager.db.channels.addSource(channelId, path)
  )

  ipcMain.handle(IPC.CHANNEL.REMOVE_SOURCE, async (_e, id: number) => {
    const removed = await schedulerManager.db.channels.removeSource(id)
    return { removed }
  })

  ipcMain.handle(IPC.CHANNEL.ADD_DEVICE, (_e, channelId: number, mac: string) =>
    schedulerManager.db.channels.addDevice(channelId, mac)
  )

  ipcMain.handle(IPC.CHANNEL.REMOVE_DEVICE, async (_e, id: number) => {
    const removed = await schedulerManager.db.channels.removeDevice(id)
    return { removed }
  })

  // ── AppSettings — application preferences ────────────────────────────────

  ipcMain.handle(IPC.SETTINGS.GET, () =>
    schedulerManager.db.settings.get()
  )

  ipcMain.handle(IPC.SETTINGS.SAVE, async (_e, changes: import('../shared/settings').UpdateAppSettings) => {
    const saved = await schedulerManager.db.settings.save(changes)
    // Apply side-effects immediately
    app.setLoginItemSettings({ openAtLogin: saved.bootOnStartup })
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (saved.minimizeToTray) ensureTray(win)
      else destroyTray()
    }
    return saved
  })

  // ── Window exit auth ──────────────────────────────────────────────────────

  ipcMain.handle(IPC.WINDOW.CONFIRM_EXIT, () => {
    setExitConfirmed()
    BrowserWindow.getAllWindows().forEach((w) => w.close())
  })
}
