import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Badge } from '../components/ui/Badge'
import { VolumeBar } from '../components/ui/VolumeBar'
import { InterfaceSelectModal } from '../components/ui/InterfaceSelectModal'
import { DeviceConfigPanel } from '../components/devices/DeviceConfigPanel'
import { useDevicesStore } from '../store/devices.store'
import { useDeviceConfigStore } from '../store/device-config.store'
import type { AipDeviceJson, AipChannelInfo } from '@shared/ipc'

// PlayerState dot colours
const CH_STATE_DOT: Record<number, string> = {
  0: 'bg-gray-400',
  1: 'bg-green-400',
  2: 'bg-yellow-400',
  3: 'bg-gray-400',
  4: 'bg-red-400',
}

// ─── Device helpers ───────────────────────────────────────────────────────────

function deviceTypeName(type: number): string {
  switch (type) {
    case 1: return 'Receiver'
    case 2: return 'Transmitter'
    case 3: return 'Amplifier'
    case 4: return 'Gate'
    default: return `Type-${type.toString(16).toUpperCase()}`
  }
}

function deviceModel(d: AipDeviceJson): string {
  return `AIP-${deviceTypeName(d.device_type).toUpperCase()}`
}

function formatLastSeen(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ─── Context menu ─────────────────────────────────────────────────────────────

function DeviceContextMenu({
  x, y, mac, name, channels, onClose, onAssign, onStop, onConfigure,
}: {
  x: number; y: number; mac: string; name: string
  channels: AipChannelInfo[]
  onClose:     () => void
  onAssign:    (id: number) => void
  onStop:      () => void
  onConfigure: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey   = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onClick = (e: MouseEvent)    => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown',   onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown',   onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: x, top: y, zIndex: 1000, minWidth: '200px' }}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <p className="max-w-[180px] truncate text-xs font-semibold text-gray-800 dark:text-gray-200">{name}</p>
        <p className="font-mono text-xs text-gray-400">{mac}</p>
      </div>

      <button
        onClick={onConfigure}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configure device
      </button>

      {channels.length > 0 && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-700" />
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
        </>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700" />
      <button
        onClick={onStop}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z" />
        </svg>
        Stop playback
      </button>
    </div>
  )
}

// ─── Actions panel (left side) ────────────────────────────────────────────────

