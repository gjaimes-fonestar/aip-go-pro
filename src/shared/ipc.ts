/**
 * Shared IPC channel definitions and types.
 * Imported by both main process and renderer — keep this file free of
 * Node-only or browser-only imports.
 */

export const IPC = {
  BACKEND: {
    GET_INFO: 'backend:getInfo',
    GET_URL:  'backend:getUrl',
    RESTART:  'backend:restart',
  },
  APP: {
    GET_VERSION:  'app:getVersion',
    GET_PLATFORM: 'app:getPlatform',
  },
  DIALOG: {
    OPEN_FILE: 'dialog:openFile',
    SAVE_FILE: 'dialog:saveFile',
  },
  AIP: {
    // Core
    GET_STATUS:     'aip:getStatus',
    GET_INTERFACES: 'aip:getInterfaces',
    INITIALIZE:     'aip:initialize',
    SHUTDOWN:       'aip:shutdown',
    DEVICE_EVENT:   'aip:deviceEvent',                    // push: main → renderer
    CHANNEL_EVENT:         'aip:channelEvent',              // push: main → renderer
    NETWORK_CHANNEL_EVENT: 'aip:networkChannelEvent',      // push: main → renderer
    SIP_CONFIG_EVENT:         'aip:sipConfigEvent',        // push: main → renderer
    SOUND_METER_CONFIG_EVENT: 'aip:soundMeterConfigEvent', // push: main → renderer

    // Devices
    GET_DEVICES:    'aip:getDevices',
    GET_DEVICE:     'aip:getDevice',
    SET_VOLUME:     'aip:setVolume',
    STOP_AUDIO:     'aip:stopAudio',

    // Device configuration commands
    CHANGE_BUTTON_COLOR:         'aip:changeButtonColor',
    REQUEST_SIP_CONFIG:          'aip:requestSIPConfig',
    CHANGE_SIP_CONFIG:           'aip:changeSIPConfig',
    REQUEST_SOUND_METER_CONFIG:  'aip:requestSoundMeterConfig',
    CHANGE_SOUND_METER_CONFIG:   'aip:changeSoundMeterConfig',
    CHANGE_SOUND_METER_SETTING:  'aip:changeSoundMeterSetting',
    CHANGE_NETWORK_CONFIG:       'aip:changeNetworkConfig',
    CHANGE_SENSOR_RELAY_CONFIG:  'aip:changeSensorRelayConfig',
    CHANGE_STARTUP_MODE:         'aip:changeStartupMode',

    // Network channel repository
    GET_NETWORK_CHANNELS:          'aip:getNetworkChannels',
    GET_LOCAL_NETWORK_CHANNELS:    'aip:getLocalNetworkChannels',
    SAVE_NETWORK_CHANNEL:          'aip:saveNetworkChannel',
    REMOVE_NETWORK_CHANNEL:        'aip:removeNetworkChannel',
    REMOVE_NETWORK_CHANNEL_BY_KEY: 'aip:removeNetworkChannelByKey',
    REQUEST_ALL_STREAMS:           'aip:requestAllStreams',

    // Channels
    CREATE_CHANNEL:         'aip:createChannel',
    DESTROY_CHANNEL:        'aip:destroyChannel',
    GET_CHANNEL:            'aip:getChannel',
    GET_CHANNELS:           'aip:getChannels',
    GET_FOREIGN_CHANNELS:   'aip:getForeignChannels',
    PLAY_CHANNEL:           'aip:playChannel',
    PAUSE_CHANNEL:          'aip:pauseChannel',
    STOP_CHANNEL:           'aip:stopChannel',
    NEXT_CHANNEL:           'aip:nextChannel',
    PREVIOUS_CHANNEL:       'aip:previousChannel',
    SET_CHANNEL_VOLUME:     'aip:setChannelVolume',
    LINK_CHANNEL_TO_DEVICE:         'aip:linkChannelToDevice',
    LINK_NETWORK_CHANNEL_TO_DEVICE: 'aip:linkNetworkChannelToDevice',
  },
} as const

// ─── Backend ─────────────────────────────────────────────────────────────────

export type BackendStatus = 'starting' | 'ready' | 'error' | 'stopped'

export interface BackendInfo {
  status: BackendStatus
  url: string | null
  pid: number | null
  error?: string
}

// ─── AIP — Core ──────────────────────────────────────────────────────────────

/** A local network interface available for AIP multicast discovery. */
export interface AipNetworkInterface {
  name:    string
  address: string
}

// ─── AIP — Devices ───────────────────────────────────────────────────────────

/** Network sub-object within AipDeviceJson. */
export interface AipNetworkConfig {
  dhcp:        boolean
  ip:          string
  subnet_mask: string
  gateway:     string
}

/** Volume sub-object within AipDeviceJson. */
export interface AipVolumeConfig {
  normal:    number
  by_action: boolean
  message:   number
  event:     number
  voice:     number
}

/**
 * JSON shape produced by the C++ NlohmannSerializer for a single device.
 * Matches the output of `aip::getDevicesJson()` / `aip::getDeviceByMacJson()`.
 */
