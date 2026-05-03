/**
 * Shared IPC channel definitions and types.
 * Imported by both main process and renderer — keep this file free of
 * Node-only or browser-only imports.
 */

export const IPC = {
  WINDOW: {
    MINIMIZE:       'window:minimize',
    MAXIMIZE:       'window:maximize',
    CLOSE:          'window:close',
    EXIT_REQUESTED: 'window:exit-requested',  // push: main → renderer
    CONFIRM_EXIT:   'window:confirm-exit',    // invoke: renderer → main
  },
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
  CALENDAR: {
    LIST:    'calendar:list',
    GET:     'calendar:get',
    CREATE:  'calendar:create',
    UPDATE:  'calendar:update',
    DELETE:  'calendar:delete',
    TOGGLE:  'calendar:toggle',
    TRIGGER: 'calendar:trigger',
    FIRED:   'calendar:fired',
  },
  SCENE: {
    LIST:    'scene:list',
    GET:     'scene:get',
    CREATE:  'scene:create',
    UPDATE:  'scene:update',
    DELETE:  'scene:delete',
    TRIGGER: 'scene:trigger',
    FIRED:   'scene:fired',
  },
  STREAM: {
    LIST:     'stream:list',
    GET:      'stream:get',
    CREATE:   'stream:create',
    UPDATE:   'stream:update',
    DELETE:   'stream:delete',
    VALIDATE: 'stream:validate',
  },
  SETTINGS: {
    GET:  'settings:get',
    SAVE: 'settings:save',
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

    // SIP extension repository
    GET_SIP_EXTENSIONS:       'aip:getSipExtensions',
    SAVE_SIP_EXTENSION:       'aip:saveSipExtension',
    REMOVE_SIP_EXTENSION:     'aip:removeSipExtension',

    // SIP conference repository
    GET_SIP_CONFERENCES:             'aip:getSipConferences',
    GET_SIP_CONFERENCES_FOR_DEVICE:  'aip:getSipConferencesForDevice',
    SAVE_SIP_CONFERENCE:             'aip:saveSipConference',
    REMOVE_SIP_CONFERENCE:           'aip:removeSipConference',
    REMOVE_SIP_CONFERENCES_FOR_DEVICE: 'aip:removeSipConferencesForDevice',

    // SIP device commands
    ADD_SIP_EXTENSION:        'aip:addSipExtension',
    DELETE_SIP_EXTENSION:     'aip:deleteSipExtension',
    CREATE_SIP_CONFERENCE:    'aip:createSipConference',
    ADD_SIP_CONFERENCE_USER:  'aip:addSipConferenceUser',

    // Gate web config repository
    GET_GATE_WEB_CONFIGS:     'aip:getGateWebConfigs',
    SAVE_GATE_WEB_CONFIG:     'aip:saveGateWebConfig',
    REMOVE_GATE_WEB_CONFIG:   'aip:removeGateWebConfig',

    // Audio file repository
    GET_AUDIO_FILES:              'aip:getAudioFiles',
    GET_AUDIO_FILES_FOR_DEVICE:   'aip:getAudioFilesForDevice',
    REMOVE_AUDIO_FILE:            'aip:removeAudioFile',
    REMOVE_AUDIO_FILES_FOR_DEVICE:'aip:removeAudioFilesForDevice',

    // File transfer
    ENQUEUE_FILE_TRANSFER:    'aip:enqueueFileTransfer',
    CANCEL_FILE_TRANSFER:     'aip:cancelFileTransfer',
    FILE_TRANSFER_PROGRESS:   'aip:fileTransferProgress',   // push: main → renderer
    FILE_TRANSFER_COMPLETED:  'aip:fileTransferCompleted',  // push: main → renderer

    // Gate filesystem
    GATE_FETCH_FILES:         'aip:gateFetchFiles',
    GATE_FETCH_FOLDERS:       'aip:gateFetchFolders',
    GATE_GET_FILES:           'aip:gateGetFiles',
    GATE_GET_FILES_BY_CAT:    'aip:gateGetFilesByCategory',
    GATE_GET_FOLDERS:         'aip:gateGetFolders',
    GATE_UPLOAD_FILE:         'aip:gateUploadFile',
    GATE_DOWNLOAD_FILE:       'aip:gateDownloadFile',
    GATE_DELETE_FILE:         'aip:gateDeleteFile',
    GATE_CREATE_FOLDER:       'aip:gateCreateFolder',
    GATE_DELETE_FOLDER:       'aip:gateDeleteFolder',
    GATE_RENAME_FOLDER:       'aip:gateRenameFolder',
    GATE_FILES_UPDATED:       'aip:gateFilesUpdated',       // push: main → renderer
    GATE_FOLDERS_UPDATED:     'aip:gateFoldersUpdated',     // push: main → renderer
    GATE_OPERATION_ERROR:     'aip:gateOperationError',     // push: main → renderer
    GATE_OPERATION_COMPLETED: 'aip:gateOperationCompleted', // push: main → renderer

    // Gate channel players
    GATE_FETCH_CHANNEL_PLAYERS:    'aip:gateFetchChannelPlayers',
    GATE_GET_CHANNEL_PLAYERS:      'aip:gateGetChannelPlayers',
    GATE_ACTIVATE_CHANNEL_PLAYER:  'aip:gateActivateChannelPlayer',
    GATE_DEACTIVATE_CHANNEL_PLAYER:'aip:gateDeactivateChannelPlayer',
    GATE_CHANNEL_PLAYERS_UPDATED:  'aip:gateChannelPlayersUpdated', // push

    // Gate scenes
    GATE_FETCH_SCENES:  'aip:gateFetchScenes',
    GATE_GET_SCENES:    'aip:gateGetScenes',
    GATE_CREATE_SCENE:  'aip:gateCreateScene',
    GATE_UPDATE_SCENE:  'aip:gateUpdateScene',
    GATE_DELETE_SCENE:  'aip:gateDeleteScene',
    GATE_SCENES_UPDATED:'aip:gateScenesUpdated',             // push

    // Gate schedules
    GATE_FETCH_SCHEDULES:   'aip:gateFetchSchedules',
    GATE_GET_SCHEDULES:     'aip:gateGetSchedules',
    GATE_CREATE_SCHEDULE:   'aip:gateCreateSchedule',
    GATE_UPDATE_SCHEDULE:   'aip:gateUpdateSchedule',
    GATE_DELETE_SCHEDULE:   'aip:gateDeleteSchedule',
    GATE_CANCEL_SCHEDULE:   'aip:gateCancelSchedule',
    GATE_SCHEDULES_UPDATED: 'aip:gateSchedulesUpdated',      // push
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

/** Stream snapshot embedded in every player device presence broadcast. */
export interface AipStreamInfo {
  active:         boolean
  name:           string
  source_mac:     string
  channel_number: number
  stream_type:    number
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
  stream_config?:     AipStreamInfo
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

// ─── AIP — SIP repository ────────────────────────────────────────────────────

export interface AipSipExtension {
  mac:             string
  extensionNumber: number
  username:        string
}

export interface AipSipConferenceParticipant {
  extensionNumber: number
  username:        string
}

export interface AipSipConference {
  mac:              string
  conferenceNumber: number
  name:             string
  participants:     AipSipConferenceParticipant[]
}

export interface AipSipExtensionCredentials {
  extensionNumber: number
  username:        string
  password?:       string
}

// ─── AIP — Gate web configuration ────────────────────────────────────────────

export interface AipGateWebConfig {
  mac:         string
  authEnabled: boolean
  sslEnabled:  boolean
  maxUsers:    number
  users:       { username: string }[]
}

// ─── AIP — Audio file repository ─────────────────────────────────────────────

/**
 * Audio type values:
 *   0 = Messages, 1 = Alarms/Events, 2 = Background Music,
 *   3 = Professional, 4 = Firmware
 */
export type AipAudioFileType = 0 | 1 | 2 | 3 | 4

export interface AipAudioFile {
  mac:           string
  id:            number
  audioType:     AipAudioFileType
  name:          string
  directoryName: string
  directoryId:   number
}

// ─── AIP — File transfer ─────────────────────────────────────────────────────

export type AipTransferDirection = 'upload' | 'download'
export type AipTransferResult    = 'success' | 'timeout' | 'error' | 'cancelled'

export interface AipFileTransferRequest {
  localPath:  string
  remotePath: string
  deviceIp:   string
  direction?: AipTransferDirection
}

export interface AipFileTransferProgressEvent {
  percent:    number
  localPath:  string
  remotePath: string
  deviceIp:   string
}

export interface AipFileTransferCompletedEvent {
  result:     AipTransferResult
  localPath:  string
  remotePath: string
  deviceIp:   string
}

// ─── AIP — Gate filesystem ───────────────────────────────────────────────────

export type AipGateCategory = 'bgm' | 'messages' | 'events'

export interface AipGateConnectionConfig {
  ip:          string
  port?:       number
  sslEnabled?: boolean
  username?:   string
  password?:   string
}

export interface AipGateRemoteFile {
  id:       string
  name:     string
  category: AipGateCategory | string
  folder:   string
  duration: number
}

export interface AipGateRemoteFolder {
  id:       string
  name:     string
  category: AipGateCategory | string
}

export interface AipGateFilesUpdatedEvent {
  mac:   string
  files: AipGateRemoteFile[]
}

export interface AipGateFoldersUpdatedEvent {
  mac:     string
  folders: AipGateRemoteFolder[]
}

export interface AipGateOperationErrorEvent {
  mac:       string
  operation: string
  message:   string
}

export interface AipGateOperationCompletedEvent {
  mac:       string
  operation: string
}

// ─── AIP — Gate channel players / scenes / schedules ────────────────────────

export interface AipGateChannelPlayer {
  id:            string
  name:          string
  source:        string
  sourceType:    'Folder' | 'Url' | string
  playbackState: 'Playing' | 'Paused' | 'Stopped' | string
  repeat:        boolean
  shuffle:       boolean
  currentTrack: {
    position: number
    folder:   string
    fileId:   string
  }
}

export interface AipGateSceneActions {
  changeVolume:       Array<{ devices: string[]; volume: number }>
  joinEmitterChannel: Array<{ devices: string[]; emitter: string }>
  joinLocalChannel:   Array<{ channelId: string; devices: string[] }>
  leaveChannel:       Array<{ devices: string[] }>
}

export interface AipGateRemoteScene {
  id:         string
  name:       string
  startAt:    string
  dateFrom:   string
  dateTo:     string
  daysOfWeek: number[]
  actions:    AipGateSceneActions
}

export interface AipGateRemoteSchedule {
  id:            string
  name:          string
  fileId:        string
  startAt:       string
  repeatEach:    string
  repeatUntil:   string
  daysOfWeek:    number[]
  dateFrom:      string
  dateTo:        string
  specialVolume: number
  durationLimit: string
}

export interface AipGateChannelPlayersUpdatedEvent {
  mac:     string
  players: AipGateChannelPlayer[]
}

export interface AipGateScenesUpdatedEvent {
  mac:    string
  scenes: AipGateRemoteScene[]
}

export interface AipGateSchedulesUpdatedEvent {
  mac:       string
  schedules: AipGateRemoteSchedule[]
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