function ActionsPanel({
  device, lastSeen, sipConfigured, onConfigure,
}: {
  device:        AipDeviceJson | null
  lastSeen:      number | null
  sipConfigured: boolean
  onConfigure:   () => void
}) {
  const optimisticVolume = useDevicesStore((s) => s.optimisticVolume)
  const [sliderVolume,      setSliderVolume]      = useState(50)
  const [availableChannels, setAvailableChannels] = useState<AipChannelInfo[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<number | ''>('')

  useEffect(() => {
    if (device) setSliderVolume(device.volume)
  }, [device?.mac, device?.volume])

  useEffect(() => {
    if (!device) { setAvailableChannels([]); setSelectedChannelId(''); return }
    window.electronAPI.aip.getChannels().then(setAvailableChannels).catch(console.error)
  }, [device?.mac])

  const handleVolumeCommit = useCallback((vol: number) => {
    if (!device) return
    optimisticVolume(device.mac, vol)
    window.electronAPI.aip.setVolume(device.mac, vol).catch(console.error)
  }, [device, optimisticVolume])

  if (!device) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <svg className="h-10 w-10 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
        <p className="text-center text-xs text-gray-400">
          Select a device<br />Double-click to configure
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Identity */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {deviceTypeName(device.device_type)}
        </p>
        <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">{device.name}</p>
        <p className="text-xs text-gray-500">{device.network.ip}</p>
        <p className="font-mono text-[10px] text-gray-400">{device.mac}</p>
        {lastSeen && (
          <p className="mt-1 text-[10px] text-gray-400">Last seen {formatLastSeen(lastSeen)}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {device.volume_locked   && <Badge label="Vol Locked"  variant="warning" />}
          {device.channels_locked && <Badge label="Ch Locked"   variant="warning" />}
          {sipConfigured          && <Badge label="SIP"         variant="success" />}
        </div>
      </div>

      {/* Volume */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Volume</span>
          <span className="text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300">
            {sliderVolume}%
          </span>
        </div>
        <input
          type="range" min={0} max={100} value={sliderVolume}
          disabled={device.volume_locked}
          onChange={(e) => setSliderVolume(Number(e.target.value))}
          onMouseUp={() => handleVolumeCommit(sliderVolume)}
          onTouchEnd={() => handleVolumeCommit(sliderVolume)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
        />
      </div>

      {/* Channel assignment */}
      <div className="flex flex-col gap-2">
        <select
          value={selectedChannelId}
          onChange={(e) => setSelectedChannelId(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">Select channel…</option>
          {availableChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>{ch.name}</option>
          ))}
        </select>
        <button
          disabled={selectedChannelId === ''}
          onClick={() => {
            if (!device || selectedChannelId === '') return
            window.electronAPI.aip.linkChannelToDevice(selectedChannelId as number, device.mac).catch(console.error)
          }}
          className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Play Channel
        </button>
        <button
          onClick={() => window.electronAPI.aip.stopAudio(device.mac).catch(console.error)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Stop Playback
        </button>
        <button
          onClick={onConfigure}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configure
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type GroupBy = 'none' | 'areas' | 'groups'

const COLUMNS = [
  { key: 'type',   label: 'Type'      },
  { key: 'model',  label: 'Model'     },
  { key: 'name',   label: 'Name'      },
  { key: 'status', label: 'Status'    },
  { key: 'volume', label: 'Volume'    },
  { key: 'ip',     label: 'IP'        },
  { key: 'mac',    label: 'MAC'       },
  { key: 'time',   label: 'Last seen' },
] as const

export default function Devices() {
  const { entries, selectedMac, aipReady, setAipReady, selectDevice, loadAll, applyEvent } =
    useDevicesStore()
  const { applySipConfigEvent, applySoundMeterConfigEvent, getSipConfig, getSoundMeterConfig } =
    useDeviceConfigStore()

  const [groupBy,      setGroupBy]    = useState<GroupBy>('none')
  const [filterEnabled, setFilter]   = useState(false)
  const [filterType,   setFilterType] = useState<string>('None')
  const [search,       setSearch]    = useState('')
  const [configOpen,   setConfigOpen] = useState(false)
  const unsubRefs = useRef<Array<() => void>>([])

  const [ctxMenu,     setCtxMenu]     = useState<{ x: number; y: number; mac: string; name: string } | null>(null)
  const [ctxChannels, setCtxChannels] = useState<AipChannelInfo[]>([])

  // ── Push event subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    const unsubDevice     = window.electronAPI.aip.onDeviceEvent((json) => applyEvent(json))
    const unsubSip        = window.electronAPI.aip.onSipConfigEvent((e)  => applySipConfigEvent(e))
    const unsubSoundMeter = window.electronAPI.aip.onSoundMeterConfigEvent((e) => applySoundMeterConfigEvent(e))
    unsubRefs.current = [unsubDevice, unsubSip, unsubSoundMeter]

    if (aipReady) {
      window.electronAPI.aip.getDevices().then(loadAll).catch(console.error)
    }

    return () => { unsubRefs.current.forEach((fn) => fn()); unsubRefs.current = [] }
  }, [aipReady])

  const handleInitialized = useCallback(async () => {
    setAipReady(true)
    await new Promise((r) => setTimeout(r, 2000))
    window.electronAPI.aip.getDevices().then(loadAll).catch(console.error)
  }, [setAipReady, loadAll])

  const allEntries = useMemo(() => Array.from(entries.values()), [entries])

  const visible = useMemo(() => allEntries.filter(({ device }) => {
    if (search &&
      !device.name.toLowerCase().includes(search.toLowerCase()) &&
      !device.network.ip.includes(search) &&
      !deviceModel(device).toLowerCase().includes(search.toLowerCase())
    ) return false
    if (filterEnabled && filterType !== 'None' && deviceTypeName(device.device_type) !== filterType)
      return false
    return true
  }), [allEntries, search, filterEnabled, filterType])

  const selectedEntry  = selectedMac ? entries.get(selectedMac) ?? null : null
  const selectedDevice = selectedEntry?.device ?? null
  const sipCfgEntry    = selectedMac ? getSipConfig(selectedMac)        : undefined
  const smCfgEntry     = selectedMac ? getSoundMeterConfig(selectedMac) : undefined

  const openConfig = useCallback(() => setConfigOpen(true), [])

  return (
    <>
      {!aipReady && <InterfaceSelectModal onConfirm={handleInitialized} />}

      {/* ── Layout: actions | table | config panel ── */}
      <div className="flex h-full gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">

        {/* Left actions sidebar */}
        <div className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Device actions
            </h2>
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 41px)' }}>
            <ActionsPanel
              device={selectedDevice}
              lastSeen={selectedEntry?.lastSeen ?? null}
              sipConfigured={!!sipCfgEntry?.config.configured}
              onConfigure={openConfig}
            />
          </div>
        </div>

        {/* Center: header + table + bottom bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-700">
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">Network Devices</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {allEntries.length} registered · double-click to configure
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm placeholder-gray-400 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={() => window.electronAPI.aip.getDevices().then(loadAll).catch(console.error)}
                disabled={!aipReady}
                title="Refresh"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/50">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="py-16 text-center text-sm text-gray-400">
                      {aipReady ? 'No devices match the filter.' : 'Waiting for AIP initialization…'}
                    </td>
                  </tr>
                )}
                {visible.map(({ device, lastSeen }) => {
                  const isSelected = device.mac === selectedMac
                  const hasSip     = getSipConfig(device.mac)?.config.configured === true
                  return (
                    <tr
                      key={device.mac}
                      onClick={() => selectDevice(isSelected ? null : device.mac)}
                      onDoubleClick={() => {
                        selectDevice(device.mac)
                        setConfigOpen(true)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (!aipReady) return
                        setCtxMenu({ x: e.clientX, y: e.clientY, mac: device.mac, name: device.name })
                        window.electronAPI.aip.getChannels().then(setCtxChannels).catch(console.error)
                      }}
                      className={`cursor-pointer select-none transition-colors ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-primary/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {deviceTypeName(device.device_type)}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                        {deviceModel(device)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {device.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <Badge label="Online" variant="success" />
                          {hasSip && <Badge label="SIP" variant="info" />}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <VolumeBar value={device.volume} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {device.network.ip}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {device.mac}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                        {formatLastSeen(lastSeen)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom filter bar */}
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 px-5 py-2.5 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Group</span>
              {(['none', 'areas', 'groups'] as GroupBy[]).map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-1">
                  <input type="radio" name="groupBy" value={g} checked={groupBy === g}
                    onChange={() => setGroupBy(g)} className="accent-primary" />
                  <span className="text-xs capitalize text-gray-600 dark:text-gray-300">{g}</span>
                </label>
              ))}
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1">
                <input type="checkbox" checked={filterEnabled} onChange={(e) => setFilter(e.target.checked)}
                  className="rounded accent-primary" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Filter</span>
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                disabled={!filterEnabled}
                className="h-7 rounded border border-gray-200 bg-white px-2 text-xs text-gray-700 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                {['None', 'Receiver', 'Transmitter', 'Amplifier', 'Gate'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <span className="ml-auto text-xs tabular-nums text-gray-400">
              {visible.length} / {allEntries.length}
            </span>
          </div>
        </div>

        {/* Right config panel — edge toggle */}
        <div className="relative flex">
          {/* Toggle handle */}
          <button
            onClick={() => setConfigOpen((o) => !o)}
            disabled={!selectedDevice}
            title={configOpen ? 'Close panel' : 'Open device config'}
            className={`flex h-full w-5 items-center justify-center border-l transition-colors
              ${configOpen
                ? 'border-primary/30 bg-primary/5 text-primary dark:bg-primary/10'
                : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:bg-gray-800'
              }
              disabled:cursor-not-allowed disabled:opacity-30`}
          >
            <svg
              className={`h-3 w-3 transition-transform ${configOpen ? 'rotate-0' : 'rotate-180'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Sliding panel */}
          {selectedDevice && (
            <DeviceConfigPanel
              device={selectedDevice}
              sipConfig={sipCfgEntry?.config}
              soundMeterConfig={smCfgEntry?.config}
              open={configOpen}
              onClose={() => setConfigOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <DeviceContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          mac={ctxMenu.mac}
          name={ctxMenu.name}
          channels={ctxChannels}
          onClose={() => setCtxMenu(null)}
          onConfigure={() => {
            selectDevice(ctxMenu.mac)
            setConfigOpen(true)
            setCtxMenu(null)
          }}
          onAssign={(id) => {
            window.electronAPI.aip.linkChannelToDevice(id, ctxMenu.mac).catch(console.error)
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
