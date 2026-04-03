import { ipcMain, dialog, app } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  AipChannelConfig,
  AipSipConfigWrite,
  AipSoundMeterConfig,
  AipDeviceNetworkConfig,
  AipSensorRelayConfig,
} from '../shared/ipc'
import { backendManager } from './backend'
import { daemonManager } from './daemon'
import { aipCore, aipDevices, aipChannels } from './aip'

export function registerIpcHandlers(): void {
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
}
