/**
 * Calendar event data model — shared between main process and renderer.
 * Designed for RFC 5545-compatible persistence while exposing a simple API.
 * RRULE details are kept internal; the UI works with plain-language fields.
 */

/** Play a single audio file stored on a device. */
export interface CalendarActionFile {
  type: 'file'
  filePath: string
  fileName?: string
}

/** Play a playlist (ordered list of audio file paths). */
export interface CalendarActionPlaylist {
  type: 'playlist'
  playlistId: string
  playlistName?: string
}

/** Stream from an online source (URL). */
export interface CalendarActionOnline {
  type: 'online'
  streamUrl: string
  streamName?: string
}

/** Activate a pre-configured scene. */
export interface CalendarActionScene {
  type: 'scene'
  sceneId: string
  sceneName?: string
}

export type CalendarAction =
  | CalendarActionFile
  | CalendarActionPlaylist
  | CalendarActionOnline
  | CalendarActionScene

/** Weekday codes (RFC 5545 compatible). */
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

/** How recurrence ends. */
export type RecurrenceEnd =
  | { type: 'never' }
  | { type: 'count'; count: number }
  | { type: 'until'; until: string }

/**
 * Simple recurrence rule — maps 1-to-1 to an RFC 5545 RRULE internally,
 * but expressed in plain-language fields for the UI.
 *
 * Examples:
 *   Daily at 8am:     { freq: 'daily',   interval: 1, end: { type: 'never' } }
 *   Every weekday:    { freq: 'weekly',  interval: 1, byDay: ['MO','TU','WE','TH','FR'], end: { type: 'never' } }
 *   Monthly on 15th:  { freq: 'monthly', interval: 1, byMonthDay: 15, end: { type: 'count', count: 12 } }
 */
export interface RecurrenceRule {
  freq: 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  /** Repeat every N units (e.g. every 2 weeks). */
  interval: number
  /** For weekly: which days of the week (empty = same day as dtStart). */
  byDay?: Weekday[]
  /** For monthly: day of month (1–31). */
  byMonthDay?: number
  /** How the recurrence ends. */
  end: RecurrenceEnd
}

/** Unique identifier for a calendar event. */
export type CalendarEventId = string

/**
 * A calendar event stored in the database.
 * All timestamps are ISO 8601 strings (UTC) for safe serialization.
 */
export interface CalendarEvent {
  /** UUID assigned at creation. */
  id: CalendarEventId

  /** Display title shown on the calendar. */
  title: string

  /** Optional description / notes. */
  description?: string

  /** Color label shown on the calendar chip. */
  color?: string

  /** ISO 8601 start datetime. */
  dtStart: string

  /** ISO 8601 end datetime. If absent, event is treated as instantaneous. */
  dtEnd?: string

  /** Whether this is an all-day event (no specific time). */
  allDay?: boolean

  /** If present, the event repeats according to this rule. */
  recurrence?: RecurrenceRule

  /**
   * Dates excluded from recurrence expansion (RFC 5545 EXDATE).
   * ISO 8601 date strings.
   */
  exDates?: string[]

  /** What happens when this event fires. */
  action: CalendarAction

  /**
   * MAC addresses of devices that should receive this event.
   * Empty array = all devices.
   */
  targetDevices: string[]

  /** Whether this event is active. */
  enabled: boolean

  /** ISO 8601 creation timestamp. */
  createdAt: string

  /** ISO 8601 last-modified timestamp. */
  updatedAt: string
}

export interface CalendarCreatePayload {
  event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
}

export interface CalendarUpdatePayload {
  id: CalendarEventId
  changes: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>>
}

export interface CalendarTogglePayload {
  id: CalendarEventId
  enabled: boolean
}

export interface CalendarEventFiredPayload {
  id: CalendarEventId
  firedAt: string
}
