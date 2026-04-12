import { create } from 'zustand'
import type { Stream } from '@shared/stream'

interface StreamsState {
  streams: Stream[]
  loading: boolean
  setStreams: (streams: Stream[]) => void
  upsertStream: (stream: Stream) => void
  removeStream: (id: string) => void
  setLoading: (v: boolean) => void
}

export const useStreamsStore = create<StreamsState>((set) => ({
  streams: [],
  loading: false,
  setStreams: (streams) => set({ streams }),
  upsertStream: (stream) =>
    set((s) => {
      const idx = s.streams.findIndex((e) => e.id === stream.id)
      const next = [...s.streams]
      if (idx >= 0) next[idx] = stream
      else next.push(stream)
      return { streams: next }
    }),
  removeStream: (id) => set((s) => ({ streams: s.streams.filter((e) => e.id !== id) })),
  setLoading: (loading) => set({ loading }),
}))
