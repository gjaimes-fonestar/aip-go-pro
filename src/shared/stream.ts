/**
 * Audio stream data model — shared between main process and renderer.
 * A Stream is a saved online audio source (HTTP/HTTPS URL) that can be
 * referenced from calendar events, scenes, and channel configurations.
 */
export interface Stream {
  id: string
  name: string
  url: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type StreamId = string

export interface StreamCreatePayload {
  stream: Omit<Stream, 'id' | 'createdAt' | 'updatedAt'>
}

export interface StreamUpdatePayload {
  id: StreamId
  changes: Partial<Omit<Stream, 'id' | 'createdAt' | 'updatedAt'>>
}
