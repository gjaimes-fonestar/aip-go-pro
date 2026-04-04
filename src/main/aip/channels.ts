import type { AipCore } from './core'
import type {
  AipChannelConfig,
  AipChannelInfo,
  AipForeignChannelInfo,
  AipNetworkChannel,
} from '../../shared/ipc'

/**
 * Channel lifecycle, playback control, device linking, and network channel repository.
 * Delegates to the AipClient held by AipCore.
 */
export class AipChannels {
  constructor(private readonly core: AipCore) {}

  // Lifecycle

  async createChannel(config: AipChannelConfig): Promise<number> {
    return this.core.client.createChannel(config)
  }

  async destroyChannel(id: number): Promise<void> {
    return this.core.client.destroyChannel(id)
  }

  // Queries

  async channel(id: number): Promise<AipChannelInfo | null> {
    return this.core.client.getChannel(id) as Promise<AipChannelInfo | null>
  }

  async channels(): Promise<AipChannelInfo[]> {
    return this.core.client.getChannels() as Promise<AipChannelInfo[]>
  }

  async foreignChannels(): Promise<AipForeignChannelInfo[]> {
    return this.core.client.getForeignChannels() as Promise<AipForeignChannelInfo[]>
  }

  // Playback control

  async playChannel(id: number): Promise<void>     { return this.core.client.playChannel(id) }
  async pauseChannel(id: number): Promise<void>    { return this.core.client.pauseChannel(id) }
  async stopChannel(id: number): Promise<void>     { return this.core.client.stopChannel(id) }
  async nextChannel(id: number): Promise<void>     { return this.core.client.nextChannel(id) }
  async previousChannel(id: number): Promise<void> { return this.core.client.previousChannel(id) }

  async setChannelVolume(id: number, volume: number): Promise<void> {
    return this.core.client.setChannelVolume(id, volume)
  }

  // Device linking

  async linkChannelToDevice(channelId: number, deviceMac: string): Promise<void> {
    return this.core.client.linkChannelToDevice(channelId, deviceMac)
  }

  async linkNetworkChannelToDevice(
    channelMac: string,
    channelNumber: number,
    deviceMac: string,
  ): Promise<void> {
    return this.core.client.linkNetworkChannelToDevice(channelMac, channelNumber, deviceMac)
  }

  // Network channel repository

  async getNetworkChannels(): Promise<AipNetworkChannel[]> {
    try {
      return (await this.core.client.getNetworkChannels()) as AipNetworkChannel[]
    } catch {
      return []
    }
  }

  async getLocalNetworkChannels(): Promise<AipNetworkChannel[]> {
    try {
      return (await this.core.client.getLocalNetworkChannels()) as AipNetworkChannel[]
    } catch {
      return []
    }
  }

  async saveNetworkChannel(channel: AipNetworkChannel): Promise<void> {
    return this.core.client.saveNetworkChannel(channel)
  }

  async removeNetworkChannel(mac: string): Promise<{ removed: boolean }> {
    return this.core.client.removeNetworkChannel(mac)
  }

  async removeNetworkChannelByKey(mac: string, channelNumber: number): Promise<{ removed: boolean }> {
    return this.core.client.removeNetworkChannelByKey(mac, channelNumber)
  }

  async requestAllStreams(): Promise<void> {
    return this.core.client.requestAllStreams()
  }
}
