import { create } from 'zustand'

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id:        string
  timestamp: string   // ISO string
  level:     LogLevel
  category:  string
  message:   string
  details?:  string
}

interface LogState {
  entries: LogEntry[]
  push:    (entry: Omit<LogEntry, 'id'>) => void
  clear:   () => void
}

export const useLogStore = create<LogState>((set) => ({
  entries: [],

  push: (entry) =>
    set((s) => ({
      entries: [
        { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
        ...s.entries,
      ].slice(0, 500),   // cap to avoid unbounded growth
    })),

  clear: () => set({ entries: [] }),
}))
