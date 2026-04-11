import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../components/ui/Badge'
import CreateChannelModal, { type NewChannelForm } from '../components/channels/CreateChannelModal'
import { useDevicesStore } from '../store/devices.store'
import type {
  AipChannelInfo,
  AipChannelConfig,
  AipDeviceJson,
  AipChannelPlayerEvent,
  AipNetworkChannel,
} from '@shared/ipc'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SourceType = 'local' | 'online' | 'windows'

const QUALITY_MAP: Record<string, 0 | 1 | 2> = { low: 0, normal: 1, high: 2 }
const AUDIO_MAP:   Record<string, 1 | 2>     = { mono: 1, stereo: 2 }

// PlayerState: 0=Idle 1=Playing 2=Paused 3=Stopped 4=Error
const STATE_DOT: Record<number, string> = {
  0: 'bg-gray-400',
  1: 'bg-green-400',
  2: 'bg-yellow-400',
  3: 'bg-gray-400',
  4: 'bg-red-400',
}

const SOURCE_VARIANT: Record<SourceType, 'info' | 'success' | 'warning'> = {
  local: 'info', online: 'success', windows: 'warning',
}

const SOURCE_LABEL: Record<SourceType, string> = {
  local: 'Local', online: 'Online', windows: 'Capture',
}

function detectSourceType(urls: string[]): SourceType {
  const u = (urls[0] ?? '').toLowerCase()
  if (u.startsWith('http') || u.startsWith('rtsp')) return 'online'
  if (u.startsWith('wasapi'))                        return 'windows'
  return 'local'
}

/** Convert an absolute filesystem path from Electron's file dialog to a file:// URI for GStreamer. */
function toFileUri(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}

function qualityLabel(q: number): string {
  return (['Low', 'Normal', 'High'] as const)[q] ?? '—'
}

function audioLabel(m: number): string {
  return m === 1 ? 'Mono' : 'Stereo'
}

function urlLabel(url: string): string {
  // Strip file:// prefix before extracting the filename
  const clean = url.replace(/^file:\/\//, '').replace(/\\/g, '/')
  return clean.split('/').pop() || url
}

// ─── Transport icons ──────────────────────────────────────────────────────────

const Ico = {
  Prev: () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  ),
  Play: () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  Next: () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  ),
  Stop: () => (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  ),
  Loop: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Shuffle: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16h4l3-8h4m0 0l2 2m-2-2l2-2M4 8h4l1.5 4m4.5 4l2 2m0 0l-2 2m2-2h-4" />
    </svg>
  ),
  Trash: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Chevron: ({ open }: { open: boolean }) => (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Music: () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
}

// ─── Transport button ─────────────────────────────────────────────────────────

