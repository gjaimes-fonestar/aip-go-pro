/**
 * Shared IPC channel definitions and types.
 * Imported by both main process and renderer — keep this file free of
 * Node-only or browser-only imports.
 */

export const IPC = {
  BACKEND: {
    GET_INFO: 'backend:getInfo',
    GET_URL:  'backend:getUrl',
    RESTART:  'backend:restart',
  },
  APP: {
    GET_VERSION:  'app:getVersion',
    GET_PLATFORM: 'app:getPlatform',
  },
  DIALOG: {
    OPEN_FILE: 'dialog:openFile',
    SAVE_FILE: 'dialog:saveFile',
  },
} as const

// ─── Backend ─────────────────────────────────────────────────────────────────

export type BackendStatus = 'starting' | 'ready' | 'error' | 'stopped'

export interface BackendInfo {
  status: BackendStatus
  url: string | null
  pid: number | null
  error?: string
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

export interface DialogOpenOptions {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  multiSelections?: boolean
}

export interface DialogSaveOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}
