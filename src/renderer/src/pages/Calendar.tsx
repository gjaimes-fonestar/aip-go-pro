import { useEffect, useState, useCallback, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import type { SlotInfo, Event as RbcEvent } from 'react-big-calendar'
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addMinutes,
  isSameDay,
  parseISO,
  addMonths,
} from 'date-fns'
import { RRule } from 'rrule'
import { useTranslation } from 'react-i18next'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { useCalendarStore } from '../store/calendar.store'
import type { CalendarViewMode } from '../store/calendar.store'
import { useDevicesStore } from '../store/devices.store'
import { useScenesStore } from '../store/scenes.store'
import { useStreamsStore } from '../store/streams.store'
import type {
  CalendarEvent,
  CalendarAction,
  RecurrenceRule,
  Weekday,
  RecurrenceEnd,
} from '@shared/calendar'

// date-fns localizer

const locales = { 'en-US': undefined }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// helpers

const WEEKDAY_RRULE: Record<Weekday, typeof RRule.MO> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
}

interface RbcCalendarEvent extends RbcEvent {
  resource: CalendarEvent
}

/** Expand a CalendarEvent into one or more RBC events within [rangeStart, rangeEnd]. */
function expandEvent(ev: CalendarEvent, rangeStart: Date, rangeEnd: Date): RbcCalendarEvent[] {
  const start = parseISO(ev.dtStart)
  const end = ev.dtEnd ? parseISO(ev.dtEnd) : addMinutes(start, 30)
  const duration = end.getTime() - start.getTime()

  if (!ev.recurrence) {
    if (end < rangeStart || start > rangeEnd) return []
    return [{ title: ev.title, start, end, allDay: false, resource: ev }]
  }

  const { freq, interval, byDay, byMonthDay, end: recEnd } = ev.recurrence

  const freqMap = { minutely: RRule.MINUTELY, hourly: RRule.HOURLY, daily: RRule.DAILY, weekly: RRule.WEEKLY, monthly: RRule.MONTHLY, yearly: RRule.YEARLY }

  const opts: ConstructorParameters<typeof RRule>[0] = {
    freq: freqMap[freq],
    interval,
    dtstart: start,
  }

  if (byDay && byDay.length > 0) {
    opts.byweekday = byDay.map((d) => WEEKDAY_RRULE[d])
  }
  if (byMonthDay) {
    opts.bymonthday = byMonthDay
  }

  if (recEnd.type === 'count') {
    opts.count = recEnd.count
  } else if (recEnd.type === 'until') {
    opts.until = parseISO(recEnd.until)
  }

  const exDates = (ev.exDates ?? []).map((d) => parseISO(d))

  const rule = new RRule(opts)
  const occurrences = rule.between(rangeStart, rangeEnd, true)

  return occurrences
    .filter((occ) => !exDates.some((ex) => isSameDay(ex, occ)))
    .map((occ) => ({
      title: ev.title,
      start: occ,
      end: new Date(occ.getTime() + duration),
      allDay: false,
      resource: ev,
    }))
}

/** Color coding by action type. */
function actionColor(action: CalendarAction): string {
  switch (action.type) {
    case 'file':     return '#6366f1'
    case 'playlist': return '#10b981'
    case 'online':   return '#f59e0b'
    case 'scene':    return '#8b5cf6'
    default:         return '#6b7280'
  }
}

/** Converts a 6-digit hex color to an rgba string with the given alpha (0–1). */
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Event modal

