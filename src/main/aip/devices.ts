import type { AipCore } from './core'
import type {
  AipSipConfigWrite,
  AipSoundMeterConfig,
  AipDeviceNetworkConfig,
  AipSensorRelayConfig,
} from '../../shared/ipc'

/**
 * Device queries and audio/configuration commands.
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

  // Audio commands

  async setVolume(mac: string, volume: number): Promise<void> {
    await this.core.client.setVolume(mac, volume)
  }

  async stopAudio(mac: string): Promise<void> {
    await this.core.client.stopAudio(mac)
  }

  // Device configuration commands

  async changeButtonColor(mac: string, r: number, g: number, b: number): Promise<void> {
    await this.core.client.changeButtonColor(mac, r, g, b)
  }

  async requestSIPConfig(mac: string): Promise<void> {
    await this.core.client.requestSIPConfig(mac)
  }

  async changeSIPConfig(mac: string, config: AipSipConfigWrite): Promise<void> {
    await this.core.client.changeSIPConfig(mac, config)
  }

  async requestSoundMeterConfig(mac: string): Promise<void> {
    await this.core.client.requestSoundMeterConfig(mac)
  }

  async changeSoundMeterConfig(mac: string, config: AipSoundMeterConfig): Promise<void> {
    await this.core.client.changeSoundMeterConfig(mac, config)
  }

  async changeSoundMeterSetting(mac: string, config: AipSoundMeterConfig): Promise<void> {
    await this.core.client.changeSoundMeterSetting(mac, config)
  }

  async changeNetworkConfig(mac: string, config: AipDeviceNetworkConfig): Promise<void> {
    await this.core.client.changeNetworkConfig(mac, config)
  }

  async changeSensorRelayConfig(mac: string, config: AipSensorRelayConfig): Promise<void> {
    await this.core.client.changeSensorRelayConfig(mac, config)
  }

  async changeStartupMode(mac: string, mode: number): Promise<void> {
    await this.core.client.changeStartupMode(mac, mode)
  }
}
