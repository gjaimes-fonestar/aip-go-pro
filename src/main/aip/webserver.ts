import type { AipCore } from './core'
import type {
  AipSipExtension,
  AipSipConference,
  AipSipExtensionCredentials,
  AipSipConferenceParticipant,
  AipGateWebConfig,
  AipFileTransferRequest,
  AipAudioFile,
} from '../../shared/ipc'

/**
 * Delegates Gate / Webserver operations to the AipClient.
 * Mirrors the pattern of AipDevices and AipChannels.
 */
export class AipWebserver {
  constructor(private readonly core: AipCore) {}

  // SIP extension repository

  async getSipExtensions(): Promise<AipSipExtension[]> {
    try {
      return (await this.core.client.getSipExtensions()) as AipSipExtension[]
    } catch {
      return []
    }
  }

  async saveSipExtension(ext: AipSipExtension): Promise<void> {
    await this.core.client.saveSipExtension(ext)
  }

  async removeSipExtension(mac: string): Promise<{ removed: boolean }> {
    try {
      return (await this.core.client.removeSipExtension(mac)) as { removed: boolean }
    } catch {
      return { removed: false }
    }
  }

  // SIP conference repository

  async getSipConferences(): Promise<AipSipConference[]> {
    try {
      return (await this.core.client.getSipConferences()) as AipSipConference[]
    } catch {
      return []
    }
  }

  async getSipConferencesForDevice(mac: string): Promise<AipSipConference[]> {
    try {
      return (await this.core.client.getSipConferencesForDevice(mac)) as AipSipConference[]
    } catch {
      return []
    }
  }

  async saveSipConference(conf: AipSipConference): Promise<void> {
    await this.core.client.saveSipConference(conf)
  }

  async removeSipConference(mac: string, conferenceId: number): Promise<{ removed: boolean }> {
    try {
      return (await this.core.client.removeSipConference(mac, conferenceId)) as { removed: boolean }
    } catch {
      return { removed: false }
    }
  }

  async removeSipConferencesForDevice(mac: string): Promise<{ removed: number }> {
    try {
      return (await this.core.client.removeSipConferencesForDevice(mac)) as { removed: number }
    } catch {
      return { removed: 0 }
    }
  }

  // SIP device commands

  async addSipExtension(mac: string, credentials: AipSipExtensionCredentials): Promise<void> {
    await this.core.client.addSipExtension(mac, credentials)
  }

  async deleteSipExtension(mac: string, credentials: AipSipExtensionCredentials): Promise<void> {
    await this.core.client.deleteSipExtension(mac, credentials)
  }

  async createSipConference(mac: string, conf: AipSipConference): Promise<void> {
    await this.core.client.createSipConference(mac, conf)
  }

  async addSipConferenceUser(mac: string, participant: AipSipConferenceParticipant): Promise<void> {
    await this.core.client.addSipConferenceUser(mac, participant)
  }

  // Gate web config repository

  async getGateWebConfigs(): Promise<AipGateWebConfig[]> {
    try {
      return (await this.core.client.getGateWebConfigs()) as AipGateWebConfig[]
    } catch {
      return []
    }
  }

  async saveGateWebConfig(config: AipGateWebConfig): Promise<void> {
    await this.core.client.saveGateWebConfig(config)
  }

  async removeGateWebConfig(mac: string): Promise<{ removed: boolean }> {
    try {
      return (await this.core.client.removeGateWebConfig(mac)) as { removed: boolean }
    } catch {
      return { removed: false }
    }
  }

  // Audio file repository

  async getAudioFiles(): Promise<AipAudioFile[]> {
    try {
      return (await this.core.client.getAudioFiles()) as AipAudioFile[]
    } catch {
      return []
    }
  }

  async getAudioFilesForDevice(mac: string, audioType?: number): Promise<AipAudioFile[]> {
    try {
      return (await this.core.client.getAudioFilesForDevice(mac, audioType)) as AipAudioFile[]
    } catch {
      return []
    }
  }

  async removeAudioFile(mac: string, fileId: number): Promise<{ removed: boolean }> {
    try {
      return (await this.core.client.removeAudioFile(mac, fileId)) as { removed: boolean }
    } catch {
      return { removed: false }
    }
  }

  async removeAudioFilesForDevice(mac: string): Promise<{ removed: number }> {
    try {
      return (await this.core.client.removeAudioFilesForDevice(mac)) as { removed: number }
    } catch {
      return { removed: 0 }
    }
  }

  // File transfer

  async enqueueFileTransfer(request: AipFileTransferRequest): Promise<void> {
    await this.core.client.enqueueFileTransfer(request)
  }

  async cancelFileTransfer(): Promise<void> {
    await this.core.client.cancelFileTransfer()
  }
}