function TransportBtn({
  onClick, active = false, children, title,
}: {
  onClick: (e: React.MouseEvent) => void
  active?: boolean
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: {
  name: string; onConfirm: () => void; onCancel: () => void
}) {
  const { t } = useTranslation('channels')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/20">
          <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('deleteChannel')}</h3>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {t('deleteChannelConfirm', { name })}
        </p>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Channel row ──────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  devices,
  errorMessage,
  onPlay,
  onStop,
  onPrev,
  onNext,
  onDelete,
  onDismissError,
}: {
  channel:       AipChannelInfo
  devices:       AipDeviceJson[]
  errorMessage?: string
  onPlay:        (id: number, isPlaying: boolean) => void
  onStop:        (id: number) => void
  onPrev:        (id: number) => void
  onNext:        (id: number) => void
  onDelete:      (id: number) => void
  onDismissError:(id: number) => void
}) {
  const { t } = useTranslation('channels')
  const [expanded, setExpanded]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sourceType = detectSourceType(channel.urls)
  const isPlaying  = channel.state === 1
  const isPaused   = channel.state === 2
  const currentUrl = channel.currentUrl || channel.urls[channel.trackIndex] || ''

  const handlePlay  = (e: React.MouseEvent) => { e.stopPropagation(); onPlay(channel.id, isPlaying) }
  const handleStop  = (e: React.MouseEvent) => { e.stopPropagation(); onStop(channel.id) }
  const handlePrev  = (e: React.MouseEvent) => { e.stopPropagation(); onPrev(channel.id) }
  const handleNext  = (e: React.MouseEvent) => { e.stopPropagation(); onNext(channel.id) }
  const handleDel   = (e: React.MouseEvent) => { e.stopPropagation(); setConfirmDelete(true) }

  return (
    <>
      {confirmDelete && (
        <DeleteConfirm
          name={channel.name}
          onConfirm={() => { setConfirmDelete(false); onDelete(channel.id) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className={`overflow-hidden rounded-xl border shadow-sm ${
        errorMessage
          ? 'border-red-300 bg-white dark:border-red-700 dark:bg-gray-800'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}>
        {/* ── Error banner ── */}
        {errorMessage && (
          <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800 dark:bg-red-900/20">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="flex-1 text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onDismissError(channel.id) }}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              title="Dismiss"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {/* ── Collapsed / summary row ── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
          className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
        >
          {/* Status dot */}
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATE_DOT[channel.state] ?? 'bg-gray-400'}`} />

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{channel.name}</span>
              <Badge label={t(`badges.${sourceType === 'windows' ? 'capture' : sourceType}` as 'badges.local' | 'badges.online' | 'badges.capture')} variant={SOURCE_VARIANT[sourceType]} />
              {channel.loop    && <Badge label={t('badges.loop')}    variant="default" />}
              {channel.shuffle && <Badge label={t('badges.shuffle')} variant="default" />}
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
              {isPlaying || isPaused
                ? <span className="text-primary font-medium">{urlLabel(currentUrl)}</span>
                : (channel.urls[0] ? urlLabel(channel.urls[0]) : '—')
              }
            </p>
          </div>

          {/* Info chips */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 shrink-0">
            <span className="flex items-center gap-1"><Ico.Music />{channel.trackCount}</span>
            <span>{qualityLabel(channel.quality)} · {audioLabel(channel.audioMode)}</span>
          </div>

          {/* Mini transport */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <TransportBtn onClick={handlePlay} active={isPlaying} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Ico.Pause /> : <Ico.Play />}
            </TransportBtn>
            <TransportBtn onClick={handleStop} title="Stop">
              <Ico.Stop />
            </TransportBtn>
            <TransportBtn onClick={handleDel} title="Delete channel">
              <Ico.Trash />
            </TransportBtn>
          </div>

          <Ico.Chevron open={expanded} />
        </div>

        {/* ── Expanded detail ── */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-gray-700">
            {/* Full transport bar */}
            <div className="flex items-center gap-2 bg-gray-50 px-5 py-3 dark:bg-gray-900/40">
              <TransportBtn onClick={handlePrev} title="Previous"><Ico.Prev /></TransportBtn>
              <TransportBtn onClick={handlePlay} active={isPlaying} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Ico.Pause /> : <Ico.Play />}
              </TransportBtn>
              <TransportBtn onClick={handleNext} title="Next"><Ico.Next /></TransportBtn>
              <TransportBtn onClick={handleStop} title="Stop"><Ico.Stop /></TransportBtn>

              <div className="flex flex-1 items-center gap-3 mx-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: isPlaying ? '35%' : '0%' }}
                  />
                </div>
              </div>

              {/* Flags */}
              <TransportBtn onClick={(e) => e.stopPropagation()} active={channel.loop} title="Loop">
                <Ico.Loop />
              </TransportBtn>
              <TransportBtn onClick={(e) => e.stopPropagation()} active={channel.shuffle} title="Shuffle">
                <Ico.Shuffle />
              </TransportBtn>
            </div>

            {/* Track list + devices — two-column grid on wider screens */}
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
              {/* Tracks */}
              <div className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Ico.Music /> {t('labels.tracks')}
                </p>
                {channel.urls.length === 0 ? (
                  <p className="text-xs text-gray-400">{t('labels.noTracks')}</p>
                ) : (
                  <ul className="space-y-1">
                    {channel.urls.map((url, i) => (
                      <li
                        key={i}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                          i === channel.trackIndex && isPlaying
                            ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span className="truncate flex items-center gap-2">
                          {i === channel.trackIndex && isPlaying && (
                            <span className="flex h-3 items-end gap-px">
                              {[1, 2, 3].map((b) => (
                                <span key={b} className="w-0.5 rounded-sm bg-primary animate-pulse" style={{ height: `${b * 4}px`, animationDelay: `${b * 100}ms` }} />
                              ))}
                            </span>
                          )}
                          {i + 1}. {urlLabel(url)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Devices */}
              <div className="border-t border-gray-100 p-4 sm:border-l sm:border-t-0 dark:border-gray-700">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t('labels.linkedDevices')}
                </p>
                {devices.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('labels.noDevices')}</p>
                ) : (
                  <ul className="space-y-1">
                    {devices.map((d) => (
                      <li key={d.mac} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{d.name}</p>
                          <p className="font-mono text-xs text-gray-400 dark:text-gray-500">{d.network.ip}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => window.electronAPI.aip.linkChannelToDevice(channel.id, d.mac).catch(console.error)}
                            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary/90"
                          >
                            {t('assign')}
                          </button>
                          <button
                            onClick={() => window.electronAPI.aip.stopAudio(d.mac).catch(console.error)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            {t('stop')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Network channel row ──────────────────────────────────────────────────────

const STREAM_TYPE_LABEL: Record<number, string> = {
  0: 'Unicast', 1: 'Multicast', 2: 'Broadcast',
}

function NetworkChannelRow({
  channel,
  onRemove,
}: {
  channel: AipNetworkChannel
  onRemove: (mac: string, channelNumber: number) => void
}) {
  const { t } = useTranslation('channels')
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      {confirmDelete && (
        <DeleteConfirm
          name={channel.name}
          onConfirm={() => { setConfirmDelete(false); onRemove(channel.sourceMac, channel.channelNumber) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Local indicator */}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${channel.local ? 'bg-primary' : 'bg-gray-400'}`}
          title={channel.local ? 'Local' : 'Remote'} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{channel.name}</span>
            <Badge label={channel.local ? t('badges.local') : t('badges.online')} variant={channel.local ? 'info' : 'default'} />
            {channel.encrypted && <Badge label={t('badges.encrypted')} variant="warning" />}
            {channel.repeat    && <Badge label={t('badges.repeat')}    variant="default" />}
          </div>
          <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">
            {channel.multicastAddress}:{channel.port}
            {' · '}ch {channel.channelNumber}
            {' · '}{STREAM_TYPE_LABEL[channel.streamType] ?? `Type ${channel.streamType}`}
          </p>
        </div>

        {/* Source MAC */}
        <div className="hidden lg:block shrink-0 text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('labels.source')}</p>
          <p className="font-mono text-xs text-gray-600 dark:text-gray-300">{channel.sourceMac}</p>
        </div>

        {/* Remove */}
        <button
          onClick={() => setConfirmDelete(true)}
          title="Remove channel"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors dark:hover:bg-red-900/20"
        >
          <Ico.Trash />
        </button>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALLOWED_STREAM_SCHEMES = ['http://', 'https://', 'rtsp://', 'rtsps://']

const DISCOVERY_MS = 120_000  // 2 minutes — wait for AIP multicast discovery

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

export default function Channels() {
  const { t } = useTranslation('channels')
  const { aipReady, entries, discoveryStartedAt } = useDevicesStore()

  const [activeTab, setActiveTab] = useState<'playback' | 'network'>('playback')

  const [channels, setChannels] = useState<AipChannelInfo[]>([])
  const [showCreate, setCreate] = useState(false)
  const [channelErrors, setChannelErrors] = useState<Record<number, string>>({})
  const unsubRef = useRef<(() => void) | null>(null)

  const [networkChannels, setNetworkChannels] = useState<AipNetworkChannel[]>([])

  // ── Discovery phase: countdown derived from store timestamp ───────────────
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!discoveryStartedAt) return 0
    return Math.max(0, Math.ceil((DISCOVERY_MS - (Date.now() - discoveryStartedAt)) / 1000))
  })
  const discovering = secondsLeft > 0

  // Countdown tick — runs only while discovering, survives page navigation
  useEffect(() => {
    if (!discoveryStartedAt) return

    const update = () => {
      const left = Math.max(0, Math.ceil((DISCOVERY_MS - (Date.now() - discoveryStartedAt)) / 1000))
      setSecondsLeft(left)
    }
    update()
    const tick = setInterval(update, 1000)
    return () => clearInterval(tick)
  }, [discoveryStartedAt])

  const devices = useMemo<AipDeviceJson[]>(
    () => Array.from(entries.values()).map((e) => e.device),
    [entries]
  )

  const refreshChannels = useCallback(async (delayMs = 0) => {
    if (!aipReady) return
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
    const list = await window.electronAPI.aip.getChannels()
    setChannels(list)
  }, [aipReady])

  const refreshNetworkChannels = useCallback(async () => {
    if (!aipReady) return
    const list = await window.electronAPI.aip.getNetworkChannels()
    setNetworkChannels(list)
  }, [aipReady])

  useEffect(() => {
    refreshChannels().catch(console.error)
  }, [aipReady])

  useEffect(() => {
    refreshNetworkChannels().catch(console.error)
  }, [aipReady])

  // Subscribe to channel player events pushed from the main process.
  useEffect(() => {
    if (!aipReady) return

    unsubRef.current = window.electronAPI.aip.onChannelEvent((ev: AipChannelPlayerEvent) => {
      if (ev.event === 'channel_error') {
        setChannelErrors((prev) => ({ ...prev, [ev.channel_id]: ev.message ?? 'Unknown error' }))
      }
      // Refresh state on transitions that change PlayerState
      const refreshEvents = new Set([
        'channel_started', 'channel_stopped', 'channel_paused',
        'channel_resumed', 'channel_finished', 'channel_track_changed',
      ])
      if (refreshEvents.has(ev.event)) {
        refreshChannels(150).catch(console.error)
      }
    })

    return () => {
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [aipReady, refreshChannels])

  const handleCreate = useCallback(async (form: NewChannelForm) => {
    let urls: string[] = []

    if (form.sourceType === 'local') {
      const files = await window.electronAPI.dialog.openFile({
        title: 'Select audio files',
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] }],
        multiSelections: true,
      })
      if (!files || files.length === 0) return
      // GStreamer's uridecodebin requires file:// URIs, not raw filesystem paths
      urls = files.map(toFileUri)
    } else if (form.sourceType === 'online') {
      const trimmed = form.streamUrl.trim()
      if (!trimmed) return
      const lower = trimmed.toLowerCase()
      if (!ALLOWED_STREAM_SCHEMES.some((s) => lower.startsWith(s))) {
        console.error('createChannel: rejected URL with unsupported scheme:', trimmed)
        return
      }
      urls = [trimmed]
    } else {
      urls = [`wasapi://${form.windowsDevice}`]
    }

    const config: AipChannelConfig = {
      name:      form.name,
      urls,
      quality:   QUALITY_MAP[form.quality],
      audioMode: AUDIO_MAP[form.audioChannels],
      loop:      form.loopAll,
      shuffle:   form.shuffle,
    }

    try {
      const id = await window.electronAPI.aip.createChannel(config)
      if (form.startOnCreate) {
        await window.electronAPI.aip.playChannel(id).catch(console.error)
      }
      await refreshChannels()
    } catch (e) {
      console.error('createChannel failed:', e)
    }
  }, [refreshChannels])

  const handlePlay = useCallback(async (id: number, isPlaying: boolean) => {
    if (isPlaying) {
      await window.electronAPI.aip.pauseChannel(id).catch(console.error)
    } else {
      await window.electronAPI.aip.playChannel(id).catch(console.error)
    }
    // Small delay for the GLib main-loop thread to settle the new state.
    await refreshChannels(200)
  }, [refreshChannels])

  const handleStop = useCallback(async (id: number) => {
    await window.electronAPI.aip.stopChannel(id).catch(console.error)
    await refreshChannels()
  }, [refreshChannels])

  const handlePrev = useCallback(async (id: number) => {
    await window.electronAPI.aip.previousChannel(id).catch(console.error)
    await refreshChannels(300)
  }, [refreshChannels])

  const handleNext = useCallback(async (id: number) => {
    await window.electronAPI.aip.nextChannel(id).catch(console.error)
    await refreshChannels(300)
  }, [refreshChannels])

  const handleDelete = useCallback(async (id: number) => {
    await window.electronAPI.aip.stopChannel(id).catch(console.error)
    await window.electronAPI.aip.destroyChannel(id).catch(console.error)
    await refreshChannels()
  }, [refreshChannels])

  const handleRemoveNetworkChannel = useCallback(async (mac: string, channelNumber: number) => {
    await window.electronAPI.aip.removeNetworkChannelByKey(mac, channelNumber).catch(console.error)
    await refreshNetworkChannels()
  }, [refreshNetworkChannels])

  const playingCount = channels.filter((c) => c.state === 1).length

  return (
    <>
      <CreateChannelModal
        open={showCreate}
        onClose={() => setCreate(false)}
        onCreate={handleCreate}
      />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeTab === 'playback'
                ? <>{channels.length} channel{channels.length !== 1 ? 's' : ''}{playingCount > 0 && <> · <span className="text-green-600 dark:text-green-400 font-medium">{playingCount} playing</span></>}</>
                : <>{networkChannels.length} network channel{networkChannels.length !== 1 ? 's' : ''}</>
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('playback')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'playback'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {t('tabs.playback')}
              </button>
              <button
                onClick={() => { setActiveTab('network'); refreshNetworkChannels().catch(console.error) }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'network'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {t('tabs.network')}
              </button>
            </div>

            {activeTab === 'playback' && (
              <button
                onClick={() => setCreate(true)}
                disabled={!aipReady || discovering}
                title={discovering ? `Network discovery in progress — ready in ${formatCountdown(secondsLeft)}` : undefined}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {discovering ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {formatCountdown(secondsLeft)}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('actions.createChannel')}
                  </>
                )}
              </button>
            )}

            {activeTab === 'network' && (
              <button
                onClick={() => refreshNetworkChannels().catch(console.error)}
                disabled={!aipReady}
                title={t('actions.refresh')}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('actions.refresh')}
              </button>
            )}
          </div>
        </div>

        {/* Playback channels tab */}
        {activeTab === 'playback' && (
          !aipReady ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('empty.notInitialized')}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('empty.goToDevices')}</p>
            </div>
          ) : discovering ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-blue-200 bg-blue-50 py-16 dark:border-blue-800 dark:bg-blue-900/20">
              <svg className="h-10 w-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {t('status.discovering')}
                </p>
                <p className="mt-1 text-xs text-blue-500 dark:text-blue-400">
                  {t('status.available', { countdown: formatCountdown(secondsLeft) })}
                </p>
                <p className="mt-0.5 text-xs text-blue-400 dark:text-blue-500">
                  {t('status.requestingStreams')}
                </p>
              </div>
              {channels.length > 0 && (
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  {channels.length} existing channel{channels.length !== 1 ? 's' : ''} loaded
                </p>
              )}
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
              <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('empty.noChannels')}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('empty.clickCreate')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((ch) => (
                <ChannelRow
                  key={ch.id}
                  channel={ch}
                  devices={devices}
                  errorMessage={channelErrors[ch.id]}
                  onPlay={handlePlay}
                  onStop={handleStop}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onDelete={handleDelete}
                  onDismissError={(id) =>
                    setChannelErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
                  }
                />
              ))}
            </div>
          )
        )}

        {/* Network channels tab */}
        {activeTab === 'network' && (
          !aipReady ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('empty.notInitialized')}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('empty.goToDevices')}</p>
            </div>
          ) : networkChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
              <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No network channels in repository</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Channels discovered via AIP multicast will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {networkChannels.map((ch) => (
                <NetworkChannelRow
                  key={`${ch.sourceMac}-${ch.channelNumber}`}
                  channel={ch}
                  onRemove={handleRemoveNetworkChannel}
                />
              ))}
            </div>
          )
        )}
      </div>
    </>
  )
}
