import os from 'os'
import { BrowserWindow } from 'electron'
import { AipClient } from 'aip-client'
import { IPC } from '../../shared/ipc'
import type { AipNetworkInterface } from '../../shared/ipc'

/**
 * Owns the AipClient connection and bridges push events to all renderer windows.
 *
 * Lifecycle (initialize/shutdown) is managed by DaemonManager — this class
 * only manages the WebSocket connection to the already-running daemon.
 */
export class AipCore {
  readonly client: AipClient

  constructor() {
    this.client = new AipClient({ url: 'ws://127.0.0.1:9000' })

    this.client.setOnDeviceEvent((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.DEVICE_EVENT, json)
      }
    })

    this.client.setOnChannelEvent((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.CHANNEL_EVENT, json)
      }
    })

    this.client.setOnNetworkChannelEvent((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.NETWORK_CHANNEL_EVENT, json)
      }
    })

    this.client.setOnSipConfigChanged((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.SIP_CONFIG_EVENT, json)
      }
    })

    this.client.setOnSoundMeterConfigChanged((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.SOUND_METER_CONFIG_EVENT, json)
      }
    })

    this.client.setOnFileTransferProgress((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.FILE_TRANSFER_PROGRESS, json)
      }
    })

    this.client.setOnFileTransferCompleted((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.FILE_TRANSFER_COMPLETED, json)
      }
    })

    this.client.setOnGateFilesUpdated((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.GATE_FILES_UPDATED, json)
      }
    })

    this.client.setOnGateFoldersUpdated((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.GATE_FOLDERS_UPDATED, json)
      }
    })

    this.client.setOnGateOperationError((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.GATE_OPERATION_ERROR, json)
      }
    })

    this.client.setOnGateOperationCompleted((json: string) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed())
          win.webContents.send(IPC.AIP.GATE_OPERATION_COMPLETED, json)
      }
    })

    this.client.connect()
  }

  /** Returns local IPv4 interfaces for the user to pick from. */
  getNetworkInterfaces(): AipNetworkInterface[] {
    const result: AipNetworkInterface[] = []
    const ifaces = os.networkInterfaces()
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (!addrs) continue
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal)
          result.push({ name, address: addr.address })
      }
    }
    return result
  }

  disconnect(): void {
    this.client.disconnect()
  }
}
