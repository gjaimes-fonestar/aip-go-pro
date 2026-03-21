import type { AipCore } from './core'
import type { AipChannelConfig, AipChannelInfo, AipForeignChannelInfo } from '../../shared/ipc'

/**
 * Channel lifecycle, playback control and device linking.
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
}
