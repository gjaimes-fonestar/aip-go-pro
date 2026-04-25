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

export type TransferStatus = 'waiting' | 'pending' | 'done' | 'error' | 'cancelled'

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

interface QueuedOp {
  recordId: string
  execute:  () => Promise<void>
}

interface TransfersState {
  records:      TransferRecord[]
  opQueue:      QueuedOp[]
  processingId: string | null

  addRecord:      (r: TransferRecord) => void
  enqueueOp:      (recordId: string, execute: () => Promise<void>) => void
  resolveRecord:  (mac: string, operation: string) => void
  rejectRecord:   (mac: string, operation: string, error: string) => void
  clearCompleted: () => void
  clearAll:       () => void
}

export const OPERATION_TO_KIND: Record<string, TransferKind> = {
  uploadFile:    'gate-upload',
  downloadFile:  'gate-download',
  deleteFile:    'gate-delete',
  createFolder:  'gate-folder-create',
  deleteFolder:  'gate-folder-delete',
  renameFolder:  'gate-folder-rename',
}

const updateStatus = (
  s: TransfersState,
  id: string,
  status: TransferStatus,
  error?: string,
): Partial<TransfersState> => {
  const idx = s.records.findIndex((r) => r.id === id)
  if (idx < 0) return {}
  const records = [...s.records]
  records[idx] = { ...records[idx], status, ...(error !== undefined ? { error } : {}) }
  return { records }
}

export const useTransfersStore = create<TransfersState>((set, get) => {
  const startNext = () => {
    const { opQueue } = get()
    if (opQueue.length === 0) {
      set({ processingId: null })
      return
    }
    const [next, ...rest] = opQueue
    set((s) => ({
      opQueue: rest,
      processingId: next.recordId,
      ...updateStatus(s, next.recordId, 'pending'),
    }))
    next.execute().then(
      () => {
        set((s) => ({ ...updateStatus(s, next.recordId, 'done') }))
        startNext()
      },
      (err: unknown) => {
        set((s) => ({ ...updateStatus(s, next.recordId, 'error', String(err)) }))
        startNext()
      },
    )
  }

  return {
    records:      [],
    opQueue:      [],
    processingId: null,

    addRecord: (r) => set((s) => ({ records: [r, ...s.records] })),

    enqueueOp: (recordId, execute) => {
      if (get().processingId === null) {
        set((s) => ({ processingId: recordId, ...updateStatus(s, recordId, 'pending') }))
        execute().then(
          () => {
            set((s) => ({ ...updateStatus(s, recordId, 'done') }))
            startNext()
          },
          (err: unknown) => {
            set((s) => ({ ...updateStatus(s, recordId, 'error', String(err)) }))
            startNext()
          },
        )
      } else {
        set((s) => ({ opQueue: [...s.opQueue, { recordId, execute }] }))
      }
    },

    resolveRecord: (mac, operation) => {
      const kind = OPERATION_TO_KIND[operation]
      if (!kind) return
      set((s) => {
        const idx = s.records.findIndex(
          (r) => r.mac === mac && r.kind === kind && r.status === 'pending',
        )
        if (idx < 0) return s
        const records = [...s.records]
        records[idx] = { ...records[idx], status: 'done' }
        return { records }
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
        const records = [...s.records]
        records[idx] = { ...records[idx], status: 'error', error }
        return { records }
      })
    },

    clearCompleted: () =>
      set((s) => ({
        records: s.records.filter(
          (r) => r.status === 'pending' || r.status === 'waiting',
        ),
      })),

    clearAll: () => set({ records: [], opQueue: [], processingId: null }),
  }
})
