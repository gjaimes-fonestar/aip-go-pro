import { create } from 'zustand'

export type TransferKind =
  | 'gate-upload'
  | 'gate-download'
  | 'gate-delete'
  | 'gate-folder-create'
  | 'gate-folder-delete'
  | 'gate-folder-rename'
  | 'ftp-upload'
  | 'ftp-download'

export type TransferStatus = 'pending' | 'done' | 'error' | 'cancelled'

export interface TransferRecord {
  id:         string
  startedAt:  number
  kind:       TransferKind
  mac:        string
  deviceName: string
  label:      string
  category?:  string
  status:     TransferStatus
  error?:     string
}

interface TransfersState {
  records: TransferRecord[]
  addRecord:       (r: TransferRecord) => void
  resolveRecord:   (mac: string, operation: string) => void
  rejectRecord:    (mac: string, operation: string, error: string) => void
  clearCompleted:  () => void
  clearAll:        () => void
}

const OPERATION_TO_KIND: Record<string, TransferKind> = {
  uploadFile:    'gate-upload',
  downloadFile:  'gate-download',
  deleteFile:    'gate-delete',
  createFolder:  'gate-folder-create',
  deleteFolder:  'gate-folder-delete',
  renameFolder:  'gate-folder-rename',
}

export const useTransfersStore = create<TransfersState>((set) => ({
  records: [],

  addRecord: (r) =>
    set((s) => ({ records: [r, ...s.records] })),

  resolveRecord: (mac, operation) => {
    const kind = OPERATION_TO_KIND[operation]
    if (!kind) return
    set((s) => {
      const idx = s.records.findIndex(
        (r) => r.mac === mac && r.kind === kind && r.status === 'pending',
      )
      if (idx < 0) return s
      const next = [...s.records]
      next[idx] = { ...next[idx], status: 'done' }
      return { records: next }
    })
  },

  rejectRecord: (mac, operation, error) => {
    const kind = OPERATION_TO_KIND[operation]
    if (!kind) return
    set((s) => {
      const idx = s.records.findIndex(
        (r) => r.mac === mac && r.kind === kind && r.status === 'pending',
      )
      if (idx < 0) return s
      const next = [...s.records]
      next[idx] = { ...next[idx], status: 'error', error }
      return { records: next }
    })
  },

  clearCompleted: () =>
    set((s) => ({ records: s.records.filter((r) => r.status === 'pending') })),

  clearAll: () => set({ records: [] }),
}))
