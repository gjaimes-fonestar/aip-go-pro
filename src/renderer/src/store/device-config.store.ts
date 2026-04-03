import { create } from 'zustand'
import type { AipSipConfigChangedEvent, AipSoundMeterConfigChangedEvent } from '@shared/ipc'

export interface SipConfigEntry {
  mac:       string
  config:    AipSipConfigChangedEvent
  receivedAt: number
}

export interface SoundMeterEntry {
  mac:       string
  config:    AipSoundMeterConfigChangedEvent
  receivedAt: number
}

interface DeviceConfigState {
  sipConfigs:        Map<string, SipConfigEntry>
  soundMeterConfigs: Map<string, SoundMeterEntry>

  applySipConfigEvent:        (event: AipSipConfigChangedEvent) => void
  applySoundMeterConfigEvent: (event: AipSoundMeterConfigChangedEvent) => void

  getSipConfig:        (mac: string) => SipConfigEntry | undefined
  getSoundMeterConfig: (mac: string) => SoundMeterEntry | undefined
}

export const useDeviceConfigStore = create<DeviceConfigState>((set, get) => ({
  sipConfigs:        new Map(),
  soundMeterConfigs: new Map(),

  applySipConfigEvent: (event) => {
    set((state) => {
      const next = new Map(state.sipConfigs)
      next.set(event.mac, { mac: event.mac, config: event, receivedAt: Date.now() })
      return { sipConfigs: next }
    })
  },

  applySoundMeterConfigEvent: (event) => {
    set((state) => {
      const next = new Map(state.soundMeterConfigs)
      next.set(event.mac, { mac: event.mac, config: event, receivedAt: Date.now() })
      return { soundMeterConfigs: next }
    })
  },

  getSipConfig:        (mac) => get().sipConfigs.get(mac),
  getSoundMeterConfig: (mac) => get().soundMeterConfigs.get(mac),
}))
