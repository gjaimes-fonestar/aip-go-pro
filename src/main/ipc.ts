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
}
