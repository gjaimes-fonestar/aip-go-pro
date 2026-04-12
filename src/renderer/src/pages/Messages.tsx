import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { useCalendarStore } from '../store/calendar.store'
import { useDevicesStore } from '../store/devices.store'
import type { CalendarEvent, CalendarAction, RecurrenceRule, Weekday, RecurrenceEnd } from '@shared/calendar'
import { addMonths, addMinutes } from 'date-fns'

// helpers

const AUDIO_TYPES = ['file', 'playlist', 'online'] as const
type AudioActionType = typeof AUDIO_TYPES[number]

function isAudioEvent(ev: CalendarEvent): boolean {
  return AUDIO_TYPES.includes(ev.action.type as AudioActionType)
}

function scheduleSummary(ev: CalendarEvent): string {
  const time = format(parseISO(ev.dtStart), 'HH:mm')
  if (!ev.recurrence) {
    return format(parseISO(ev.dtStart), 'MMM d, yyyy') + ' · ' + time
  }
  const { freq, interval, byDay } = ev.recurrence
  const dayMap: Record<string, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' }
  if (freq === 'weekly' && byDay?.length) {
    return byDay.map((d) => dayMap[d]).join(', ') + ' · ' + time
  }
  const labels: Record<string, string> = {
    minutely: `${interval} min`, hourly: `${interval}h`,
    daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly',
  }
  return labels[freq] + ' · ' + time
}

function toDatetimeLocal(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}
function fromDatetimeLocal(val: string): string {
  return new Date(val).toISOString()
}

// Message modal — audio events only

const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const COLOR_PRESETS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6']

