import { ipcMain, dialog, app, BrowserWindow } from 'electron'
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
} from '../shared/ipc'
import type {
  CalendarEvent,
  CalendarCreatePayload,
  CalendarUpdatePayload,
  CalendarTogglePayload,
} from '../shared/calendar'
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

  // Calendar — in-memory mock store

  const now = new Date()
  const iso = (d: Date): string => d.toISOString()
  const daysFromNow = (n: number): Date => new Date(now.getTime() + n * 86_400_000)
  const todayAt = (h: number, m = 0): string => {
    const d = new Date(now)
    d.setHours(h, m, 0, 0)
    return iso(d)
  }
  const todayAtEnd = (h: number, m = 0): string => {
    const d = new Date(now)
    d.setHours(h, m, 0, 0)
    return iso(d)
  }

  const mockEvents: CalendarEvent[] = [
    {
      id: 'evt-001',
      title: 'Morning Background Music',
      description: 'Lobby BGM — starts at opening time every weekday.',
      color: '#6366f1',
      dtStart: todayAt(8, 0),
      dtEnd: todayAtEnd(12, 0),
      recurrence: {
        freq: 'weekly',
        interval: 1,
        byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
        end: { type: 'never' },
      },
      action: { type: 'playlist', playlistId: 'pl-lobby-bgm', playlistName: 'Lobby Morning' },
      volume: 60,
      targetDevices: [],
      enabled: true,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: 'evt-002',
      title: 'Fire Drill Announcement',
      description: 'Monthly fire drill reminder message.',
      color: '#ef4444',
      dtStart: iso(daysFromNow(3)),
      dtEnd: iso(new Date(daysFromNow(3).getTime() + 5 * 60_000)),
      recurrence: {
        freq: 'monthly',
        interval: 1,
        byMonthDay: new Date(daysFromNow(3)).getDate(),
        end: { type: 'never' },
      },
      action: { type: 'file', filePath: '/messages/fire-drill.wav', fileName: 'Fire Drill' },
      volume: 100,
      targetDevices: ['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:02'],
      enabled: true,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: 'evt-003',
      title: 'Online Radio Stream',
      description: 'Afternoon radio stream in the cafeteria.',
      color: '#10b981',
      dtStart: todayAt(13, 0),
      dtEnd: todayAtEnd(17, 0),
      recurrence: {
        freq: 'weekly',
        interval: 1,
        byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
        end: { type: 'never' },
      },
      action: { type: 'online', streamUrl: 'http://stream.example.com/radio', streamName: 'Office Radio' },
      volume: 50,
      targetDevices: [],
      enabled: true,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: 'evt-004',
      title: 'Close-of-Day Scene',
      description: 'Activates the "End of Business" scene at 18:00.',
      color: '#f59e0b',
      dtStart: todayAt(18, 0),
      recurrence: {
        freq: 'weekly',
        interval: 1,
        byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
        end: { type: 'never' },
      },
      action: { type: 'scene', sceneId: 'scene-eob', sceneName: 'End of Business' },
      targetDevices: [],
      enabled: true,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: 'evt-005',
      title: 'Saturday Maintenance Window',
      description: 'Weekly maintenance announcement on Saturdays.',
      color: '#8b5cf6',
      dtStart: (() => { const d = new Date(daysFromNow(6)); d.setHours(9, 0, 0, 0); return iso(d) })(),
      dtEnd: (() => { const d = new Date(daysFromNow(6)); d.setHours(10, 0, 0, 0); return iso(d) })(),
      recurrence: {
        freq: 'weekly',
        interval: 1,
        byDay: ['SA'],
        end: { type: 'count', count: 8 },
      },
      action: { type: 'file', filePath: '/messages/maintenance.wav', fileName: 'Maintenance Notice' },
      volume: 75,
      targetDevices: [],
      enabled: false,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    {
      id: 'evt-006',
      title: 'Hourly Time Chime',
      description: 'Short chime every hour during business hours.',
      color: '#14b8a6',
      dtStart: todayAt(8, 0),
      dtEnd: todayAtEnd(8, 10),
      recurrence: {
        freq: 'hourly',
        interval: 1,
        end: { type: 'never' },
        window: { from: '08:00', to: '18:00' },
      },
      action: { type: 'file', filePath: '/sounds/chime.wav', fileName: 'Hourly Chime' },
      volume: 40,
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
}
