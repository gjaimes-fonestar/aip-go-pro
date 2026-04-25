import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../components/ui/Badge'
import { VolumeBar } from '../components/ui/VolumeBar'
import { InterfaceSelectModal } from '../components/ui/InterfaceSelectModal'
import { DeviceConfigPanel } from '../components/devices/DeviceConfigPanel'
import { useDevicesStore } from '../store/devices.store'
import { useDeviceConfigStore } from '../store/device-config.store'
import {
  getModelName,
  getTypeLabelKey,
  hasVolumeControl,
  isWebserverDevice,
  isPlayerDevice,
  isConfigurableDevice,
} from '../utils/deviceTypes'
import { StreamType, getStreamTypeLabel } from '../utils/streamTypes'
import type { AipDeviceJson, AipChannelInfo, AipNetworkChannel } from '@shared/ipc'

// PlayerState dot colours
const CH_STATE_DOT: Record<number, string> = {
  0: 'bg-gray-400',
  1: 'bg-green-400',
  2: 'bg-yellow-400',
  3: 'bg-gray-400',
  4: 'bg-red-400',
}

function formatLastSeen(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ─── Context menu ─────────────────────────────────────────────────────────────

function DeviceContextMenu({
  x, y, mac, name, isPlayer, isConfigurable, channels, networkChannels, onClose, onAssign, onAssignNetwork, onStop, onConfigure,
}: {
  x: number; y: number; mac: string; name: string; isPlayer: boolean; isConfigurable: boolean
  channels:        AipChannelInfo[]
  networkChannels: AipNetworkChannel[]
  onClose:          () => void
  onAssign:         (id: number) => void
  onAssignNetwork:  (channelMac: string, channelNumber: number) => void
  onStop:           () => void
  onConfigure:      () => void
}) {
  const { t } = useTranslation('devices')
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

  // Group remote (non-local) network channels by sourceMac
  const remoteByMac = useMemo(() => {
    const map = new Map<string, AipNetworkChannel[]>()
    for (const ch of networkChannels) {
      if (ch.local) continue
      const list = map.get(ch.sourceMac) ?? []
      list.push(ch)
      map.set(ch.sourceMac, list)
    }
    return map
  }, [networkChannels])

  const hasLocalChannels  = channels.length > 0
  const hasRemoteChannels = remoteByMac.size > 0
  const hasAnyChannels    = hasLocalChannels || hasRemoteChannels

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: x, top: y, zIndex: 1000, minWidth: '220px' }}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <p className="max-w-[200px] truncate text-xs font-semibold text-gray-800 dark:text-gray-200">{name}</p>
        <p className="font-mono text-xs text-gray-400">{mac}</p>
      </div>

      {isConfigurable && (
        <button
          onClick={onConfigure}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('contextMenu.configureDevice')}
        </button>
      )}

      {isPlayer && hasAnyChannels && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-700" />

          {hasLocalChannels && (
            <>
              <p className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t('contextMenu.localChannels')}
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

          {hasRemoteChannels && Array.from(remoteByMac.entries()).map(([srcMac, chs]) => (
            <div key={srcMac}>
              {hasLocalChannels && <div className="border-t border-gray-100/60 dark:border-gray-700/60" />}
              <p className="px-3 pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t('contextMenu.remoteChannels', { mac: srcMac })}
              </p>
              {chs.map((ch) => (
                <button
                  key={`${ch.sourceMac}-${ch.channelNumber}`}
                  onClick={() => onAssignNetwork(ch.sourceMac, ch.channelNumber)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                  <span className="truncate">{ch.name || `Ch ${ch.channelNumber}`}</span>
                </button>
              ))}
            </div>
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
        {t('contextMenu.stopPlayback')}
      </button>
    </div>
  )
}

// ─── Device summary bar ───────────────────────────────────────────────────────

const SUMMARY_GROUPS = [
  {
    key:   'total',
    label: 'Total',
    match: (_: number) => true,
    icon:  (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    key:   'players',
    label: 'Players',
    match: (t: number) => t === 0x00 || t === 0x01,
    icon:  (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
      </svg>
    ),
  },
  {
    key:   'pcs',
    label: "PC's",
    match: (t: number) => t === 0x02,
    icon:  (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
      </svg>
    ),
  },
  {
    key:   'gates',
    label: 'Gates',
    match: (t: number) => t === 0x07 || t === 0x09,
    icon:  (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    key:   'streamers',
    label: 'Streamers',
    match: (t: number) => t === 0x08,
    icon:  (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    key:   'mics',
    label: 'Mics',
    match: (t: number) => t === 0x03 || t === 0x04,
    icon:  (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    key:   'others',
    label: 'Others',
    match: (t: number) => ![0x00,0x01,0x02,0x03,0x04,0x07,0x08,0x09].includes(t),
    icon:  (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
] as const

function DeviceSummaryBar({ entries }: { entries: AipDeviceJson[] }) {
  return (
    <div className="flex shrink-0 items-stretch divide-x divide-gray-100 border-t border-gray-200 dark:divide-gray-700/60 dark:border-gray-700">
      {SUMMARY_GROUPS.map(({ key, label, match, icon }) => {
        const count = entries.filter((d) => match(d.device_type)).length
        return (
          <div key={key} className="flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2">
            <span className={`${key === 'total' ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
              {icon}
            </span>
            <span className={`text-sm font-bold tabular-nums ${key === 'total' ? 'text-primary' : 'text-gray-800 dark:text-gray-100'}`}>
              {count}
            </span>
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function AccordionSection({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function ActionsPanel({
  device, lastSeen, sipConfigured, onConfigure,
}: {
  device:        AipDeviceJson | null
  lastSeen:      number | null
  sipConfigured: boolean
  onConfigure:   () => void
}) {
  const { t } = useTranslation('devices')
  const optimisticVolume = useDevicesStore((s) => s.optimisticVolume)
  const caps = device ? {
    hasVolume:      hasVolumeControl(device.device_type),
    isPlayer:       isPlayerDevice(device.device_type),
    isConfigurable: isConfigurableDevice(device.device_type),
  } : null

  const [openSections,     setOpenSections]     = useState<Record<string, boolean>>({ info: true, volume: true, channel: true })
  const [sliderVolume,     setSliderVolume]      = useState(50)
  const [availableChannels, setAvailableChannels] = useState<AipChannelInfo[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<number | ''>('')

  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }))

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
          {t('selectDevice')}<br />{t('doubleClickConfigure')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Device info */}
      <AccordionSection title={t(getTypeLabelKey(device.device_type))} open={!!openSections.info} onToggle={() => toggle('info')}>
        <p className="font-semibold text-gray-900 dark:text-white">{device.name}</p>
        <p className="text-xs text-gray-500">{device.network.ip}</p>
        <p className="font-mono text-[10px] text-gray-400">{device.mac}</p>
        {lastSeen && (
          <p className="mt-1 text-[10px] text-gray-400">{t('lastSeen')} {formatLastSeen(lastSeen)}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {device.volume_locked   && <Badge label={t('badges.volLocked')} variant="warning" />}
          {device.channels_locked && <Badge label={t('badges.chLocked')}  variant="warning" />}
          {sipConfigured          && <Badge label={t('badges.sip')}        variant="success" />}
        </div>
      </AccordionSection>

      {/* Volume */}
      {caps?.hasVolume && (
        <AccordionSection title={t('columns.volume')} open={!!openSections.volume} onToggle={() => toggle('volume')}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Level</span>
            <span className="text-xs font-medium tabular-nums text-gray-700 dark:text-gray-300">{sliderVolume}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={sliderVolume}
            disabled={device.volume_locked}
            onChange={(e) => setSliderVolume(Number(e.target.value))}
            onMouseUp={() => handleVolumeCommit(sliderVolume)}
            onTouchEnd={() => handleVolumeCommit(sliderVolume)}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
          />
        </AccordionSection>
      )}

      {/* Channel assignment */}
      {caps?.isPlayer && (
        <AccordionSection title={t('columns.channel')} open={!!openSections.channel} onToggle={() => toggle('channel')}>
          <div className="flex flex-col gap-2">
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value === '' ? '' : Number(e.target.value))}
              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="">{t('selectChannel')}</option>
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
              {t('playChannel')}
            </button>
            <button
              onClick={() => window.electronAPI.aip.stopAudio(device.mac).catch(console.error)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {t('stopPlayback')}
            </button>
          </div>
        </AccordionSection>
      )}

      {/* Configure */}
      {caps?.isConfigurable && (
        <AccordionSection title={t('contextMenu.configureDevice')} open={!!openSections.configure} onToggle={() => toggle('configure')}>
          <button
            onClick={onConfigure}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('contextMenu.configureDevice')}
          </button>
        </AccordionSection>
      )}
    </div>
  )
}


const COLUMN_KEYS = ['type', 'model', 'name', 'status', 'channel', 'channelType', 'source', 'volume', 'ip', 'mac', 'lastSeen'] as const
type ColumnKey = (typeof COLUMN_KEYS)[number]

export default function Devices() {
  const { t } = useTranslation('devices')
  const navigate = useNavigate()
  const { entries, selectedMac, aipReady, setAipReady, selectDevice, loadAll, applyEvent } =
    useDevicesStore()
  const { applySipConfigEvent, applySoundMeterConfigEvent, getSipConfig, getSoundMeterConfig } =
    useDeviceConfigStore()

  const [search, setSearch] = useState('')
  const [configOpen,    setConfigOpen] = useState(false)
  const unsubRefs = useRef<Array<() => void>>([])

  const [ctxMenu,     setCtxMenu]     = useState<{ x: number; y: number; mac: string; name: string; deviceType: number } | null>(null)
  const [ctxChannels, setCtxChannels] = useState<AipChannelInfo[]>([])

  // Network channels from repository — used to show which channel is assigned to each device
  const [networkChannels, setNetworkChannels] = useState<AipNetworkChannel[]>([])

  // Map from device MAC → channel info (name, streamType, sourceMac)
  const deviceChannelMap = useMemo<Map<string, { name: string; streamType: number; sourceMac: string }>>(() => {
    const map = new Map<string, { name: string; streamType: number; sourceMac: string }>()
    for (const ch of networkChannels) {
      for (const mac of ch.linkedDevices) {
        map.set(mac, { name: ch.name, streamType: ch.streamType, sourceMac: ch.sourceMac })
      }
    }
    return map
  }, [networkChannels])

  // ── Push event subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    const unsubDevice     = window.electronAPI.aip.onDeviceEvent((json) => applyEvent(json))
    const unsubSip        = window.electronAPI.aip.onSipConfigEvent((e)  => applySipConfigEvent(e))
    const unsubSoundMeter = window.electronAPI.aip.onSoundMeterConfigEvent((e) => applySoundMeterConfigEvent(e))
    const unsubNetCh      = window.electronAPI.aip.onNetworkChannelEvent(() => {
      window.electronAPI.aip.getNetworkChannels().then(setNetworkChannels).catch(console.error)
    })
    unsubRefs.current = [unsubDevice, unsubSip, unsubSoundMeter, unsubNetCh]

    if (aipReady) {
      window.electronAPI.aip.getDevices().then(loadAll).catch(console.error)
      window.electronAPI.aip.getNetworkChannels().then(setNetworkChannels).catch(console.error)
    }

    return () => { unsubRefs.current.forEach((fn) => fn()); unsubRefs.current = [] }
  }, [aipReady])

  // ── 5-second periodic refresh ─────────────────────────────────────────────
  useEffect(() => {
    if (!aipReady) return
    const tick = setInterval(() => {
      window.electronAPI.aip.getDevices().then(loadAll).catch(console.error)
      window.electronAPI.aip.getNetworkChannels().then(setNetworkChannels).catch(console.error)
    }, 5_000)
    return () => clearInterval(tick)
  }, [aipReady])

  const handleInitialized = useCallback(async () => {
    setAipReady(true)
    await new Promise((r) => setTimeout(r, 2000))
    window.electronAPI.aip.getDevices().then(loadAll).catch(console.error)
  }, [setAipReady, loadAll])

  const allEntries = useMemo(() => Array.from(entries.values()), [entries])

  const visible = useMemo(() => allEntries.filter(({ device }) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      device.name.toLowerCase().includes(q) ||
      device.network.ip.includes(q) ||
      getModelName(device.device_type, device.device_sub_type).toLowerCase().includes(q)
    )
  }), [allEntries, search])

  const selectedEntry  = selectedMac ? entries.get(selectedMac) ?? null : null
  const selectedDevice = selectedEntry?.device ?? null
  const sipCfgEntry    = selectedMac ? getSipConfig(selectedMac)        : undefined
  const smCfgEntry     = selectedMac ? getSoundMeterConfig(selectedMac) : undefined

  const openConfig = useCallback(() => {
    if (!selectedDevice || !isConfigurableDevice(selectedDevice.device_type)) return
    if (isWebserverDevice(selectedDevice.device_type)) navigate('/webserver')
    else setConfigOpen(true)
  }, [selectedDevice, navigate])

  return (
    <>
      {!aipReady && <InterfaceSelectModal onConfirm={handleInitialized} />}

      {/* ── Layout: actions | table | config panel ── */}
      <div className="flex h-full gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">

        {/* Left actions sidebar */}
        <div className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('deviceActions')}
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
              <h1 className="text-base font-bold text-gray-900 dark:text-white">{t('pageHeading')}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('pageSubtitle', { count: allEntries.length })}
                {search && visible.length !== allEntries.length && (
                  <span className="ml-1 text-primary">{visible.length} shown</span>
                )}
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
                  placeholder={t('search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm placeholder-gray-400 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={() => {
                  window.electronAPI.aip.getDevices().then(loadAll).catch(console.error)
                  window.electronAPI.aip.getNetworkChannels().then(setNetworkChannels).catch(console.error)
                }}
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
                  {COLUMN_KEYS.map((key) => (
                    <th key={key}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t(`columns.${key}` as `columns.${ColumnKey}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={COLUMN_KEYS.length} className="py-16 text-center text-sm text-gray-400">
                      {aipReady ? t('noDevicesFilter') : t('waitingAip')}
                    </td>
                  </tr>
                )}
                {visible.map(({ device, lastSeen }) => {
                  const isSelected   = device.mac === selectedMac
                  const hasSip       = getSipConfig(device.mac)?.config.configured === true
                  const model        = getModelName(device.device_type, device.device_sub_type)
                  const showVolume   = hasVolumeControl(device.device_type)
                  // Prefer live stream_config from device broadcast; fall back to linked-channel map.
                  const sc           = device.stream_config?.active ? device.stream_config : undefined
                  const chInfo       = sc
                    ? { name: sc.name, streamType: sc.stream_type, sourceMac: sc.source_mac }
                    : deviceChannelMap.get(device.mac)
                  return (
                    <tr
                      key={device.mac}
                      onClick={() => {
                        if (!isConfigurableDevice(device.device_type)) return
                        selectDevice(isSelected ? null : device.mac)
                      }}
                      onDoubleClick={() => {
                        if (!isConfigurableDevice(device.device_type)) return
                        selectDevice(device.mac)
                        if (isWebserverDevice(device.device_type)) navigate('/webserver')
                        else setConfigOpen(true)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (!aipReady) return
                        setCtxMenu({ x: e.clientX, y: e.clientY, mac: device.mac, name: device.name, deviceType: device.device_type })
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
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                            style={device.button_color
                              ? { backgroundColor: `rgb(${device.button_color.r},${device.button_color.g},${device.button_color.b})` }
                              : { backgroundColor: '#9ca3af' }
                            }
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {t(getTypeLabelKey(device.device_type))}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                        {model}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {device.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <Badge label={t('badges.online')} variant="success" />
                          {hasSip && <Badge label={t('badges.sip')} variant="info" />}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {chInfo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                            <span className="max-w-[120px] truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                              {chInfo.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {chInfo && chInfo.streamType >= 0 ? getStreamTypeLabel(chInfo.streamType) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {chInfo ? (
                          chInfo.streamType === StreamType.Voip ? (
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-3.5 w-3.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <svg className="relative h-3.5 w-3.5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.47 11.47 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.47 11.47 0 00.57 3.58 1 1 0 01-.25 1.02l-2.2 2.19z" />
                                </svg>
                              </span>
                              <span className="animate-pulse font-medium text-green-600 dark:text-green-400">
                                {t('labels.callingInProgress')}
                              </span>
                            </div>
                          ) : (
                            <>
                              <p>{entries.get(chInfo.sourceMac)?.device.name ?? chInfo.sourceMac}</p>
                              <p className="font-mono text-gray-400 dark:text-gray-500">{chInfo.sourceMac}</p>
                            </>
                          )
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {showVolume ? <VolumeBar value={device.volume} /> : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
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

          {/* Device type summary bar */}
          <DeviceSummaryBar entries={allEntries.map((e) => e.device)} />

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
          isPlayer={isPlayerDevice(ctxMenu.deviceType)}
          isConfigurable={isConfigurableDevice(ctxMenu.deviceType)}
          channels={ctxChannels}
          networkChannels={networkChannels}
          onClose={() => setCtxMenu(null)}
          onConfigure={() => {
            selectDevice(ctxMenu.mac)
            const ctxDev = entries.get(ctxMenu.mac)?.device
            if (ctxDev && isConfigurableDevice(ctxDev.device_type)) {
              if (isWebserverDevice(ctxDev.device_type)) navigate('/webserver')
              else setConfigOpen(true)
            }
            setCtxMenu(null)
          }}
          onAssign={(id) => {
            window.electronAPI.aip.linkChannelToDevice(id, ctxMenu.mac).catch(console.error)
            setCtxMenu(null)
          }}
          onAssignNetwork={(channelMac, channelNumber) => {
            window.electronAPI.aip.linkNetworkChannelToDevice(channelMac, channelNumber, ctxMenu.mac).catch(console.error)
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
