import type { AipCore } from './core'
import type {
  AipSipExtension,
  AipSipConference,
  AipSipExtensionCredentials,
  AipSipConferenceParticipant,
  AipGateWebConfig,
  AipFileTransferRequest,
  AipAudioFile,
  AipGateConnectionConfig,
  AipGateRemoteFile,
  AipGateRemoteFolder,
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

  // Gate filesystem

  async gateFetchFiles(mac: string, config: AipGateConnectionConfig): Promise<void> {
    await this.core.client.fetchGateFiles(mac, config)
  }

  async gateFetchFolders(mac: string, config: AipGateConnectionConfig): Promise<void> {
    await this.core.client.fetchGateFolders(mac, config)
  }

  async gateGetFiles(mac: string): Promise<AipGateRemoteFile[]> {
    try {
      return (await this.core.client.getGateFiles(mac)) as AipGateRemoteFile[]
    } catch {
      return []
    }
  }

  async gateGetFilesByCategory(mac: string, category: string): Promise<AipGateRemoteFile[]> {
    try {
      return (await this.core.client.getGateFilesByCategory(mac, category)) as AipGateRemoteFile[]
    } catch {
      return []
    }
  }

  async gateGetFolders(mac: string): Promise<AipGateRemoteFolder[]> {
    try {
      return (await this.core.client.getGateFolders(mac)) as AipGateRemoteFolder[]
    } catch {
      return []
    }
  }

  async gateUploadFile(mac: string, config: AipGateConnectionConfig, localPath: string, category: string, folder?: string): Promise<void> {
    await this.core.client.uploadGateFile(mac, config, localPath, category, folder)
  }

  async gateDownloadFile(mac: string, config: AipGateConnectionConfig, fileId: string, localPath: string): Promise<void> {
    await this.core.client.downloadGateFile(mac, config, fileId, localPath)
  }

  async gateDeleteFile(mac: string, config: AipGateConnectionConfig, fileId: string): Promise<void> {
    await this.core.client.deleteGateFile(mac, config, fileId)
  }

  async gateCreateFolder(mac: string, config: AipGateConnectionConfig, name: string, category: string): Promise<void> {
    await this.core.client.createGateFolder(mac, config, name, category)
  }

  async gateDeleteFolder(mac: string, config: AipGateConnectionConfig, name: string, category: string): Promise<void> {
    await this.core.client.deleteGateFolder(mac, config, name, category)
  }

  async gateRenameFolder(mac: string, config: AipGateConnectionConfig, name: string, newName: string, category: string): Promise<void> {
    await this.core.client.renameGateFolder(mac, config, name, newName, category)
  }
}
