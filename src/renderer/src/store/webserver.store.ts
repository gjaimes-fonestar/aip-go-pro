import { create } from 'zustand'
import type {
  AipSipExtension,
  AipSipConference,
  AipGateWebConfig,
  AipFileTransferProgressEvent,
  AipFileTransferCompletedEvent,
  AipTransferResult,
  AipAudioFile,
} from '@shared/ipc'

// ─── File transfer tracking ───────────────────────────────────────────────────

export type FileCategory = 'messages' | 'events' | 'bgm'

export interface TrackedFile {
  id:         string
  category:   FileCategory
  label:      string
  localPath:  string
  remotePath: string
  deviceIp:   string
  direction:  'upload' | 'download'
  status:     'idle' | 'transferring' | 'done' | 'error' | 'cancelled'
  percent:    number
  result?:    AipTransferResult
}

// ─── Store shape ──────────────────────────────────────────────────────────────

export type WebserverTab = 'sip-extensions' | 'sip-conferences' | 'files'
export type FilesSubTab  = FileCategory

// Compound key for conference selection: `${mac}|${conferenceNumber}`
export function confKey(mac: string, conferenceNumber: number): string {
  return `${mac}|${conferenceNumber}`
}

interface WebserverState {
  activeTab:    WebserverTab
  filesSubTab:  FilesSubTab

  sipExtensions:     AipSipExtension[]
  sipConferences:    AipSipConference[]
  selectedConfKey:   string | null
  gateWebConfigs:    Map<string, AipGateWebConfig>
  deviceAudioFiles:  AipAudioFile[]
  files:             TrackedFile[]

  setActiveTab:            (tab: WebserverTab) => void
  setFilesSubTab:          (tab: FilesSubTab) => void
  setSelectedConfKey:      (key: string | null) => void

  setSipExtensions:        (list: AipSipExtension[]) => void
  upsertSipExtension:      (ext: AipSipExtension) => void
  removeSipExtensionLocal: (mac: string) => void

  setSipConferences:        (list: AipSipConference[]) => void
  upsertSipConference:      (conf: AipSipConference) => void
  removeSipConferenceLocal: (mac: string, conferenceNumber: number) => void

  setGateWebConfig:     (config: AipGateWebConfig) => void
  setDeviceAudioFiles:  (files: AipAudioFile[]) => void

  addFile:           (file: TrackedFile) => void
  applyProgress:     (event: AipFileTransferProgressEvent) => void
  applyCompleted:    (event: AipFileTransferCompletedEvent) => void
  removeFile:        (id: string) => void
}

function fileKey(localPath: string, remotePath: string, deviceIp: string): string {
  return `${localPath}||${remotePath}||${deviceIp}`
}

export const useWebserverStore = create<WebserverState>((set) => ({
  activeTab:        'sip-extensions',
  filesSubTab:      'messages',
  sipExtensions:    [],
  sipConferences:   [],
  selectedConfKey:  null,
  gateWebConfigs:   new Map(),
  deviceAudioFiles: [],
  files:            [],

  setActiveTab:       (tab) => set({ activeTab: tab }),
  setFilesSubTab:     (tab) => set({ filesSubTab: tab }),
  setSelectedConfKey: (key) => set({ selectedConfKey: key }),

  setSipExtensions: (list) => set({ sipExtensions: list }),
  upsertSipExtension: (ext) =>
    set((s) => {
      const idx = s.sipExtensions.findIndex((e) => e.mac === ext.mac)
      const next = [...s.sipExtensions]
      if (idx >= 0) next[idx] = ext
      else next.push(ext)
      return { sipExtensions: next }
    }),
  removeSipExtensionLocal: (mac) =>
    set((s) => ({ sipExtensions: s.sipExtensions.filter((e) => e.mac !== mac) })),

  setSipConferences: (list) => set({ sipConferences: list }),
  upsertSipConference: (conf) =>
    set((s) => {
      const idx = s.sipConferences.findIndex(
        (c) => c.mac === conf.mac && c.conferenceNumber === conf.conferenceNumber,
      )
      const next = [...s.sipConferences]
      if (idx >= 0) next[idx] = conf
      else next.push(conf)
      return { sipConferences: next }
    }),
  removeSipConferenceLocal: (mac, conferenceNumber) =>
    set((s) => ({
      sipConferences: s.sipConferences.filter(
        (c) => !(c.mac === mac && c.conferenceNumber === conferenceNumber),
      ),
    })),

  setGateWebConfig: (config) =>
    set((s) => {
      const next = new Map(s.gateWebConfigs)
      next.set(config.mac, config)
      return { gateWebConfigs: next }
    }),

  setDeviceAudioFiles: (files) => set({ deviceAudioFiles: files }),

  addFile: (file) => set((s) => ({ files: [...s.files, file] })),

  applyProgress: (event) =>
    set((s) => ({
      files: s.files.map((f) =>
        fileKey(f.localPath, f.remotePath, f.deviceIp) ===
        fileKey(event.localPath, event.remotePath, event.deviceIp)
          ? { ...f, status: 'transferring', percent: event.percent }
          : f,
      ),
    })),

  applyCompleted: (event) =>
    set((s) => ({
      files: s.files.map((f) =>
        fileKey(f.localPath, f.remotePath, f.deviceIp) ===
        fileKey(event.localPath, event.remotePath, event.deviceIp)
          ? {
              ...f,
              status:
                event.result === 'success'
                  ? 'done'
                  : event.result === 'cancelled'
                  ? 'cancelled'
                  : 'error',
              percent: event.result === 'success' ? 100 : f.percent,
              result:  event.result,
            }
          : f,
      ),
    })),

  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
}))
