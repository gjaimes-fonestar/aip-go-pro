import { create } from 'zustand'
import type { AipDeviceJson, AipDeviceEvent } from '@shared/ipc'

// ─── Augmented device entry ───────────────────────────────────────────────────

export interface DeviceEntry {
  device:   AipDeviceJson
  lastSeen: number    // epoch ms — updated on every add/update event
}

// ─── Store shape ─────────────────────────────────────────────────────────────

interface DevicesState {
  /** All known devices keyed by MAC address. */
  entries:      Map<string, DeviceEntry>
  /** MAC of the currently selected row, or null. */
  selectedMac:  string | null
  /** True once initialize() has been called via IPC. */
  aipReady:     boolean
  /** Epoch ms when AIP was last successfully initialized. Null if never. */
  discoveryStartedAt: number | null

  // ── Setters ──
  setAipReady:    (ready: boolean) => void
  selectDevice:   (mac: string | null) => void

  /** Replace the full device map from a getDevicesJson() JSON array. */
  loadAll:        (json: string) => void

  /** Apply a single device event from the onDeviceEvent() push channel. */
  applyEvent:     (json: string) => void

  /** Optimistically update a device's volume before the round-trip event arrives. */
  optimisticVolume: (mac: string, volume: number) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDeviceArray(json: string): AipDeviceJson[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as AipDeviceJson[]) : []
  } catch {
    return []
  }
}

function parseEvent(json: string): AipDeviceEvent | null {
  try {
    return JSON.parse(json) as AipDeviceEvent
  } catch {
    return null
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useDevicesStore = create<DevicesState>((set) => ({
  entries:            new Map(),
  selectedMac:        null,
  aipReady:           false,
  discoveryStartedAt: null,

  setAipReady: (ready) => set((state) => ({
    aipReady: ready,
    // Record the start time only on the first transition to true (or on re-init)
    discoveryStartedAt: ready && !state.aipReady ? Date.now() : state.discoveryStartedAt,
  })),

  selectDevice: (mac) => set({ selectedMac: mac }),

  loadAll: (json) => {
    const devices = parseDeviceArray(json)
    const now     = Date.now()
    const entries = new Map(
      devices.map((d) => [d.mac, { device: d, lastSeen: now }])
    )
    set({ entries })
  },

  applyEvent: (json) => {
    const event = parseEvent(json)
    if (!event) return

    set((state) => {
      const next = new Map(state.entries)

      if (event.event === 'device_removed') {
        next.delete(event.mac)
        return {
          entries:     next,
          selectedMac: state.selectedMac === event.mac ? null : state.selectedMac,
        }
      }

      // device_added | device_updated
      next.set(event.mac, { device: event, lastSeen: Date.now() })
      return { entries: next }
    })
  },

  optimisticVolume: (mac, volume) => {
    set((state) => {
      const entry = state.entries.get(mac)
      if (!entry) return {}
      const next = new Map(state.entries)
      next.set(mac, {
        ...entry,
        device: { ...entry.device, volume },
      })
      return { entries: next }
    })
  },
}))
