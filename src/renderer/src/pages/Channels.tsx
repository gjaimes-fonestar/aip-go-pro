import { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import CreateChannelModal, { type NewChannelForm } from '../components/channels/CreateChannelModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayState   = 'playing' | 'paused' | 'stopped'
type SourceType  = 'local' | 'online' | 'windows'

interface Track {
  id:       string
  label:    string
  duration: string
}

interface Channel {
  id:           string
  name:         string
  sourceType:   SourceType
  streamUrl:    string
  quality:      string
  audioChannels: string
  loopAll:      boolean
  shuffle:      boolean
  permanent:    boolean
  state:        PlayState
  currentTrack: number
  elapsed:      string
  tracks:       Track[]
  devices:      string[]
}

// ─── Mock data ────────────────────────────────────────────────────────────────

let _nextId = 3
const genId = () => String(_nextId++)

const INITIAL: Channel[] = [
  {
    id: '1', name: 'Channel 1', sourceType: 'online',
    streamUrl: 'http://167.114.131.90:5626/',
    quality: 'Normal', audioChannels: 'Stereo',
    loopAll: false, shuffle: false, permanent: false,
    state: 'playing', currentTrack: 0, elapsed: '00:04:12',
    tracks: [
      { id: 't1', label: 'http://167.114.131.90:5626/', duration: '∞' },
    ],
    devices: ['Player 103', 'Player 104'],
  },
  {
    id: '2', name: 'Channel 2', sourceType: 'local',
    streamUrl: 'Files',
    quality: 'High', audioChannels: 'Stereo',
    loopAll: true, shuffle: true, permanent: true,
    state: 'stopped', currentTrack: 0, elapsed: '00:00:00',
    tracks: [
      { id: 't2', label: 'morning-playlist.mp3',  duration: '03:45' },
      { id: 't3', label: 'ambient-background.mp3', duration: '05:20' },
      { id: 't4', label: 'corporate-hold.mp3',     duration: '02:10' },
    ],
    devices: ['Amp Zone A'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_VARIANT: Record<SourceType, 'info' | 'success' | 'warning'> = {
  local:   'info',
  online:  'success',
  windows: 'warning',
}

const SOURCE_LABEL: Record<SourceType, string> = {
  local:   'Local',
  online:  'Online',
  windows: 'Capture',
}

const STATE_COLORS: Record<PlayState, string> = {
  playing: 'bg-green-400',
  paused:  'bg-yellow-400',
  stopped: 'bg-gray-400',
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
  Device: () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete channel</h3>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete <span className="font-semibold text-gray-700 dark:text-gray-300">"{name}"</span>?
          This action cannot be undone.
        </p>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Channel row ──────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  onStateChange,
  onDelete,
}: {
  channel:       Channel
  onStateChange: (id: string, state: PlayState) => void
  onDelete:      (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isPlaying = channel.state === 'playing'
  const isPaused  = channel.state === 'paused'
  const current   = channel.tracks[channel.currentTrack]

  const handlePlay  = (e: React.MouseEvent) => { e.stopPropagation(); onStateChange(channel.id, isPlaying ? 'paused' : 'playing') }
  const handleStop  = (e: React.MouseEvent) => { e.stopPropagation(); onStateChange(channel.id, 'stopped') }
  const handlePrev  = (e: React.MouseEvent) => { e.stopPropagation() }
  const handleNext  = (e: React.MouseEvent) => { e.stopPropagation() }
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* ── Collapsed / summary row ── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
          className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
        >
          {/* Status dot */}
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATE_COLORS[channel.state]}`} />

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{channel.name}</span>
              <Badge label={SOURCE_LABEL[channel.sourceType]} variant={SOURCE_VARIANT[channel.sourceType]} />
              {channel.permanent && <Badge label="Permanent" variant="default" />}
              {channel.loopAll  && <Badge label="Loop"    variant="default" />}
              {channel.shuffle  && <Badge label="Shuffle" variant="default" />}
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
              {isPlaying || isPaused
                ? <><span className="text-primary font-medium">{current?.label ?? '—'}</span> · {channel.elapsed}</>
                : channel.streamUrl
              }
            </p>
          </div>

          {/* Info chips */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 shrink-0">
            <span className="flex items-center gap-1"><Ico.Music />{channel.tracks.length}</span>
            <span className="flex items-center gap-1"><Ico.Device />{channel.devices.length}</span>
            <span>{channel.quality} · {channel.audioChannels}</span>
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

              {/* Progress */}
              <div className="flex flex-1 items-center gap-3 mx-2">
                <span className="shrink-0 tabular-nums text-xs text-gray-500 dark:text-gray-400 w-14 text-right">
                  {channel.elapsed}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: isPlaying ? '35%' : '0%' }}
                  />
                </div>
              </div>

              {/* Flags */}
              <TransportBtn onClick={(e) => e.stopPropagation()} active={channel.loopAll} title="Loop">
                <Ico.Loop />
              </TransportBtn>
              <TransportBtn onClick={(e) => e.stopPropagation()} active={channel.shuffle} title="Shuffle">
                <Ico.Shuffle />
              </TransportBtn>
            </div>

            <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {/* Tracks */}
              <div className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Ico.Music /> Tracks
                </p>
                {channel.tracks.length === 0 ? (
                  <p className="text-xs text-gray-400">No tracks.</p>
                ) : (
                  <ul className="space-y-1">
                    {channel.tracks.map((t, i) => (
                      <li
                        key={t.id}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                          i === channel.currentTrack && isPlaying
                            ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span className="truncate flex items-center gap-2">
                          {i === channel.currentTrack && isPlaying && (
                            <span className="flex h-3 items-end gap-px">
                              {[1, 2, 3].map((b) => (
                                <span key={b} className="w-0.5 rounded-sm bg-primary animate-pulse" style={{ height: `${b * 4}px`, animationDelay: `${b * 100}ms` }} />
                              ))}
                            </span>
                          )}
                          {i + 1}. {t.label}
                        </span>
                        <span className="shrink-0 ml-3 tabular-nums text-gray-400">{t.duration}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Devices */}
              <div className="p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Ico.Device /> Assigned devices
                </p>
                {channel.devices.length === 0 ? (
                  <p className="text-xs text-gray-400">No devices assigned.</p>
                ) : (
                  <ul className="space-y-1">
                    {channel.devices.map((d) => (
                      <li key={d} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        {d}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Channels() {
  const [channels, setChannels]   = useState<Channel[]>(INITIAL)
  const [showCreate, setCreate]   = useState(false)

  const handleCreate = (form: NewChannelForm) => {
    const newCh: Channel = {
      id:           genId(),
      name:         form.name,
      sourceType:   form.sourceType,
      streamUrl:    form.sourceType === 'local'   ? `Files (${form.startWith})`
                  : form.sourceType === 'windows' ? form.windowsDevice
                  : 'Online stream',
      quality:      form.quality.charAt(0).toUpperCase() + form.quality.slice(1),
      audioChannels: form.audioChannels === 'mono' ? 'Mono' : 'Stereo',
      loopAll:      form.loopAll,
      shuffle:      form.shuffle,
      permanent:    form.permanent,
      state:        form.startOnCreate ? 'playing' : 'stopped',
      currentTrack: 0,
      elapsed:      '00:00:00',
      tracks:       [],
      devices:      [],
    }
    setChannels((prev) => [...prev, newCh])
  }

  const handleStateChange = (id: string, state: PlayState) =>
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, state } : c))

  const handleDelete = (id: string) =>
    setChannels((prev) => prev.filter((c) => c.id !== id))

  const playingCount = channels.filter((c) => c.state === 'playing').length

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Channels</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {channels.length} channel{channels.length !== 1 ? 's' : ''}
              {playingCount > 0 && <> · <span className="text-green-600 dark:text-green-400 font-medium">{playingCount} playing</span></>}
            </p>
          </div>

          <button
            onClick={() => setCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create channel
          </button>
        </div>

        {/* Channel list */}
        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 dark:border-gray-700 dark:bg-gray-800">
            <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No channels yet</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Click "Create channel" to add the first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                onStateChange={handleStateChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
