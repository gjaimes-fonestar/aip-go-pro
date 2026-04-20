import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import http from 'http'
import https from 'https'
import { IPC } from '../shared/ipc'
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
  CalendarEvent,
  CalendarCreatePayload,
  CalendarUpdatePayload,
  CalendarTogglePayload,
} from '../shared/calendar'
import type { Scene, SceneCreatePayload, SceneUpdatePayload } from '../shared/scene'
import type { Stream, StreamCreatePayload, StreamUpdatePayload } from '../shared/stream'
import { backendManager } from './backend'
import { daemonManager } from './daemon'
import { aipCore, aipDevices, aipChannels, aipWebserver } from './aip'

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

  // Calendar + Scene — in-memory mock stores

  const now = new Date()
  const iso = (d: Date): string => d.toISOString()
  const todayAt = (h: number, m = 0): string => {
    const d = new Date(now); d.setHours(h, m, 0, 0); return iso(d)
  }
  const todayEnd = (h: number, m = 0): string => {
    const d = new Date(now); d.setHours(h, m, 0, 0); return iso(d)
  }

  const mockEvents: CalendarEvent[] = [
    {
      id: 'evt-001',
      title: 'Morning BGM',
      description: 'Lobby background music on weekday mornings.',
      color: '#6366f1',
      dtStart: todayAt(8, 0),
      dtEnd: todayEnd(12, 0),
      recurrence: { freq: 'weekly', interval: 1, byDay: ['MO', 'TU', 'WE', 'TH', 'FR'], end: { type: 'never' } },
      action: { type: 'playlist', filePaths: ['/audio/lobby-01.mp3', '/audio/lobby-02.mp3'] },
      volume: 60,
      targetDevices: [],
      enabled: true,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: 'evt-002',
      title: 'End of Business',
      description: 'Activate EOB scene at close of day.',
      color: '#f59e0b',
      dtStart: todayAt(18, 0),
      dtEnd: todayEnd(18, 1),
      recurrence: { freq: 'weekly', interval: 1, byDay: ['MO', 'TU', 'WE', 'TH', 'FR'], end: { type: 'never' } },
      action: { type: 'scene', sceneId: 'scene-001', sceneName: 'End of Business' },
      targetDevices: [],
      enabled: true,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
  ]

  const calendarStore = new Map<string, CalendarEvent>(mockEvents.map((e) => [e.id, e]))

  ipcMain.handle(IPC.CALENDAR.LIST, () => {
    const events = Array.from(calendarStore.values())
    console.log('[calendar:list]', events.length, 'events')
    return events
  })

  ipcMain.handle(IPC.CALENDAR.GET, (_e, id: string) => {
    const event = calendarStore.get(id) ?? null
    console.log('[calendar:get]', id, event ? 'found' : 'not found')
    return event
  })

  ipcMain.handle(IPC.CALENDAR.CREATE, (_e, payload: CalendarCreatePayload) => {
    const id = `evt-${Date.now()}`
    const ts = new Date().toISOString()
    const event: CalendarEvent = { id, ...payload.event, createdAt: ts, updatedAt: ts }
    calendarStore.set(id, event)
    console.log('[calendar:create]', event)
    return event
  })

  ipcMain.handle(IPC.CALENDAR.UPDATE, (_e, payload: CalendarUpdatePayload) => {
    const existing = calendarStore.get(payload.id)
    if (!existing) return null
    const updated: CalendarEvent = { ...existing, ...payload.changes, updatedAt: new Date().toISOString() }
    calendarStore.set(payload.id, updated)
    console.log('[calendar:update]', updated)
    return updated
  })

  ipcMain.handle(IPC.CALENDAR.DELETE, (_e, id: string) => {
    const removed = calendarStore.delete(id)
    console.log('[calendar:delete]', id, removed)
    return { removed }
  })

  ipcMain.handle(IPC.CALENDAR.TOGGLE, (_e, payload: CalendarTogglePayload) => {
    const existing = calendarStore.get(payload.id)
    if (!existing) return null
    const updated: CalendarEvent = { ...existing, enabled: payload.enabled, updatedAt: new Date().toISOString() }
    calendarStore.set(payload.id, updated)
    console.log('[calendar:toggle]', payload.id, payload.enabled)
    return updated
  })

  ipcMain.handle(IPC.CALENDAR.TRIGGER, (_e, id: string) => {
    const event = calendarStore.get(id)
    if (!event) return { fired: false }
    console.log('[calendar:trigger] manual fire:', event)
    return { fired: true, event }
  })

  // Scene — in-memory mock store

  const mockScenes: Scene[] = [
    {
      id: 'scene-001',
      name: 'End of Business',
      description: 'Fade out audio and lower volume at end of day.',
      steps: [
        { id: 'step-001-1', targetDevice: 'all', action: { type: 'fade_out', durationSecs: 10 } },
        { id: 'step-001-2', targetDevice: 'all', action: { type: 'set_volume', value: 30 } },
      ],
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: 'scene-002',
      name: 'Emergency Alert',
      description: 'Max volume and play the emergency announcement.',
      steps: [
        { id: 'step-002-1', targetDevice: 'all', action: { type: 'set_volume', value: 100 } },
        { id: 'step-002-2', targetDevice: 'all', action: { type: 'play_file', filePath: '/messages/emergency.wav', fileName: 'Emergency Alert', durationSecs: 60 } },
      ],
      createdAt: iso(now),
      updatedAt: iso(now),
    },
  ]

  const sceneStore = new Map<string, Scene>(mockScenes.map((s) => [s.id, s]))

  ipcMain.handle(IPC.SCENE.LIST, () => Array.from(sceneStore.values()))

  ipcMain.handle(IPC.SCENE.GET, (_e, id: string) => sceneStore.get(id) ?? null)

  ipcMain.handle(IPC.SCENE.CREATE, (_e, payload: SceneCreatePayload) => {
    const id = `scene-${Date.now()}`
    const ts = new Date().toISOString()
    const scene: Scene = { id, ...payload.scene, createdAt: ts, updatedAt: ts }
    sceneStore.set(id, scene)
    return scene
  })

  ipcMain.handle(IPC.SCENE.UPDATE, (_e, payload: SceneUpdatePayload) => {
    const existing = sceneStore.get(payload.id)
    if (!existing) return null
    const updated: Scene = { ...existing, ...payload.changes, updatedAt: new Date().toISOString() }
    sceneStore.set(payload.id, updated)
    return updated
  })

  ipcMain.handle(IPC.SCENE.DELETE, (_e, id: string) => {
    const removed = sceneStore.delete(id)
    return { removed }
  })

  ipcMain.handle(IPC.SCENE.TRIGGER, (_e, id: string) => {
    const scene = sceneStore.get(id)
    if (!scene) return { fired: false }
    console.log('[scene:trigger] activate:', scene.name, scene.steps.length, 'steps')
    return { fired: true }
  })

  // Stream handlers
  const mockStreams: Stream[] = [
    {
      id: 'stream-001',
      name: 'Radio Hits',
      url: 'https://ice1.somafm.com/groovesalad-128-mp3',
      description: 'SomaFM Groove Salad — ambient/downtempo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stream-002',
      name: 'Jazz FM',
      url: 'https://ice1.somafm.com/dronezone-128-mp3',
      description: 'SomaFM Drone Zone — atmospheric ambient',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stream-003',
      name: 'La Mega',
      url: 'https://stream.emisorasmusicales.net/listen/la_mega/lamega.mp3',
      description: 'La Mega — música urbana y tropical',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stream-004',
      name: 'Los 40 Venezuela',
      url: 'https://stream-175.zeno.fm/xc0q62tc9f0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ4YzBxNjJ0YzlmMHV2IiwiaG9zdCI6InN0cmVhbS0xNzUuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IkxIdzh3emtLU2lpcm1XR3NrMDM0QVEiLCJpYXQiOjE3NzYwMjA3OTAsImV4cCI6MTc3NjAyMDg1MH0.cyIBxLhEylEprcZPW1u0N66wWVPVderUKYjrlAJ3jlc',
      description: 'Los 40 Venezuela — los mejores éxitos',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  const streamStore = new Map<string, Stream>(mockStreams.map((s) => [s.id, s]))

  ipcMain.handle(IPC.STREAM.LIST, () => Array.from(streamStore.values()))

  ipcMain.handle(IPC.STREAM.GET, (_e, id: string) => streamStore.get(id) ?? null)

  ipcMain.handle(IPC.STREAM.CREATE, (_e, payload: StreamCreatePayload) => {
    const id = `stream-${Date.now()}`
    const ts = new Date().toISOString()
    const stream: Stream = { id, ...payload.stream, createdAt: ts, updatedAt: ts }
    streamStore.set(id, stream)
    return stream
  })

  ipcMain.handle(IPC.STREAM.UPDATE, (_e, payload: StreamUpdatePayload) => {
    const existing = streamStore.get(payload.id)
    if (!existing) return null
    const updated: Stream = { ...existing, ...payload.changes, id: existing.id, updatedAt: new Date().toISOString() }
    streamStore.set(payload.id, updated)
    return updated
  })

  ipcMain.handle(IPC.STREAM.DELETE, (_e, id: string) => {
    const removed = streamStore.delete(id)
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
}
