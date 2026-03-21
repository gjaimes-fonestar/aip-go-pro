import type { AipCore } from './core'

/**
 * Device queries and audio commands.
 * Delegates to the AipClient held by AipCore.
 */
export class AipDevices {
  constructor(private readonly core: AipCore) {}

  // Queries

  async getDevicesJson(): Promise<string> {
    try {
      const devices = await this.core.client.getDevices()
      return JSON.stringify(devices)
    } catch {
      return '[]'
    }
  }

  async getDeviceByMacJson(mac: string): Promise<string> {
    try {
      const device = await this.core.client.getDevice(mac)
      return device ? JSON.stringify(device) : '{}'
    } catch {
      return '{}'
    }
  }

  // Mutations

  async setVolume(mac: string, volume: number): Promise<void> {
    await this.core.client.setVolume(mac, volume)
  }

  // Audio commands

  async stopAudio(mac: string): Promise<void> {
    await this.core.client.stopAudio(mac)
  }
}
