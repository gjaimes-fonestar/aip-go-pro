// Device type constants — mirror the C++ aip::protocol::DeviceType enum.
export const DeviceType = {
  Player:          0x00,
  PlayerAmplifier: 0x01,
  PCServer:        0x02,
  Microphone:      0x03,
  ProMicrophone:   0x04,
  Intercom:        0x05,
  PCGateway:       0x07,
  Emitter:         0x08,
  WebServer:       0x09,
  SoundMeter:      0x0A,
  SensorRelay:     0x0B,
} as const

// Player (receiver) device sub-type constants.
export const PlayerSubType = {
  Aip3010:     0,
  AipPlayer:   1,
  SonoraAip:   2,
  SonoraAipEx: 3,
  AipAmp:      4,
  AipBox:      5,
  GaAip:       6,
} as const

// Emitter (transmitter) device sub-type constants.
export const EmitterSubType = {
  Aip4010:     0,
  AipStreamer:  1,
} as const

/**
 * Returns the exact legacy model name for a (type, subType) pair.
 * Mirrors C# ModelNameHelper.GetModelName(deviceType, deviceSubType).
 */
export function getModelName(type: number, subType: number): string {
  switch (type) {
    case DeviceType.Player:
      switch (subType) {
        case PlayerSubType.Aip3010:     return 'AIP-3010'
        case PlayerSubType.AipPlayer:   return 'AIP-PLAYER'
        case PlayerSubType.SonoraAip:   return 'SONORA-5AIP'
        case PlayerSubType.SonoraAipEx: return 'SONORA-5AIPX'
        case PlayerSubType.AipAmp:      return 'AIP-AMP'
        case PlayerSubType.AipBox:      return 'AIP-BOX'
        case PlayerSubType.GaAip:       return 'GA-AIP'
        default:                        return 'AIP-3010'
      }
    case DeviceType.PlayerAmplifier: return 'AIP-3010A'
    case DeviceType.PCServer:        return 'AIP-PC'
    case DeviceType.Microphone:      return 'AIP-1020'
    case DeviceType.ProMicrophone:   return 'AIP-1020P'
    case DeviceType.Intercom:        return 'AIP-INT'
    case DeviceType.PCGateway:       return 'AIP-GATE'
    case DeviceType.Emitter:
      return subType === EmitterSubType.Aip4010 ? 'AIP-4010' : 'AIP-STREAMER'
    case DeviceType.WebServer:       return 'AIP-GATE'
    case DeviceType.SoundMeter:      return 'AIP-SPL'
    case DeviceType.SensorRelay:     return 'AIP-IO'
    default:
      return `0x${type.toString(16).toUpperCase().padStart(2, '0')}`
  }
}

/** Returns the i18n key for the human-readable device type label. */
export function getTypeLabelKey(type: number): string {
  switch (type) {
    case DeviceType.Player:          return 'types.player'
    case DeviceType.PlayerAmplifier: return 'types.amplifier'
    case DeviceType.PCServer:        return 'types.pcServer'
    case DeviceType.Microphone:      return 'types.microphone'
    case DeviceType.ProMicrophone:   return 'types.proMicrophone'
    case DeviceType.Intercom:        return 'types.intercom'
    case DeviceType.PCGateway:       return 'types.webserver'
    case DeviceType.Emitter:         return 'types.transmitter'
    case DeviceType.WebServer:       return 'types.webserver'
    case DeviceType.SoundMeter:      return 'types.soundMeter'
    case DeviceType.SensorRelay:     return 'types.sensorIO'
    default:                         return 'types.device'
  }
}

/** Returns true for devices that have a configurable audio volume. */
export function hasVolumeControl(type: number): boolean {
  return (
    type === DeviceType.Player ||
    type === DeviceType.PlayerAmplifier ||
    type === DeviceType.Intercom ||
    type === DeviceType.Emitter
  )
}

/** Returns true for devices that act as AIP-GATE web servers. */
export function isWebserverDevice(type: number): boolean {
  return type === DeviceType.PCGateway || type === DeviceType.WebServer
}

/** Returns true for devices that have a SIP client. */
export function isSipCapable(type: number): boolean {
  return (
    type === DeviceType.Player ||
    type === DeviceType.PlayerAmplifier ||
    type === DeviceType.Intercom
  )
}

/** Returns true for devices that can play audio channels. */
export function isPlayerDevice(type: number): boolean {
  return (
    type === DeviceType.Player ||
    type === DeviceType.PlayerAmplifier ||
    type === DeviceType.Intercom
  )
}

/** Returns true for devices that expose a configuration UI. PCServer is view-only. */
export function isConfigurableDevice(type: number): boolean {
  return type !== DeviceType.PCServer
}
