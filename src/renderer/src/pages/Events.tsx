import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO, addMinutes, addMonths } from 'date-fns'
import { useCalendarStore } from '../store/calendar.store'
import { useScenesStore } from '../store/scenes.store'
import { useDevicesStore } from '../store/devices.store'
import type { CalendarEvent, RecurrenceRule, Weekday, RecurrenceEnd } from '@shared/calendar'

// helpers

function scheduleSummary(ev: CalendarEvent): string {
  const time = format(parseISO(ev.dtStart), 'HH:mm')
  if (!ev.recurrence) return format(parseISO(ev.dtStart), 'MMM d, yyyy') + ' · ' + time
  const { freq, interval, byDay } = ev.recurrence
  const dayMap: Record<string, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' }
  if (freq === 'weekly' && byDay?.length) return byDay.map((d) => dayMap[d]).join(', ') + ' · ' + time
  const labels: Record<string, string> = { minutely: `${interval} min`, hourly: `${interval}h`, daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' }
  return labels[freq] + ' · ' + time
}

function toDatetimeLocal(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}
function fromDatetimeLocal(val: string): string {
  return new Date(val).toISOString()
}

const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const COLOR_PRESETS = ['#f59e0b', '#8b5cf6', '#ef4444', '#6366f1', '#10b981', '#3b82f6', '#f97316']

// Event modal (scene-trigger events)

interface EventModalProps {
  event: Partial<CalendarEvent> | null
  scenes: ReturnType<typeof useScenesStore.getState>['scenes']
  onSave: (ev: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

function EventModal({ event, scenes, onSave, onDelete, onClose }: EventModalProps) {
  const { t } = useTranslation('calendar')
  const { t: te } = useTranslation('events')
  const deviceEntries = useDevicesStore((s) => s.entries)
  const devices = useMemo(() => Array.from(deviceEntries.values()).map((e) => e.device), [deviceEntries])
  const isNew = !event?.id

  const initStart = event?.dtStart ? toDatetimeLocal(event.dtStart) : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  const defaultSceneId = scenes[0]?.id ?? ''

  const [title, setTitle]       = useState(event?.title ?? '')
  const [color, setColor]       = useState(event?.color ?? COLOR_PRESETS[0])
  const [dtStart, setDtStart]   = useState(initStart)
  const [sceneId, setSceneId]   = useState(event?.action?.type === 'scene' ? event.action.sceneId : defaultSceneId)
  const [enabled, setEnabled]   = useState(event?.enabled ?? true)
  const [targetDevices, setTargetDevices] = useState<string[]>(event?.targetDevices ?? [])

  const [repeatFreq, setRepeatFreq] = useState<RecurrenceRule['freq'] | 'none'>(event?.recurrence ? event.recurrence.freq : 'none')
  const [repeatInterval, setRepeatInterval] = useState(event?.recurrence?.interval ?? 1)
  const [repeatByDay, setRepeatByDay] = useState<Weekday[]>(event?.recurrence?.byDay ?? [])
  const [repeatEndType, setRepeatEndType] = useState<RecurrenceEnd['type']>(event?.recurrence?.end?.type ?? 'never')
  const [repeatEndCount, setRepeatEndCount] = useState(event?.recurrence?.end?.type === 'count' ? event.recurrence!.end.count : 10)
  const [repeatEndUntil, setRepeatEndUntil] = useState(
    event?.recurrence?.end?.type === 'until'
      ? toDatetimeLocal(event.recurrence!.end.until).slice(0, 10)
      : format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
  )

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const buildRecurrence = useCallback((): RecurrenceRule | undefined => {
    if (repeatFreq === 'none') return undefined
    const endRule: RecurrenceEnd =
      repeatEndType === 'count' ? { type: 'count', count: repeatEndCount }
      : repeatEndType === 'until' ? { type: 'until', until: new Date(repeatEndUntil).toISOString() }
      : { type: 'never' }
    return { freq: repeatFreq, interval: repeatInterval, byDay: repeatFreq === 'weekly' && repeatByDay.length > 0 ? repeatByDay : undefined, end: endRule }
  }, [repeatFreq, repeatInterval, repeatByDay, repeatEndType, repeatEndCount, repeatEndUntil])

  const selectedScene = scenes.find((s) => s.id === sceneId)

  const inp = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
  const sm  = 'rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:text-zinc-100">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-base font-semibold">{isNew ? te('new') : t('event.edit')}</h2>
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

          {/* Scene selector */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{te('table.scene')}</p>
            {scenes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-200 py-3 text-center text-xs text-zinc-400 dark:border-zinc-700">
                No scenes available — create one in Scenes first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {scenes.map((s) => (
                  <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${sceneId === s.id ? 'border-primary bg-primary/5' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'}`}>
                    <input type="radio" name="evtScene" value={s.id} checked={sceneId === s.id} onChange={() => setSceneId(s.id)} className="mt-0.5 accent-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{s.name}</p>
                      {s.description && <p className="text-xs text-zinc-400">{s.description}</p>}
                      <p className="mt-0.5 text-xs text-zinc-400">{s.steps.length} step{s.steps.length !== 1 ? 's' : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Start time */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('form.startDate')}</p>
            <input type="datetime-local" value={dtStart} onChange={(e) => setDtStart(e.target.value)} className={inp} />
          </div>

          {/* Recurrence */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('form.section.recurrence')}</p>
            <select value={repeatFreq} onChange={(e) => setRepeatFreq(e.target.value as typeof repeatFreq)} className={inp}>
              <option value="none">{t('recurrence.none')}</option>
              <option value="daily">{t('recurrence.daily')}</option>
              <option value="weekly">{t('recurrence.weekly')}</option>
              <option value="monthly">{t('recurrence.monthly')}</option>
            </select>
            {repeatFreq !== 'none' && (
              <div className="mt-2 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{t('recurrence.every')}</span>
                  <input type="number" min={1} max={99} value={repeatInterval} onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))} className={`${sm} w-16 text-center`} />
                  <span className="text-xs text-zinc-500">{{ daily: t('recurrence.days'), weekly: t('recurrence.weeks'), monthly: t('recurrence.months') }[repeatFreq as string] ?? ''}</span>
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
                      <input type="radio" name="evtRecEnd" value={type} checked={repeatEndType === type} onChange={() => setRepeatEndType(type)} className="accent-primary" />
                      <span className="text-zinc-600 dark:text-zinc-300">{type === 'never' ? t('recurrence.endNever') : type === 'count' ? t('recurrence.endAfter') : t('recurrence.endOn')}</span>
                      {type === 'count' && repeatEndType === 'count' && <input type="number" min={1} value={repeatEndCount} onChange={(e) => setRepeatEndCount(Math.max(1, parseInt(e.target.value) || 1))} className={`${sm} w-14 text-center`} />}
                      {type === 'until' && repeatEndType === 'until' && <input type="date" value={repeatEndUntil} onChange={(e) => setRepeatEndUntil(e.target.value)} className={sm} />}
                    </label>
                  ))}
                </div>
              </div>
            )}
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
            <button
              onClick={() => {
                const dtEnd = fromDatetimeLocal(format(addMinutes(new Date(dtStart), 1), "yyyy-MM-dd'T'HH:mm"))
                onSave({ title, color, dtStart: fromDatetimeLocal(dtStart), dtEnd, recurrence: buildRecurrence(), action: { type: 'scene', sceneId, sceneName: selectedScene?.name }, targetDevices, enabled })
              }}
              disabled={!title.trim() || !sceneId}
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

// Main Events page

export default function Events() {
  const { t } = useTranslation('events')

  const { events, setEvents, upsertEvent, removeEvent } = useCalendarStore()
  const { scenes, setScenes } = useScenesStore()
  const [loading, setLoading] = useState(false)
  const [modalEventId, setModalEventId] = useState<string | null | undefined>(undefined)

  const sceneEvents = useMemo(() => events.filter((e) => e.action.type === 'scene'), [events])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      window.electronAPI.calendar.list().then(setEvents),
      window.electronAPI.scene.list().then(setScenes),
    ]).catch(console.error).finally(() => setLoading(false))
  }, [setEvents, setScenes])

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
    : sceneEvents.find((e) => e.id === modalEventId) ?? {}

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

      {!loading && sceneEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('noEvents')}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('noEventsHelp')}</p>
        </div>
      )}

      {!loading && sceneEvents.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-700">
                {['title', 'scene', 'schedule', 'devices', 'status'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {t(`table.${col}`)}
                  </th>
                ))}
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {sceneEvents.map((ev) => {
                return (
                  <tr key={ev.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{ev.title}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        {ev.action.type === 'scene' ? (ev.action.sceneName ?? ev.action.sceneId) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{scheduleSummary(ev)}</td>
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
                      <button onClick={() => setModalEventId(ev.id)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalEventId !== undefined && modalEvent !== null && (
        <EventModal
          event={modalEvent as Partial<CalendarEvent>}
          scenes={scenes}
          onSave={handleSave}
          onDelete={modalEventId ? handleDelete : undefined}
          onClose={() => setModalEventId(undefined)}
        />
      )}
    </div>
  )
}
