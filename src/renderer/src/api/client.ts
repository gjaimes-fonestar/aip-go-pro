import axios from 'axios'
import type { AxiosInstance } from 'axios'

/**
 * Lazy singleton Axios instance.
 * The base URL is fetched from the main process on first use, so it always
 * reflects the port chosen by the Go backend at runtime.
 */
let _client: AxiosInstance | null = null

async function getClient(): Promise<AxiosInstance> {
  if (_client) return _client

  const url = await window.electronAPI.backend.getUrl()
  if (!url) throw new Error('Backend is not available yet')

  _client = axios.create({
    baseURL: url,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  })

  // Invalidate the instance on connection errors so the next call re-resolves the URL
  _client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (!err.response || err.code === 'ECONNREFUSED') {
        _client = null
      }
      return Promise.reject(err)
    }
  )

  return _client
}

export const api = {
  get: async <T>(path: string, params?: Record<string, unknown>): Promise<T> => {
    const client = await getClient()
    const { data } = await client.get<T>(path, { params })
    return data
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const client = await getClient()
    const { data } = await client.post<T>(path, body)
    return data
  },

  put: async <T>(path: string, body?: unknown): Promise<T> => {
    const client = await getClient()
    const { data } = await client.put<T>(path, body)
    return data
  },

  delete: async <T>(path: string): Promise<T> => {
    const client = await getClient()
    const { data } = await client.delete<T>(path)
    return data
  },

  /** Force re-resolution of the backend URL (call after backend restart). */
  reset: (): void => { _client = null },
}