const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const COLOR_PRESETS = ['#6366f1', '#3b82f6', '#10b981', '#14b8a6', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6']

function toDatetimeLocal(iso: string): string {
  const d = parseISO(iso)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

function fromDatetimeLocal(val: string): string {
  return new Date(val).toISOString()
}

/** Returns a short human-readable model label for a device_type number. */
function deviceTypeLabel(type: number): string {
  switch (type) {
    case 0x00: return 'AIP-3010'
    case 0x01: return 'AIP-3010A'
    case 0x02: return 'AIP-PC'
    case 0x03: return 'AIP-MIC'
    case 0x04: return 'AIP-PMIC'
    case 0x05: return 'AIP-INT'
    case 0x07: return 'AIP-GW'
    case 0x08: return 'AIP-4010'
    case 0x09: return 'AIP-WEB'
    case 0x0A: return 'AIP-SM'
    case 0x0B: return 'AIP-IO'
    default:   return `0x${type.toString(16).toUpperCase().padStart(2, '0')}`
  }
}

interface EventModalProps {
  event: Partial<CalendarEvent> | null
  onSave: (ev: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const AUDIO_FILTERS = [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac'] }]

function EventModal({ event, onSave, onDelete, onClose }: EventModalProps) {
  const { t } = useTranslation('calendar')
  const deviceEntries = useDevicesStore((s) => s.entries)
  const devices = useMemo(() => Array.from(deviceEntries.values()).map((e) => e.device), [deviceEntries])
  const scenes = useScenesStore((s) => s.scenes)
  const streams = useStreamsStore((s) => s.streams)

  const isNew = !event?.id

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [color, setColor] = useState(event?.color ?? COLOR_PRESETS[0])
  const initStart = event?.dtStart
    ? toDatetimeLocal(event.dtStart)
    : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  const initEnd = event?.dtEnd
    ? toDatetimeLocal(event.dtEnd)
    : format(addMinutes(new Date(), 30), "yyyy-MM-dd'T'HH:mm")

  const [dtStart, setDtStart] = useState(initStart)
  const [dtEnd, setDtEnd] = useState(initEnd)

  /** Duration in total seconds, derived from dtStart/dtEnd and kept in sync. */
  const [durationSecs, setDurationSecs] = useState(() => {
    const diff = (new Date(initEnd).getTime() - new Date(initStart).getTime()) / 1000
    return Math.max(0, Math.round(diff))
  })

  const isAudioAction = (type: CalendarAction['type']) =>
    type === 'file' || type === 'playlist' || type === 'online'

  const handleStartChange = (val: string) => {
    setDtStart(val)
    const newEnd = format(addMinutes(new Date(val), Math.ceil(durationSecs / 60)), "yyyy-MM-dd'T'HH:mm")
    setDtEnd(newEnd)
  }

  const handleEndChange = (val: string) => {
    setDtEnd(val)
    const diff = (new Date(val).getTime() - new Date(dtStart).getTime()) / 1000
    setDurationSecs(Math.max(0, Math.round(diff)))
  }

  const handleDurationChange = (mins: number, secs: number) => {
    const total = Math.max(0, mins * 60 + secs)
    setDurationSecs(total)
    const newEnd = new Date(new Date(dtStart).getTime() + total * 1000)
    setDtEnd(format(newEnd, "yyyy-MM-dd'T'HH:mm"))
  }

  const durationMins = Math.floor(durationSecs / 60)
  const durationRemSecs = durationSecs % 60

  const [enabled, setEnabled] = useState(event?.enabled ?? true)
  const [volume, setVolume] = useState(event?.volume ?? 80)
  const [targetDevices, setTargetDevices] = useState<string[]>(event?.targetDevices ?? [])

  const [windowEnabled, setWindowEnabled] = useState(!!event?.recurrence?.window)
  const [windowFrom, setWindowFrom] = useState(event?.recurrence?.window?.from ?? '08:00')
  const [windowTo, setWindowTo] = useState(event?.recurrence?.window?.to ?? '18:00')

  const [actionType, setActionType] = useState<CalendarAction['type']>(
    event?.action?.type ?? 'file',
  )
  const [filePath, setFilePath] = useState(
    event?.action?.type === 'file' ? event.action.filePath : '',
  )
  const [fileName, setFileName] = useState(
    event?.action?.type === 'file' ? (event.action.fileName ?? '') : '',
  )
  const [playlistFiles, setPlaylistFiles] = useState<string[]>(
    event?.action?.type === 'playlist' ? event.action.filePaths : [],
  )
  const [streamUrl, setStreamUrl] = useState(
    event?.action?.type === 'online' ? event.action.streamUrl : '',
  )
  const [streamName, setStreamName] = useState(
    event?.action?.type === 'online' ? (event.action.streamName ?? '') : '',
  )
  const [sceneId, setSceneId] = useState(
    event?.action?.type === 'scene' ? event.action.sceneId : '',
  )
  const [sceneName, setSceneName] = useState(
    event?.action?.type === 'scene' ? (event.action.sceneName ?? '') : '',
  )

  const [repeatFreq, setRepeatFreq] = useState<RecurrenceRule['freq'] | 'none'>(
    event?.recurrence ? event.recurrence.freq : 'none',
  )
  const [repeatInterval, setRepeatInterval] = useState(event?.recurrence?.interval ?? 1)
  const [repeatByDay, setRepeatByDay] = useState<Weekday[]>(event?.recurrence?.byDay ?? [])
  const [repeatByMonthDay, setRepeatByMonthDay] = useState(
    event?.recurrence?.byMonthDay ?? new Date().getDate(),
  )
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

  const toggleByDay = (day: Weekday) => {
    setRepeatByDay((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const buildAction = useCallback((): CalendarAction => {
    switch (actionType) {
      case 'file':     return { type: 'file',     filePath,      fileName:  fileName  || undefined }
      case 'playlist': return { type: 'playlist', filePaths: playlistFiles }
      case 'online':   return { type: 'online',   streamUrl,     streamName: streamName || undefined }
      case 'scene':    return { type: 'scene',    sceneId,       sceneName:  sceneName  || undefined }
    }
  }, [actionType, filePath, fileName, playlistFiles, streamUrl, streamName, sceneId, sceneName])

  const buildRecurrence = useCallback((): RecurrenceRule | undefined => {
    if (repeatFreq === 'none') return undefined

    const endRule: RecurrenceEnd =
      repeatEndType === 'count'
        ? { type: 'count', count: repeatEndCount }
        : repeatEndType === 'until'
          ? { type: 'until', until: new Date(repeatEndUntil).toISOString() }
          : { type: 'never' }

    const isSubDaily = repeatFreq === 'minutely' || repeatFreq === 'hourly'
    return {
      freq: repeatFreq,
      interval: repeatInterval,
      byDay: repeatFreq === 'weekly' && repeatByDay.length > 0 ? repeatByDay : undefined,
      byMonthDay: repeatFreq === 'monthly' ? repeatByMonthDay : undefined,
      end: endRule,
      window: isSubDaily && windowEnabled ? { from: windowFrom, to: windowTo } : undefined,
    }
  }, [repeatFreq, repeatInterval, repeatByDay, repeatByMonthDay, repeatEndType, repeatEndCount, repeatEndUntil, windowEnabled, windowFrom, windowTo])

  const handleSave = () => {
    onSave({
      title,
      description: description || undefined,
      color,
      dtStart: fromDatetimeLocal(dtStart),
      dtEnd: fromDatetimeLocal(dtEnd),
      recurrence: buildRecurrence(),
      action: buildAction(),
      volume: isAudioAction(actionType) ? volume : undefined,
      targetDevices,
      enabled,
    })
  }

  const toggleDevice = (mac: string) => {
    setTargetDevices((prev) =>
      prev.includes(mac) ? prev.filter((m) => m !== mac) : [...prev, mac],
    )
  }

  const unitLabel = {
    minutely: t('recurrence.minutes'),
    hourly:   t('recurrence.hours'),
    daily:    t('recurrence.days'),
    weekly:   t('recurrence.weeks'),
    monthly:  t('recurrence.months'),
    yearly:   t('recurrence.years'),
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-base font-semibold">
            {isNew ? t('event.new') : t('event.edit')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* Title & Color */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('form.title')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('form.titlePlaceholder')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('form.color')}
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('form.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 resize-none"
            />
          </div>

          {/* Timing — date + time always required */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('form.startDate')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">{t('form.startTime')}</label>
                <input
                  type="datetime-local"
                  value={dtStart}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">{t('form.endTime')}</label>
                <input
                  type="datetime-local"
                  value={dtEnd}
                  onChange={(e) => handleEndChange(e.target.value)}
                  min={dtStart}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Duration picker — only shown for audio actions */}
            {isAudioAction(actionType) && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-gray-500">{t('form.duration')}</span>
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="number"
                    min={0}
                    max={599}
                    value={durationMins}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0, durationRemSecs)}
                    className="w-14 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <span className="text-xs text-gray-400">{t('form.durationMin')}</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={durationRemSecs}
                    onChange={(e) => handleDurationChange(durationMins, parseInt(e.target.value) || 0)}
                    className="w-14 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <span className="text-xs text-gray-400">{t('form.durationSec')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action section */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('form.section.action')}
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['file', 'playlist', 'online', 'scene'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActionType(type)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    actionType === type
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t(`action.type.${type}`)}
                </button>
              ))}
            </div>

            {actionType === 'file' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder={t('action.filePathPlaceholder')}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const files = await window.electronAPI.dialog.openFile({ filters: AUDIO_FILTERS })
                    if (files?.[0]) {
                      setFilePath(files[0])
                      setFileName(files[0].split(/[\\/]/).pop() ?? '')
                    }
                  }}
                  className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {t('action.browse')}
                </button>
              </div>
            )}
            {actionType === 'playlist' && (
              <div className="space-y-2">
                {playlistFiles.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
                    {playlistFiles.map((fp, i) => (
                      <div key={i} className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 last:border-0 dark:border-gray-700">
                        <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300">{fp.split(/[\\/]/).pop()}</span>
                        <button
                          type="button"
                          onClick={() => setPlaylistFiles((p) => p.filter((_, j) => j !== i))}
                          className="shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const files = await window.electronAPI.dialog.openFile({ multiSelections: true, filters: AUDIO_FILTERS })
                    if (files?.length) setPlaylistFiles((p) => [...p, ...files.filter((f) => !p.includes(f))])
                  }}
                  className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-400"
                >
                  + {t('action.addFiles')}
                </button>
              </div>
            )}
            {actionType === 'online' && (
              <select
                value={streamUrl}
                onChange={(e) => {
                  const s = streams.find((st) => st.url === e.target.value)
                  setStreamUrl(e.target.value)
                  setStreamName(s?.name ?? '')
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">{t('action.selectStream')}</option>
                {streams.map((s) => (
                  <option key={s.id} value={s.url}>{s.name}</option>
                ))}
              </select>
            )}
            {actionType === 'scene' && (
              <select
                value={sceneId}
                onChange={(e) => {
                  const sc = scenes.find((s) => s.id === e.target.value)
                  setSceneId(e.target.value)
                  setSceneName(sc?.name ?? '')
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">{t('action.selectScene')}</option>
                {scenes.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Recurrence section */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('form.section.recurrence')}
            </p>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-500">{t('recurrence.label')}</label>
              <select
                value={repeatFreq}
                onChange={(e) => setRepeatFreq(e.target.value as typeof repeatFreq)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="none">{t('recurrence.none')}</option>
                <option value="minutely">{t('recurrence.minutely')}</option>
                <option value="hourly">{t('recurrence.hourly')}</option>
                <option value="daily">{t('recurrence.daily')}</option>
                <option value="weekly">{t('recurrence.weekly')}</option>
                <option value="monthly">{t('recurrence.monthly')}</option>
                <option value="yearly">{t('recurrence.yearly')}</option>
              </select>
            </div>

            {repeatFreq !== 'none' && (
              <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                {/* Interval */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('recurrence.every')}</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-center text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <span className="text-xs text-gray-500">{unitLabel[repeatFreq]}</span>
                </div>

                {/* Active window — sub-daily recurrences only */}
                {(repeatFreq === 'minutely' || repeatFreq === 'hourly') && (
                  <div>
                    <label className="mb-2 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={windowEnabled}
                        onChange={(e) => setWindowEnabled(e.target.checked)}
                        className="rounded accent-primary"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-300">{t('recurrence.window')}</span>
                    </label>
                    {windowEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{t('recurrence.windowFrom')}</span>
                        <input
                          type="time"
                          value={windowFrom}
                          onChange={(e) => setWindowFrom(e.target.value)}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <span className="text-xs text-gray-500">{t('recurrence.windowTo')}</span>
                        <input
                          type="time"
                          value={windowTo}
                          onChange={(e) => setWindowTo(e.target.value)}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Weekly — day picker */}
                {repeatFreq === 'weekly' && (
                  <div>
                    <p className="mb-1.5 text-xs text-gray-500">{t('recurrence.on')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleByDay(day)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            repeatByDay.includes(day)
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {t(`recurrence.days_short.${day}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly — day of month */}
                {repeatFreq === 'monthly' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t('recurrence.onDay')}</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={repeatByMonthDay}
                      onChange={(e) => setRepeatByMonthDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-sm text-center text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                )}

                {/* End condition */}
                <div>
                  <p className="mb-1.5 text-xs text-gray-500">{t('recurrence.ends')}</p>
                  <div className="space-y-1.5">
                    {(['never', 'count', 'until'] as const).map((type) => (
                      <label key={type} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="recEnd"
                          value={type}
                          checked={repeatEndType === type}
                          onChange={() => setRepeatEndType(type)}
                          className="accent-primary"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {type === 'never' && t('recurrence.endNever')}
                          {type === 'count' && (
                            <span className="flex items-center gap-1.5">
                              {t('recurrence.endAfter')}
                              {repeatEndType === 'count' && (
                                <input
                                  type="number"
                                  min={1}
                                  value={repeatEndCount}
                                  onChange={(e) => setRepeatEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-14 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-center text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                />
                              )}
                              {t('recurrence.occurrences')}
                            </span>
                          )}
                          {type === 'until' && (
                            <span className="flex items-center gap-1.5">
                              {t('recurrence.endOn')}
                              {repeatEndType === 'until' && (
                                <input
                                  type="date"
                                  value={repeatEndUntil}
                                  onChange={(e) => setRepeatEndUntil(e.target.value)}
                                  className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                />
                              )}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Target devices */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('form.section.devices')}
            </p>
            {devices.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('devices.noDevices')}</p>
            ) : (
              <div className="space-y-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={targetDevices.length === 0}
                    onChange={() => setTargetDevices([])}
                    className="rounded accent-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('devices.allDevices')}</span>
                </label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
                  {devices.map((d) => (
                    <label
                      key={d.mac}
                      className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={targetDevices.includes(d.mac)}
                        onChange={() => toggleDevice(d.mac)}
                        className="rounded accent-primary"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                          {d.name}
                        </span>
                        <span className="block truncate text-xs text-gray-400">
                          {deviceTypeLabel(d.device_type)} · {d.mac}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('form.section.options')}
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded accent-primary"
                />
                {enabled ? t('event.enabled') : t('event.disabled')}
              </label>

              {isAudioAction(actionType) && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t('form.volume')}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {volume}{t('form.volumePercent')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-xs text-gray-300 dark:text-gray-600">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          <div>
            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">{t('event.deleteConfirm', { title })}</span>
                  <button
                    onClick={() => onDelete(event!.id!)}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                  >
                    {t('event.delete')}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  >
                    {t('common:buttons.cancel', 'Cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  {t('event.delete')}
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {t('common:buttons.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !dtStart || !dtEnd}
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

// Event indicator dot (month view)

interface DateCellWrapperProps {
  value: Date
  events: CalendarEvent[]
}

function DateCellWrapper({ value, events, children }: DateCellWrapperProps & { children?: React.ReactNode }) {
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.dtStart), value))
  return (
    <div className="relative flex-1">
      {children}
      {dayEvents.length > 0 && (
        <div className="pointer-events-none absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
          {dayEvents.slice(0, 3).map((e) => (
            <span
              key={e.id}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: e.color ?? actionColor(e.action) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main Calendar page

export default function Calendar() {
  const { t } = useTranslation('calendar')

  const {
    events,
    loading,
    view,
    date,
    modalEventId,
    pendingSlot,
    setEvents,
    upsertEvent,
    removeEvent,
    setLoading,
    setView,
    setDate,
    openModal,
    closeModal,
    setPendingSlot,
  } = useCalendarStore()

  const { setScenes } = useScenesStore()
  const { setStreams } = useStreamsStore()

  // Load events, scenes and streams from main process on mount
  useEffect(() => {
    setLoading(true)
    window.electronAPI.calendar
      .list()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false))
    window.electronAPI.scene.list().then(setScenes).catch(console.error)
    window.electronAPI.stream.list().then(setStreams).catch(console.error)
  }, [setEvents, setLoading, setScenes, setStreams])

  // Derive the range the calendar is currently showing for event expansion
  const rangeStart = useMemo(() => {
    const d = new Date(date)
    d.setDate(1)
    d.setDate(d.getDate() - 7)
    return d
  }, [date])

  const rangeEnd = useMemo(() => {
    const d = new Date(date)
    d.setMonth(d.getMonth() + 2)
    return d
  }, [date])

  const rbcEvents = useMemo<RbcCalendarEvent[]>(() => {
    const expanded: RbcCalendarEvent[] = []
    for (const ev of events) {
      expanded.push(...expandEvent(ev, rangeStart, rangeEnd))
    }
    return expanded
  }, [events, rangeStart, rangeEnd])

  const modalEvent = useMemo(() => {
    if (modalEventId === null) {
      if (pendingSlot) return { dtStart: pendingSlot.start.toISOString(), dtEnd: pendingSlot.end.toISOString() }
      return null
    }
    return events.find((e) => e.id === modalEventId) ?? null
  }, [modalEventId, events, pendingSlot])

  const handleSelectSlot = useCallback(
    (slot: SlotInfo) => {
      setPendingSlot({ start: slot.start, end: slot.end })
      openModal(null)
    },
    [setPendingSlot, openModal],
  )

  const handleSelectEvent = useCallback(
    (ev: RbcCalendarEvent) => {
      openModal(ev.resource.id)
    },
    [openModal],
  )

  const handleSave = useCallback(
    async (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (modalEventId) {
        const updated = await window.electronAPI.calendar.update({ id: modalEventId, changes: data })
        if (updated) upsertEvent(updated)
      } else {
        const created = await window.electronAPI.calendar.create({ event: data })
        upsertEvent(created)
      }
      closeModal()
    },
    [modalEventId, upsertEvent, closeModal],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await window.electronAPI.calendar.delete(id)
      removeEvent(id)
      closeModal()
    },
    [removeEvent, closeModal],
  )

  const eventStyleGetter = useCallback(
    (ev: RbcCalendarEvent) => {
      const color = ev.resource.color ?? actionColor(ev.resource.action)
      const disabled = !ev.resource.enabled
      return {
        style: {
          backgroundColor: hexAlpha(color, 0.12),
          borderLeft: `3px solid ${color}`,
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          borderRadius: '3px',
          color,
          opacity: disabled ? 0.45 : 1,
          fontWeight: 500,
        },
      }
    },
    [],
  )

  const DateCellWithEvents = useCallback(
    ({ value, children }: { value: Date; children?: React.ReactNode }) => (
      <DateCellWrapper value={value} events={events}>
        {children}
      </DateCellWrapper>
    ),
    [events],
  )

  const messages = useMemo(
    () => ({
      today:    t('toolbar.today'),
      previous: t('toolbar.back'),
      next:     t('toolbar.next'),
      month:    t('views.month'),
      week:     t('views.week'),
      day:      t('views.day'),
      agenda:   t('views.agenda'),
      noEventsInRange: t('agenda.noEvents'),
    }),
    [t],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
        <button
          onClick={() => {
            setPendingSlot({
              start: new Date(),
              end: addMinutes(new Date(), 30),
            })
            openModal(null)
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('toolbar.newEvent')}
        </button>
      </div>

      {/* Calendar body */}
      <div className="relative flex-1 overflow-hidden bg-white dark:bg-gray-900">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <BigCalendar
          localizer={localizer}
          events={rbcEvents}
          views={['day', 'week', 'month', 'agenda']}
          view={view as CalendarViewMode}
          date={date}
          onView={(v) => setView(v as CalendarViewMode)}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          components={{ dateCellWrapper: DateCellWithEvents }}
          messages={messages}
          style={{ height: '100%', padding: '8px' }}
          popup
        />
      </div>

      {/* Event modal */}
      {(modalEventId !== null || pendingSlot !== null) && (
        <EventModal
          event={modalEvent as Partial<CalendarEvent>}
          onSave={handleSave}
          onDelete={modalEventId ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
