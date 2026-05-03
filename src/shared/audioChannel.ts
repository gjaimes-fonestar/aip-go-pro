/**
 * AudioChannel data model — shared between main process and renderer.
 * Mirrors the aip-database AudioChannel domain type for use across the IPC boundary.
 */

export type AudioSource = 'LOCAL' | 'ONLINE'
export type AudioQuality = 'LOW' | 'NORMAL' | 'HIGH'

export interface AudioChannelSource {
  id:        number
  channelId: number
  path:      string
}

export interface AudioChannelDevice {
  id:        number
  channelId: number
  mac:       string
}

/** A persisted audio channel loaded from the DB. */
export interface AudioChannel {
  id:                   number
  name:                 string
  audioSource:          AudioSource
  quality:              AudioQuality
  isMono:               boolean
  loopAll:              boolean
  shuffle:              boolean
  startWhenCreated:     boolean
  restoreDeviceList:    boolean
  restorePlaybackState: boolean
  sources:              AudioChannelSource[]
  devices:              AudioChannelDevice[]
}

export interface NewAudioChannel {
  name:                 string
  audioSource:          AudioSource
  quality:              AudioQuality
  isMono:               boolean
  loopAll:              boolean
  shuffle:              boolean
  startWhenCreated:     boolean
  restoreDeviceList:    boolean
  restorePlaybackState: boolean
  sources:              Omit<AudioChannelSource, 'id' | 'channelId'>[]
  devices:              Omit<AudioChannelDevice, 'id' | 'channelId'>[]
}

export type UpdateAudioChannel = Partial<Omit<NewAudioChannel, 'sources' | 'devices'>>
