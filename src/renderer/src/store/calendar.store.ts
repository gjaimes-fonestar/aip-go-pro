import { create } from 'zustand'
import type { CalendarEvent, CalendarEventId } from '@shared/calendar'

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda'

interface CalendarState {
  events: CalendarEvent[]
  loading: boolean
  error: string | null

  /** Currently displayed view. */
  view: CalendarViewMode
  /** The date the calendar is navigated to. */
  date: Date

  /** ID of the event open in the edit/view modal. null = modal closed. */
  modalEventId: CalendarEventId | null

  /** Time slot clicked in the calendar grid — used to pre-fill the new-event form. */
  pendingSlot: { start: Date; end: Date } | null
}

interface CalendarActions {
  setEvents: (events: CalendarEvent[]) => void
  upsertEvent: (event: CalendarEvent) => void
  removeEvent: (id: CalendarEventId) => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  setView: (view: CalendarViewMode) => void
  setDate: (date: Date) => void

  openModal: (id: CalendarEventId | null) => void
  closeModal: () => void

  setPendingSlot: (slot: { start: Date; end: Date } | null) => void
}

export const useCalendarStore = create<CalendarState & CalendarActions>((set) => ({
  events: [],
  loading: false,
  error: null,
  view: 'week',
  date: new Date(),
  modalEventId: null,
  pendingSlot: null,

  setEvents: (events) => set({ events }),
  upsertEvent: (event) =>
    set((s) => {
      const idx = s.events.findIndex((e) => e.id === event.id)
      if (idx === -1) return { events: [...s.events, event] }
      const next = [...s.events]
      next[idx] = event
      return { events: next }
    }),
  removeEvent: (id) =>
    set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setView: (view) => set({ view }),
  setDate: (date) => set({ date }),

  openModal: (id) => set({ modalEventId: id }),
  closeModal: () => set({ modalEventId: null, pendingSlot: null }),

  setPendingSlot: (slot) => set({ pendingSlot: slot }),
}))
