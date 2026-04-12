import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useStreamsStore } from '../store/streams.store'
import type { Stream } from '@shared/stream'

// URL validation using the HTML Audio API

type ValidationState = 'idle' | 'checking' | 'ok' | 'error'

async function validateStreamUrl(url: string): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    if (!url.trim()) {
      resolve({ ok: false, message: '' })
      return
    }
    const audio = new Audio()
    let settled = false
    const finish = (ok: boolean, message: string) => {
      if (settled) return
      settled = true
      audio.src = ''
      resolve({ ok, message })
    }
    const timer = setTimeout(() => finish(false, 'Timeout — no response after 8 s'), 8000)
    audio.addEventListener('canplay', () => { clearTimeout(timer); finish(true, 'Stream reachable') })
    audio.addEventListener('error', () => {
      clearTimeout(timer)
      finish(false, 'Cannot reach stream — check the URL and try again')
    })
    audio.preload = 'metadata'
    audio.src = url
    audio.load()
  })
}

// Add / Edit modal

interface StreamModalProps {
  stream: Partial<Stream> | null
  onSave: (data: Omit<Stream, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

function StreamModal({ stream, onSave, onDelete, onClose }: StreamModalProps) {
  const { t } = useTranslation('streams')
  const isNew = !stream?.id

  const [name, setName]               = useState(stream?.name ?? '')
  const [url, setUrl]                 = useState(stream?.url ?? '')
  const [description, setDescription] = useState(stream?.description ?? '')
  const [validation, setValidation]   = useState<ValidationState>('idle')
  const [validMsg, setValidMsg]       = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const inp = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'

  const handleValidate = async () => {
    setValidation('checking')
    setValidMsg('')
    const result = await validateStreamUrl(url)
    setValidation(result.ok ? 'ok' : 'error')
    setValidMsg(result.message)
  }

  const handleSave = async () => {
    if (validation !== 'ok') {
      const result = await validateStreamUrl(url)
      setValidation(result.ok ? 'ok' : 'error')
      setValidMsg(result.message)
      if (!result.ok) return
    }
    onSave({ name, url, description: description || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold">{isNew ? t('modal.add') : t('modal.edit')}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('modal.name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('modal.namePlaceholder')} className={inp} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('modal.url')}</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setValidation('idle'); setValidMsg('') }}
                placeholder={t('modal.urlPlaceholder')}
                className={`${inp} flex-1`}
              />
              <button
                type="button"
                onClick={handleValidate}
                disabled={!url.trim() || validation === 'checking'}
                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {validation === 'checking' ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : t('modal.validate')}
              </button>
            </div>
            {validation === 'ok' && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {validMsg}
              </p>
            )}
            {validation === 'error' && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {validMsg}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('modal.description')}</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('modal.descriptionPlaceholder')} className={inp} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">{t('modal.deleteConfirm', { name })}</span>
                  <button onClick={() => onDelete(stream!.id!)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">{t('modal.delete')}</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-600">{t('common:buttons.cancel', 'Cancel')}</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">{t('modal.delete')}</button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800">{t('common:buttons.cancel', 'Cancel')}</button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !url.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {t('common:buttons.save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mini player component

interface MiniPlayerProps {
  stream: Stream
  isPlaying: boolean
  onPlay: () => void
  onStop: () => void
}

function MiniPlayer({ stream, isPlaying, onPlay, onStop }: MiniPlayerProps) {
  return (
    <button
      type="button"
      onClick={isPlaying ? onStop : onPlay}
      title={isPlaying ? 'Stop' : 'Play'}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        isPlaying
          ? 'bg-primary/10 text-primary dark:bg-primary/20'
          : 'border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
    >
      {isPlaying ? (
        <>
          <span className="flex gap-0.5">
            <span className="h-3 w-0.5 animate-[bounce_0.8s_ease-in-out_infinite] rounded-full bg-current" style={{ animationDelay: '0ms' }} />
            <span className="h-3 w-0.5 animate-[bounce_0.8s_ease-in-out_infinite] rounded-full bg-current" style={{ animationDelay: '150ms' }} />
            <span className="h-3 w-0.5 animate-[bounce_0.8s_ease-in-out_infinite] rounded-full bg-current" style={{ animationDelay: '300ms' }} />
          </span>
          {stream.name}
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
          {stream.name}
        </>
      )}
    </button>
  )
}

// Main Streams page

export default function Streams() {
  const { t } = useTranslation('streams')
  const { streams, loading, setStreams, upsertStream, removeStream, setLoading } = useStreamsStore()

  const [modalStream, setModalStream] = useState<Partial<Stream> | null | undefined>(undefined)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setLoading(true)
    window.electronAPI.stream
      .list()
      .then(setStreams)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [setStreams, setLoading])

  // Sync audio element with playing state
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener('ended', () => setPlayingId(null))
      audioRef.current.addEventListener('error', () => setPlayingId(null))
    }
    const audio = audioRef.current
    if (playingId) {
      const stream = streams.find((s) => s.id === playingId)
      if (stream) {
        audio.src = stream.url
        audio.play().catch(() => setPlayingId(null))
      }
    } else {
      audio.pause()
      audio.src = ''
    }
  }, [playingId, streams])

  // Stop audio when unmounting
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const handlePlay = useCallback((id: string) => {
    setPlayingId((prev) => (prev === id ? null : id))
  }, [])

  const handleSave = useCallback(async (data: Omit<Stream, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (modalStream?.id) {
      const updated = await window.electronAPI.stream.update({ id: modalStream.id, changes: data })
      if (updated) upsertStream(updated)
    } else {
      const created = await window.electronAPI.stream.create({ stream: data })
      upsertStream(created)
    }
    setModalStream(undefined)
  }, [modalStream, upsertStream])

  const handleDelete = useCallback(async (id: string) => {
    if (playingId === id) setPlayingId(null)
    await window.electronAPI.stream.delete(id)
    removeStream(id)
    setModalStream(undefined)
  }, [playingId, removeStream])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setModalStream(null)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('add')}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && streams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('empty.title')}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('empty.help')}</p>
        </div>
      )}

      {!loading && streams.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('table.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('table.url')}</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400 md:table-cell">{t('table.description')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {streams.map((stream) => (
                <tr key={stream.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900 dark:text-white">{stream.name}</span>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="block truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{stream.url}</span>
                  </td>
                  <td className="hidden max-w-sm px-4 py-3 md:table-cell">
                    <span className="truncate text-xs text-zinc-400">{stream.description ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <MiniPlayer
                        stream={stream}
                        isPlaying={playingId === stream.id}
                        onPlay={() => handlePlay(stream.id)}
                        onStop={() => setPlayingId(null)}
                      />
                      <button
                        onClick={() => setModalStream(stream)}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        title={t('table.edit')}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Now-playing bar */}
      {playingId && (() => {
        const s = streams.find((st) => st.id === playingId)
        if (!s) return null
        return (
          <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <span className="flex gap-0.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="h-4 w-1 animate-[bounce_0.8s_ease-in-out_infinite] rounded-full bg-primary" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white">{s.name}</p>
              <p className="max-w-[240px] truncate font-mono text-[10px] text-zinc-400">{s.url}</p>
            </div>
            <button
              onClick={() => setPlayingId(null)}
              className="ml-2 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          </div>
        )
      })()}

      {modalStream !== undefined && (
        <StreamModal
          stream={modalStream}
          onSave={handleSave}
          onDelete={!modalStream?.id ? undefined : handleDelete}
          onClose={() => setModalStream(undefined)}
        />
      )}
    </div>
  )
}
