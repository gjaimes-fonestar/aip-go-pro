import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Badge } from '../components/ui/Badge'
import { VolumeBar } from '../components/ui/VolumeBar'
import { InterfaceSelectModal } from '../components/ui/InterfaceSelectModal'
import { useDevicesStore } from '../store/devices.store'
import type { AipDeviceJson, AipChannelInfo } from '@shared/ipc'

// PlayerState dot colours reused in context menu
const CH_STATE_DOT: Record<number, string> = {
  0: 'bg-gray-400',
  1: 'bg-green-400',
  2: 'bg-yellow-400',
  3: 'bg-gray-400',
  4: 'bg-red-400',
}

// ─── Context menu ─────────────────────────────────────────────────────────────

function DeviceContextMenu({
  x, y, mac, name, channels, onClose, onAssign, onStop,
}: {
  x: number; y: number; mac: string; name: string
  channels: AipChannelInfo[]
  onClose: () => void
  onAssign: (channelId: number) => void
  onStop:   () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey   = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onClick = (e: MouseEvent)    => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown',   onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown',   onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [onClose])

  // Keep menu inside viewport
  const style: React.CSSProperties = { position: 'fixed', left: x, top: y, zIndex: 1000, minWidth: '200px' }

  return (
    <div ref={menuRef} style={style}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <p className="max-w-[180px] truncate text-xs font-semibold text-gray-800 dark:text-gray-200">{name}</p>
        <p className="font-mono text-xs text-gray-400">{mac}</p>
      </div>

      {channels.length > 0 ? (
        <>
          <p className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Assign channel
          </p>
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onAssign(ch.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${CH_STATE_DOT[ch.state] ?? 'bg-gray-400'}`} />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
          <div className="border-t border-gray-100 dark:border-gray-700" />
        </>
      ) : (
        <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No channels available</p>
      )}

      <button
        onClick={onStop}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
        Stop playback
      </button>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupBy = 'none' | 'areas' | 'groups'

// ─── Device helpers ───────────────────────────────────────────────────────────

function deviceTypeName(type: number): string {
  switch (type) {
    case 1: return 'Receiver'
    case 2: return 'Transmitter'
    case 3: return 'Amplifier'
    case 4: return 'Controller'
    default: return `Type-${type.toString(16).toUpperCase()}`
  }
}

function deviceModel(d: AipDeviceJson): string {
  return `AIP-${deviceTypeName(d.device_type).toUpperCase()}`
}

function formatLastSeen(epoch: number): string {
  const d = new Date(epoch)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatVersion(v: string): string {
  return v || '—'
}

const COLUMNS = [
  { key: 'type',        label: 'Type'         },
  { key: 'model',       label: 'Model'        },
  { key: 'name',        label: 'Name'         },
  { key: 'channelType', label: 'Channel type' },
  { key: 'channel',     label: 'Channel'      },
  { key: 'status',      label: 'Status'       },
  { key: 'volume',      label: 'Volume'       },
  { key: 'ip',          label: 'IP'           },
  { key: 'mac',         label: 'MAC'          },
  { key: 'time',        label: 'Last seen'    },
] as const

// ─── Actions panel ────────────────────────────────────────────────────────────

interface ActionsPanelProps {
  device:   AipDeviceJson | null
  lastSeen: number | null
}

function ActionsPanel({ device, lastSeen }: ActionsPanelProps) {
  const optimisticVolume = useDevicesStore((s) => s.optimisticVolume)

  // Local slider state — seeded from the selected device's real volume.
  const [sliderVolume, setSliderVolume]           = useState(50)
  const [availableChannels, setAvailableChannels] = useState<AipChannelInfo[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<number | ''>('')

  // Sync slider when selected device changes or its volume is updated remotely.
  useEffect(() => {
    if (device) setSliderVolume(device.volume)
  }, [device?.mac, device?.volume])

  // Load channels when a device is selected.
  useEffect(() => {
    if (!device) {
      setAvailableChannels([])
      setSelectedChannelId('')
      return
    }
    window.electronAPI.aip.getChannels()
      .then(setAvailableChannels)
      .catch(console.error)
  }, [device?.mac])

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSliderVolume(Number(e.target.value))
    },
    []
  )

  const handleVolumeCommit = useCallback(
    (volume: number) => {
      if (!device) return
      optimisticVolume(device.mac, volume)
      window.electronAPI.aip.setVolume(device.mac, volume).catch(console.error)
    },
    [device, optimisticVolume]
  )

  const handleAssignChannel = useCallback(() => {
    if (!device || selectedChannelId === '') return
    window.electronAPI.aip
      .linkChannelToDevice(selectedChannelId as number, device.mac)
      .catch(console.error)
  }, [device, selectedChannelId])

  const handleStopPlayback = useCallback(() => {
    if (!device) return
    window.electronAPI.aip.stopAudio(device.mac).catch(console.error)
  }, [device])

  if (!device) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-center text-sm text-gray-400">
          Select a device<br />to see available actions
        </p>
      </div>
    )
  }

  const ActionBtn = ({
    label,
    variant = 'secondary',
    onClick,
  }: {
    label:    string
    variant?: 'primary' | 'secondary' | 'danger'
    onClick?: () => void
  }) => {
    const cls =
      variant === 'primary' ? 'bg-primary text-white hover:bg-primary/90' :
      variant === 'danger'  ? 'bg-red-500 text-white hover:bg-red-600' :
      'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'

    return (
      <button
        onClick={onClick}
        className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${cls}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Device summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Selected device</p>
        <p className="mt-1 font-semibold text-gray-900 dark:text-white">{device.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {deviceModel(device)} · {device.network.ip}
        </p>
        <p className="font-mono text-xs text-gray-400">{device.mac}</p>
        {lastSeen && (
          <p className="mt-1 text-xs text-gray-400">
            Last seen {formatLastSeen(lastSeen)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {device.volume_locked && (
            <Badge label="Vol Locked" variant="warning" />
          )}
          {device.channels_locked && (
            <Badge label="Ch Locked" variant="warning" />
          )}
        </div>
      </div>

      {/* Volume control */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Volume
          </label>
          <span className="text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300">
            {sliderVolume}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={sliderVolume}
          disabled={device.volume_locked}
          onChange={handleVolumeChange}
          onMouseUp={() => handleVolumeCommit(sliderVolume)}
          onTouchEnd={() => handleVolumeCommit(sliderVolume)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
        />
      </div>

      {/* Device info */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="space-y-1">
          <InfoRow label="SW Version"  value={formatVersion(device.software_version)} />
          <InfoRow label="Device type" value={`${deviceTypeName(device.device_type)} (${device.device_type})`} />
          <InfoRow label="Latency"     value={['High', 'Medium', 'Low'][device.latency] ?? '—'} />
        </div>
      </div>

      {/* Channel assignment */}
      <div className="flex flex-col gap-2">
        <select
          value={selectedChannelId}
          onChange={(e) =>
            setSelectedChannelId(e.target.value === '' ? '' : Number(e.target.value))
          }
          className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">Select channel…</option>
          {availableChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>{ch.name}</option>
          ))}
        </select>
        <ActionBtn
          label="Play Channel"
          variant="primary"
          onClick={handleAssignChannel}
        />
        <ActionBtn label="Stop Playback" onClick={handleStopPlayback} />
        <ActionBtn label="Instant Message" />
        <ActionBtn label="Voice Message" />
        <ActionBtn label="Configure Device" />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Devices() {
  const { entries, selectedMac, aipReady, setAipReady, selectDevice, loadAll, applyEvent } =
    useDevicesStore()

  const [groupBy,      setGroupBy]   = useState<GroupBy>('none')
  const [filterEnabled, setFilter]  = useState(false)
  const [filterType,   setFilterType] = useState<string>('None')
  const [search,       setSearch]   = useState('')
  const unsubRef = useRef<(() => void) | null>(null)

  // Right-click context menu
  const [ctxMenu,     setCtxMenu]     = useState<{ x: number; y: number; mac: string; name: string } | null>(null)
  const [ctxChannels, setCtxChannels] = useState<AipChannelInfo[]>([])

  // ── Subscribe to device events and load initial data on mount ──────────────
  useEffect(() => {
    // Always register the push listener — events arrive before loadAll.
    unsubRef.current = window.electronAPI.aip.onDeviceEvent((json) => {
      applyEvent(json)
    })

    // If already initialized from a previous visit, reload data.
    if (aipReady) {
      window.electronAPI.aip
        .getDevices()
        .then((json) => loadAll(json))
        .catch(console.error)
    }

    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [aipReady]) // re-run if aipReady changes (first-time init)

  // ── Called by the modal once initialize() succeeds ────────────────────────
  const handleInitialized = useCallback(async () => {
    setAipReady(true)
    // Wait 2 s for the C++ repository to populate from multicast keepalives.
    await new Promise((r) => setTimeout(r, 2000))
    const json = await window.electronAPI.aip.getDevices()
    loadAll(json)
  }, [setAipReady, loadAll])

  // ── Derive rows ───────────────────────────────────────────────────────────
  const allEntries = useMemo(() => Array.from(entries.values()), [entries])

  const visible = useMemo(() => {
    return allEntries.filter(({ device }) => {
      if (
        search &&
        !device.name.toLowerCase().includes(search.toLowerCase()) &&
        !device.network.ip.includes(search) &&
        !deviceModel(device).toLowerCase().includes(search.toLowerCase())
      ) return false
      if (filterEnabled && filterType !== 'None' && deviceTypeName(device.device_type) !== filterType)
        return false
      return true
    })
  }, [allEntries, search, filterEnabled, filterType])

  const selectedEntry = selectedMac ? entries.get(selectedMac) ?? null : null
  const onlineCount   = allEntries.length // all in repo are "online" (expired ones are removed)

  return (
    <>
      {/* ── Interface selection modal ── */}
      {!aipReady && <InterfaceSelectModal onConfirm={handleInitialized} />}

      <div className="flex h-full gap-4">
        {/* ── Main panel ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">

          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Network Devices</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {allEntries.length} devices registered · {onlineCount} online
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search devices…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={() =>
                  window.electronAPI.aip
                    .getDevices()
                    .then((j) => loadAll(j))
                    .catch(console.error)
                }
                disabled={!aipReady}
                title="Refresh device list"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table card */}
          <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="h-full overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="py-12 text-center text-sm text-gray-400">
                        {aipReady
                          ? 'No devices match the current filter.'
                          : 'Waiting for AIP initialization…'}
                      </td>
                    </tr>
                  )}
                  {visible.map(({ device, lastSeen }) => {
                    const isSelected = device.mac === selectedMac
                    return (
                      <tr
                        key={device.mac}
                        onClick={() => selectDevice(isSelected ? null : device.mac)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          if (!aipReady) return
                          setCtxMenu({ x: e.clientX, y: e.clientY, mac: device.mac, name: device.name })
                          window.electronAPI.aip.getChannels().then(setCtxChannels).catch(console.error)
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 dark:bg-primary/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                        }`}
                      >
                        {/* Type */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {deviceTypeName(device.device_type)}
                            </span>
                          </div>
                        </td>
                        {/* Model */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {deviceModel(device)}
                        </td>
                        {/* Name */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {device.name}
                          </span>
                        </td>
                        {/* Channel type */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          Audio
                        </td>
                        {/* Channel */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          —
                        </td>
                        {/* Status */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge label="Online" variant="success" />
                        </td>
                        {/* Volume */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <VolumeBar value={device.volume} />
                        </td>
                        {/* IP */}
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                          {device.network.ip}
                        </td>
                        {/* MAC */}
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {device.mac}
                        </td>
                        {/* Last seen */}
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                          {formatLastSeen(lastSeen)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Group by */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Group by</span>
              {(['none', 'areas', 'groups'] as GroupBy[]).map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="groupBy"
                    value={g}
                    checked={groupBy === g}
                    onChange={() => setGroupBy(g)}
                    className="accent-primary"
                  />
                  <span className="text-xs capitalize text-gray-600 dark:text-gray-300">{g}</span>
                </label>
              ))}
            </div>

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Filter */}
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={filterEnabled}
                  onChange={(e) => setFilter(e.target.checked)}
                  className="rounded accent-primary"
                />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Filter</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Type</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  disabled={!filterEnabled}
                  className="h-7 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 disabled:opacity-40 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  {['None', 'Receiver', 'Transmitter', 'Amplifier', 'Controller'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ml-auto text-xs tabular-nums text-gray-400">
              Showing {visible.length} of {allEntries.length}
            </div>
          </div>
        </div>

        {/* ── Actions panel ── */}
        <div className="w-56 shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Actions
            </h2>
          </div>
          <ActionsPanel
            device={selectedEntry?.device ?? null}
            lastSeen={selectedEntry?.lastSeen ?? null}
          />
        </div>
      </div>

      {ctxMenu && (
        <DeviceContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          mac={ctxMenu.mac}
          name={ctxMenu.name}
          channels={ctxChannels}
          onClose={() => setCtxMenu(null)}
          onAssign={(channelId) => {
            window.electronAPI.aip.linkChannelToDevice(channelId, ctxMenu.mac).catch(console.error)
            setCtxMenu(null)
          }}
          onStop={() => {
            window.electronAPI.aip.stopAudio(ctxMenu.mac).catch(console.error)
            setCtxMenu(null)
          }}
        />
      )}
    </>
  )
}