export interface AipDeviceJson {
  mac:                string
  name:               string
  network:            AipNetworkConfig
  volume:             number
  volume_locked:      boolean
  channels_locked:    boolean
  menu_locked:        boolean
  latency:            number
  device_type:        number
  device_sub_type:    number
  software_version:   string
  communication_port: number
  volumes:            AipVolumeConfig
  button_color:       { r: number; g: number; b: number }
}

/** Event payload for device_added / device_updated. */
export interface AipDeviceChangedEvent extends AipDeviceJson {
  event: 'device_added' | 'device_updated'
}

/** Event payload for device_removed. */
export interface AipDeviceRemovedEvent {
  event: 'device_removed'
  mac:   string
  name:  string
}

export type AipDeviceEvent = AipDeviceChangedEvent | AipDeviceRemovedEvent

// ─── AIP — Device configuration types ────────────────────────────────────────

/** SIP configuration received from a device (matches daemon JSON). */
export interface AipSipConfig {
  configured:           boolean
  state:                number
  serverIp:             string
  serverPort:           number
  clientAudioPort:      number
  clientAudioPortRange: number
  username:             string
  sipVolume:            number
  zones:                boolean[]
  relays:               boolean[]
}

/** SIP configuration for sending to a device (includes optional password). */
export interface AipSipConfigWrite extends AipSipConfig {
  password?: string
}

/** Sound meter configuration received from / sent to a device. */
export interface AipSoundMeterConfig {
  hasAutomaticVolume: boolean
  sensitivity:        number
  dynamicModeEnabled: boolean
  limiterSensitivity: number
  meterMac:           number[]
  perActionVolumes:   boolean[]
  multiplier:         number[]
  limiterEnabled:     boolean[]
  maxDb:              number[]
}

/** Network configuration payload for sending to a device. */
export interface AipDeviceNetworkConfig {
  dhcp:       boolean
  ipAddress:  string
  subnetMask: string
  gateway:    string
}

/** Sensor and relay configuration for a device. */
export interface AipSensorRelayConfig {
  changeSensors: boolean
  changeRelays:  boolean
  sensorValues:  boolean[]
  relayValues:   boolean[]
}

/** SIP config changed push event (inner JSON from daemon). */
export interface AipSipConfigChangedEvent {
  event:                'sip_config_changed'
  mac:                  string
  configured:           boolean
  state:                number
  serverIp:             string
  serverPort:           number
  clientAudioPort:      number
  clientAudioPortRange: number
  username:             string
  sipVolume:            number
  zones:                boolean[]
  relays:               boolean[]
}

/** Sound meter config changed push event (inner JSON from daemon). */
export interface AipSoundMeterConfigChangedEvent {
  event:              'sound_meter_config_changed'
  mac:                string
  hasAutomaticVolume: boolean
  sensitivity:        number
  dynamicModeEnabled: boolean
  limiterSensitivity: number
  meterMac:           number[]
  perActionVolumes:   boolean[]
  multiplier:         number[]
  limiterEnabled:     boolean[]
  maxDb:              number[]
}

// ─── AIP — Channel player events ─────────────────────────────────────────────

export type AipChannelEventType =
  | 'channel_started'
  | 'channel_stopped'
  | 'channel_paused'
  | 'channel_resumed'
  | 'channel_finished'
  | 'channel_track_changed'
  | 'channel_position'
  | 'channel_metadata'
  | 'channel_error'

export interface AipChannelPlayerEvent {
  event:      AipChannelEventType
  channel_id: number
  // channel_track_changed
  track_index?: number
  url?:         string
  // channel_position
  elapsed_sec?: number
  total_sec?:   number
  // channel_metadata
  title?:       string
  artist?:      string
  // channel_error
  message?:     string
}

// ─── AIP — Network channel repository ────────────────────────────────────────

/** A network/multicast channel stored in the channel repository. */
export interface AipNetworkChannel {
  sourceMac:        string
  name:             string
  channelNumber:    number
  streamType:       number
  multicastAddress: string
  port:             number
  encrypted:        boolean
  encryptionKey:    string
  repeat:           boolean
  local:            boolean
  linkedDevices:    string[]
}

// ─── AIP — Channels ──────────────────────────────────────────────────────────

export type AipChannelQuality = 0 | 1 | 2
export type AipAudioMode      = 1 | 2
export type AipPlayerState    = 0 | 1 | 2 | 3 | 4

export interface AipChannelConfig {
  name:       string
  urls:       string[]
  quality?:   AipChannelQuality
  audioMode?: AipAudioMode
  loop?:      boolean
  shuffle?:   boolean
}

export interface AipChannelInfo {
  id:           number
  name:         string
  urls:         string[]
  quality:      AipChannelQuality
  audioMode:    AipAudioMode
  loop:         boolean
  shuffle:      boolean
  state:        AipPlayerState
  currentUrl:   string
  trackIndex:   number
  trackCount:   number
}

export interface AipForeignChannelInfo {
  sourceMac:      string
  name:           string
  multicastGroup: string
  port:           number
  channelNumber:  number
  quality:        AipChannelQuality
  audioMode:      AipAudioMode
  bitrateKbps:    number
  encrypted:      boolean
  repeat:         boolean
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

export interface DialogOpenOptions {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  multiSelections?: boolean
}

export interface DialogSaveOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}