interface MessageModalProps {
  event: Partial<CalendarEvent> | null
  onSave: (ev: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

function MessageModal({ event, onSave, onDelete, onClose }: MessageModalProps) {
  const { t } = useTranslation('calendar')
  const { t: tm } = useTranslation('messages')
  const deviceEntries = useDevicesStore((s) => s.entries)
  const devices = useMemo(() => Array.from(deviceEntries.values()).map((e) => e.device), [deviceEntries])
  const isNew = !event?.id

  const initStart = event?.dtStart ? toDatetimeLocal(event.dtStart) : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  const initEnd   = event?.dtEnd   ? toDatetimeLocal(event.dtEnd)   : format(addMinutes(new Date(), 30), "yyyy-MM-dd'T'HH:mm")

  const [title, setTitle]           = useState(event?.title ?? '')
  const [color, setColor]           = useState(event?.color ?? COLOR_PRESETS[0])
  const [dtStart, setDtStart]       = useState(initStart)
  const [dtEnd, setDtEnd]           = useState(initEnd)
  const [volume, setVolume]         = useState(event?.volume ?? 80)
  const [enabled, setEnabled]       = useState(event?.enabled ?? true)
  const [targetDevices, setTargetDevices] = useState<string[]>(event?.targetDevices ?? [])

  const [actionType, setActionType] = useState<AudioActionType>(
    event?.action && AUDIO_TYPES.includes(event.action.type as AudioActionType) ? (event.action.type as AudioActionType) : 'file',
  )
  const [filePath, setFilePath]         = useState(event?.action?.type === 'file' ? event.action.filePath : '')
  const [playlistFiles, setPlaylistFiles] = useState<string[]>(event?.action?.type === 'playlist' ? event.action.filePaths : [])
  const [streamUrl, setStreamUrl]       = useState(event?.action?.type === 'online' ? event.action.streamUrl : '')

  const [durationSecs, setDurationSecs] = useState(() =>
    Math.max(0, Math.round((new Date(initEnd).getTime() - new Date(initStart).getTime()) / 1000))
  )
  const durationMins    = Math.floor(durationSecs / 60)
  const durationRemSecs = durationSecs % 60

  const handleStartChange = (val: string) => {
    setDtStart(val)
    setDtEnd(format(addMinutes(new Date(val), Math.ceil(durationSecs / 60)), "yyyy-MM-dd'T'HH:mm"))
  }
  const handleEndChange = (val: string) => {
    setDtEnd(val)
    setDurationSecs(Math.max(0, Math.round((new Date(val).getTime() - new Date(dtStart).getTime()) / 1000)))
  }
  const handleDurationChange = (mins: number, secs: number) => {
    const total = Math.max(0, mins * 60 + secs)
    setDurationSecs(total)
    setDtEnd(format(new Date(new Date(dtStart).getTime() + total * 1000), "yyyy-MM-dd'T'HH:mm"))
  }

  const [repeatFreq, setRepeatFreq] = useState<RecurrenceRule['freq'] | 'none'>(
    event?.recurrence ? event.recurrence.freq : 'none',
  )
  const [repeatInterval, setRepeatInterval] = useState(event?.recurrence?.interval ?? 1)
  const [repeatByDay, setRepeatByDay] = useState<Weekday[]>(event?.recurrence?.byDay ?? [])
  const [repeatEndType, setRepeatEndType] = useState<RecurrenceEnd['type']>(
    event?.recurrence?.end?.type ?? 'never',
  )
  const [repeatEndCount, setRepeatEndCount] = useState(
    event?.recurrence?.end?.type === 'count' ? event.recurrence!.end.count : 10,
  )
  const [repeatEndUntil, setRepeatEndUntil] = useState(
    event?.recurrence?.end?.type === 'until'
      ? toDatetimeLocal(event.recurrence!.end.until).slice(0, 10)
      : format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
  )

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const buildAction = useCallback((): CalendarAction => {
    switch (actionType) {
      case 'file':     return { type: 'file',     filePath }
      case 'playlist': return { type: 'playlist', filePaths: playlistFiles }
      case 'online':   return { type: 'online',   streamUrl }
    }
  }, [actionType, filePath, playlistFiles, streamUrl])

  const buildRecurrence = useCallback((): RecurrenceRule | undefined => {
    if (repeatFreq === 'none') return undefined
    const endRule: RecurrenceEnd =
      repeatEndType === 'count' ? { type: 'count', count: repeatEndCount }
      : repeatEndType === 'until' ? { type: 'until', until: new Date(repeatEndUntil).toISOString() }
      : { type: 'never' }
    return {
      freq: repeatFreq,
      interval: repeatInterval,
      byDay: repeatFreq === 'weekly' && repeatByDay.length > 0 ? repeatByDay : undefined,
      end: endRule,
    }
  }, [repeatFreq, repeatInterval, repeatByDay, repeatEndType, repeatEndCount, repeatEndUntil])

  const inp = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
  const sm  = 'rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:text-zinc-100">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-base font-semibold">{isNew ? tm('new') : t('event.edit')}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* Title + color */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">{t('form.title')}</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('form.titlePlaceholder')} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">{t('form.color')}</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Action type */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('form.section.action')}</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {AUDIO_TYPES.map((type) => (
                <button key={type} onClick={() => setActionType(type)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${actionType === type ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-600 dark:text-zinc-400'}`}>
                  {tm(`type.${type}`)}
                </button>
              ))}
            </div>
            {actionType === 'file' && (
              <div className="flex gap-2">
                <input type="text" value={filePath} onChange={(e) => setFilePath(e.target.value)} placeholder={t('action.filePathPlaceholder')} className={`${inp} flex-1`} />
                <button type="button" onClick={async () => {
                  const files = await window.electronAPI.dialog.openFile({ filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac'] }] })
                  if (files?.[0]) setFilePath(files[0])
                }} className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {t('action.browse')}
                </button>
              </div>
            )}
            {actionType === 'playlist' && (
              <div className="space-y-2">
                {playlistFiles.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-100 dark:border-zinc-700">
                    {playlistFiles.map((fp, i) => (
                      <div key={i} className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 last:border-0 dark:border-zinc-700">
                        <span className="flex-1 truncate text-xs text-zinc-700 dark:text-zinc-300">{fp.split(/[\\/]/).pop()}</span>
                        <button type="button" onClick={() => setPlaylistFiles((p) => p.filter((_, j) => j !== i))} className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-red-500">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={async () => {
                  const files = await window.electronAPI.dialog.openFile({ multiSelections: true, filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac'] }] })
                  if (files?.length) setPlaylistFiles((p) => [...p, ...files.filter((f) => !p.includes(f))])
                }} className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-zinc-500 hover:border-primary hover:text-primary dark:border-zinc-600 dark:text-zinc-400">
                  + {t('action.addFiles')}
                </button>
              </div>
            )}
            {actionType === 'online' && (
              <input type="text" value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder={t('action.streamUrlPlaceholder')} className={inp} />
            )}
          </div>

          {/* Timing */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('form.startDate')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">{t('form.startTime')}</label>
                <input type="datetime-local" value={dtStart} onChange={(e) => handleStartChange(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">{t('form.endTime')}</label>
                <input type="datetime-local" value={dtEnd} min={dtStart} onChange={(e) => handleEndChange(e.target.value)} className={inp} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50">
              <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-zinc-500">{t('form.duration')}</span>
              <div className="ml-1 flex items-center gap-1">
                <input type="number" min={0} max={599} value={durationMins} onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0, durationRemSecs)} className={`${sm} w-14 text-center`} />
                <span className="text-xs text-zinc-400">{t('form.durationMin')}</span>
                <input type="number" min={0} max={59} value={durationRemSecs} onChange={(e) => handleDurationChange(durationMins, parseInt(e.target.value) || 0)} className={`${sm} w-14 text-center`} />
                <span className="text-xs text-zinc-400">{t('form.durationSec')}</span>
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('form.section.recurrence')}</p>
            <select value={repeatFreq} onChange={(e) => setRepeatFreq(e.target.value as typeof repeatFreq)} className={inp}>
              <option value="none">{t('recurrence.none')}</option>
              <option value="hourly">{t('recurrence.hourly')}</option>
              <option value="daily">{t('recurrence.daily')}</option>
              <option value="weekly">{t('recurrence.weekly')}</option>
              <option value="monthly">{t('recurrence.monthly')}</option>
            </select>
            {repeatFreq !== 'none' && (
              <div className="mt-2 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{t('recurrence.every')}</span>
                  <input type="number" min={1} max={99} value={repeatInterval} onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))} className={`${sm} w-16 text-center`} />
                  <span className="text-xs text-zinc-500">{{ minutely: t('recurrence.minutes'), hourly: t('recurrence.hours'), daily: t('recurrence.days'), weekly: t('recurrence.weeks'), monthly: t('recurrence.months'), yearly: t('recurrence.years') }[repeatFreq]}</span>
                </div>
                {repeatFreq === 'weekly' && (
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((day) => (
                      <button key={day} onClick={() => setRepeatByDay((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day])}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${repeatByDay.includes(day) ? 'bg-primary text-white' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'}`}>
                        {t(`recurrence.days_short.${day}`)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {(['never', 'count', 'until'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-1.5 text-xs">
                      <input type="radio" name="msgRecEnd" value={type} checked={repeatEndType === type} onChange={() => setRepeatEndType(type)} className="accent-primary" />
                      <span className="text-zinc-600 dark:text-zinc-300">{type === 'never' ? t('recurrence.endNever') : type === 'count' ? t('recurrence.endAfter') : t('recurrence.endOn')}</span>
                      {type === 'count' && repeatEndType === 'count' && (
                        <input type="number" min={1} value={repeatEndCount} onChange={(e) => setRepeatEndCount(Math.max(1, parseInt(e.target.value) || 1))} className={`${sm} w-14 text-center`} />
                      )}
                      {type === 'until' && repeatEndType === 'until' && (
                        <input type="date" value={repeatEndUntil} onChange={(e) => setRepeatEndUntil(e.target.value)} className={sm} />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Volume */}
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500">{t('form.volume')}</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{volume}{t('form.volumePercent')}</span>
            </div>
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="w-full accent-primary" />
          </div>

          {/* Devices */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('form.section.devices')}</p>
            {devices.length === 0 ? (
              <p className="text-xs text-zinc-400">{t('devices.noDevices')}</p>
            ) : (
              <div className="space-y-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <input type="checkbox" checked={targetDevices.length === 0} onChange={() => setTargetDevices([])} className="accent-primary" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('devices.allDevices')}</span>
                </label>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-zinc-100 dark:border-zinc-700">
                  {devices.map((d) => (
                    <label key={d.mac} className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 px-3 py-2 last:border-0 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                      <input type="checkbox" checked={targetDevices.includes(d.mac)} onChange={() => setTargetDevices((p) => p.includes(d.mac) ? p.filter((m) => m !== d.mac) : [...p, d.mac])} className="accent-primary" />
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enabled */}
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded accent-primary" />
            {enabled ? t('event.enabled') : t('event.disabled')}
          </label>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">{t('event.deleteConfirm', { title })}</span>
                  <button onClick={() => onDelete(event!.id!)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">{t('event.delete')}</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-600">{t('common:buttons.cancel', 'Cancel')}</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">{t('event.delete')}</button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-600">{t('common:buttons.cancel', 'Cancel')}</button>
            <button onClick={() => onSave({ title, color, dtStart: fromDatetimeLocal(dtStart), dtEnd: fromDatetimeLocal(dtEnd), recurrence: buildRecurrence(), action: buildAction(), volume, targetDevices, enabled })} disabled={!title.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">{t('common:buttons.save', 'Save')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Messages page

const TYPE_BADGE: Record<string, string> = {
  file:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  playlist: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  online:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

export default function Messages() {
  const { t } = useTranslation('messages')
  const { events, setEvents, upsertEvent, removeEvent } = useCalendarStore()
  const [loading, setLoading] = useState(false)
  const [modalEventId, setModalEventId] = useState<string | null | undefined>(undefined)

  const messages = useMemo(() => events.filter(isAudioEvent), [events])

  useEffect(() => {
    setLoading(true)
    window.electronAPI.calendar.list()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [setEvents])

  const handleSave = useCallback(
    async (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (modalEventId) {
        const updated = await window.electronAPI.calendar.update({ id: modalEventId, changes: data })
        if (updated) upsertEvent(updated)
      } else {
        const created = await window.electronAPI.calendar.create({ event: data })
        upsertEvent(created)
      }
      setModalEventId(undefined)
    },
    [modalEventId, upsertEvent],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await window.electronAPI.calendar.delete(id)
      removeEvent(id)
      setModalEventId(undefined)
    },
    [removeEvent],
  )

  const handleToggle = async (ev: CalendarEvent) => {
    const updated = await window.electronAPI.calendar.toggle({ id: ev.id, enabled: !ev.enabled })
    if (updated) upsertEvent(updated)
  }

  const modalEvent = modalEventId === undefined ? null
    : modalEventId === null ? {}
    : messages.find((e) => e.id === modalEventId) ?? {}

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{t('title')}</h1>
        <button
          onClick={() => setModalEventId(null)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('new')}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('noMessages')}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('noMessagesHelp')}</p>
        </div>
      )}

      {!loading && messages.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-700">
                {['title', 'type', 'schedule', 'volume', 'devices', 'status'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {t(`table.${col}`)}
                  </th>
                ))}
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {messages.map((ev) => (
                <tr key={ev.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-white">{ev.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[ev.action.type] ?? ''}`}>
                      {t(`type.${ev.action.type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{scheduleSummary(ev)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {ev.volume !== undefined ? `${ev.volume}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {ev.targetDevices.length === 0 ? t('allDevices') : ev.targetDevices.length}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(ev)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ev.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'}`}
                    >
                      {ev.enabled ? t('enabled') : t('disabled')}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModalEventId(ev.id)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalEventId !== undefined && modalEvent !== null && (
        <MessageModal
          event={modalEvent as Partial<CalendarEvent>}
          onSave={handleSave}
          onDelete={modalEventId ? handleDelete : undefined}
          onClose={() => setModalEventId(undefined)}
        />
      )}
    </div>
  )
}
