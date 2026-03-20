import { useState, useMemo } from 'react'
import { Badge } from '../components/ui/Badge'
import { VolumeBar } from '../components/ui/VolumeBar'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceType      = 'Player' | 'Amplifier' | 'Controller' | 'Panel'
type ChannelType     = 'Audio' | 'Video' | 'Data'
type StatusProtocol  = 'SIP' | 'RTP' | 'HTTP' | 'Offline'
type GroupBy         = 'none' | 'areas' | 'groups'

interface Device {
  id: string
  type: DeviceType
  model: string
  name: string
  channelType: ChannelType
  channel: string
  status: StatusProtocol
  volume: number
  ip: string
  mac: string
  time: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DEVICES: Device[] = [
  { id: '1',  type: 'Player',     model: 'AIP-PLAYER',  name: 'Player 103',   channelType: 'Audio', channel: 'Channel 1', status: 'SIP',     volume: 24,  ip: '192.168.1.113', mac: 'FC-C2-3D-50-17-18', time: '10:42:31' },
  { id: '2',  type: 'Player',     model: 'AIP-PLAYER',  name: 'Player 104',   channelType: 'Audio', channel: 'Channel 1', status: 'RTP',     volume: 60,  ip: '192.168.1.114', mac: 'FC-C2-3D-50-17-19', time: '10:42:31' },
  { id: '3',  type: 'Amplifier',  model: 'AIP-AMP4',    name: 'Amp Zone A',   channelType: 'Audio', channel: 'Channel 2', status: 'SIP',     volume: 45,  ip: '192.168.1.120', mac: 'FC-C2-3D-50-18-01', time: '10:42:30' },
  { id: '4',  type: 'Controller', model: 'AIP-CTL',     name: 'Main Control', channelType: 'Data',  channel: 'Channel 0', status: 'HTTP',    volume: 0,   ip: '192.168.1.100', mac: 'FC-C2-3D-50-10-AA', time: '10:42:29' },
  { id: '5',  type: 'Panel',      model: 'AIP-PANEL2',  name: 'Panel Lobby',  channelType: 'Audio', channel: 'Channel 3', status: 'SIP',     volume: 30,  ip: '192.168.1.130', mac: 'FC-C2-3D-50-20-BB', time: '10:42:28' },
  { id: '6',  type: 'Player',     model: 'AIP-PLAYER',  name: 'Player 105',   channelType: 'Audio', channel: 'Channel 1', status: 'Offline', volume: 0,   ip: '192.168.1.115', mac: 'FC-C2-3D-50-17-20', time: '—'         },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(s: StatusProtocol): 'sip' | 'rtp' | 'http' | 'danger' {
  return s === 'SIP' ? 'sip' : s === 'RTP' ? 'rtp' : s === 'HTTP' ? 'http' : 'danger'
}

function statusDot(s: StatusProtocol) {
  return s === 'Offline'
    ? 'bg-gray-300 dark:bg-gray-600'
    : 'bg-green-400'
}

// ─── Actions panel ────────────────────────────────────────────────────────────

function ActionsPanel({ device }: { device: Device | null }) {
  const [bgVolume, setBgVolume] = useState(50)

  if (!device) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-gray-400 text-center">
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
    label: string
    variant?: 'primary' | 'secondary' | 'danger'
    onClick?: () => void
  }) => {
    const cls =
      variant === 'primary'   ? 'bg-primary text-white hover:bg-primary-600' :
      variant === 'danger'    ? 'bg-red-500 text-white hover:bg-red-600' :
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
        <p className="text-xs text-gray-500">{device.model} · {device.ip}</p>
        <div className="mt-2">
          <Badge label={device.status} variant={statusVariant(device.status)} />
        </div>
      </div>

      {/* Background music volume */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Background Music Volume
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={bgVolume}
            onChange={(e) => setBgVolume(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary dark:bg-gray-700"
          />
          <span className="w-8 text-right text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">
            {bgVolume}%
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <ActionBtn label="Play Channel"     variant="primary" />
        <ActionBtn label="Stop Playback"    />
        <ActionBtn label="Instant Message"  />
        <ActionBtn label="Voice Message"    />
        <ActionBtn label="Configure Device" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Devices() {
  const [selected, setSelected]     = useState<string | null>(null)
  const [groupBy, setGroupBy]       = useState<GroupBy>('none')
  const [filterEnabled, setFilter]  = useState(false)
  const [filterType, setFilterType] = useState<string>('None')
  const [search, setSearch]         = useState('')

  const selectedDevice = useMemo(
    () => MOCK_DEVICES.find((d) => d.id === selected) ?? null,
    [selected]
  )

  const visible = useMemo(() => {
    return MOCK_DEVICES.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) &&
          !d.ip.includes(search) && !d.model.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (filterEnabled && filterType !== 'None' && d.type !== filterType) return false
      return true
    })
  }, [search, filterEnabled, filterType])

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
  ]

  return (
    <div className="flex h-full gap-4">
      {/* ── Main panel ── */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">

        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Network Devices</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {MOCK_DEVICES.length} devices registered · {MOCK_DEVICES.filter(d => d.status !== 'Offline').length} online
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

            {/* Refresh stub */}
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-auto h-full">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
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
                      No devices match the current filter.
                    </td>
                  </tr>
                )}
                {visible.map((device) => {
                  const isSelected = device.id === selected
                  return (
                    <tr
                      key={device.id}
                      onClick={() => setSelected(isSelected ? null : device.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-primary/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      {/* Type */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${statusDot(device.status)}`} />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {device.type}
                          </span>
                        </div>
                      </td>
                      {/* Model */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {device.model}
                      </td>
                      {/* Name */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {device.name}
                        </span>
                      </td>
                      {/* Channel type */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {device.channelType}
                      </td>
                      {/* Channel */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {device.channel}
                      </td>
                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge
                          label={device.status}
                          variant={statusVariant(device.status)}
                        />
                      </td>
                      {/* Volume */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {device.status !== 'Offline'
                          ? <VolumeBar value={device.volume} />
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      {/* IP */}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {device.ip}
                      </td>
                      {/* MAC */}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {device.mac}
                      </td>
                      {/* Last seen */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                        {device.time}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom bar: group by + filter */}
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Group by */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Group by</span>
            {(['none', 'areas', 'groups'] as GroupBy[]).map((g) => (
              <label key={g} className="flex items-center gap-1.5 cursor-pointer">
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

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Filter */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
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
                {['None', 'Player', 'Amplifier', 'Controller', 'Panel'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Device count */}
          <div className="ml-auto text-xs text-gray-400 tabular-nums">
            Showing {visible.length} of {MOCK_DEVICES.length}
          </div>
        </div>
      </div>

      {/* ── Actions panel ── */}
      <div className="w-56 shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-y-auto">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Actions
          </h2>
        </div>
        <ActionsPanel device={selectedDevice} />
      </div>
    </div>
  )
}
