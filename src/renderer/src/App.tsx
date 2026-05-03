import { useEffect, useCallback, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAppStore } from './store/app.store'
import { useCalendarStore } from './store/calendar.store'
import { useTransfersStore, OPERATION_TO_KIND } from './store/transfers.store'
import { useToastStore, type Toast } from './store/toast.store'
import { useLogStore } from './store/log.store'
import type { AipGateOperationCompletedEvent, AipGateOperationErrorEvent } from '@shared/ipc'
import i18n, { saveLanguage, type LanguageCode } from './i18n'
import { LoginGate } from './components/LoginGate'

const POLL_INTERVAL_MS = 3_000
const TOAST_DURATION_MS = 4500

const OP_SUCCESS_LABEL: Record<string, string> = {
  uploadFile:   'File uploaded successfully',
  downloadFile: 'File downloaded successfully',
  deleteFile:   'File deleted',
  createFolder: 'Folder created',
  deleteFolder: 'Folder deleted',
  renameFolder: 'Folder renamed',
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function AlertCircleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const isSuccess = toast.kind === 'success'
  return (
    <div
      className="pointer-events-auto w-80 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl dark:bg-gray-800"
      style={{ animation: 'toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-2.5">
        <div className={`mt-0.5 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
          {isSuccess ? <CheckCircleIcon /> : <AlertCircleIcon />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {isSuccess ? 'Success' : 'Error'}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-white">{toast.message}</p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-md p-0.5 text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <XSmallIcon />
        </button>
      </div>
      <div className="mx-4 mb-3 h-0.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full origin-left rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ animation: `toast-progress ${TOAST_DURATION_MS}ms linear forwards` }}
        />
      </div>
    </div>
  )
}

function ToastContainer() {
  const { toasts, dismiss } = useToastStore()
  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </>
  )
}

export default function App() {
  const pollBackendStatus = useAppStore((s) => s.pollBackendStatus)
  const resolveRecord     = useTransfersStore((s) => s.resolveRecord)
  const rejectRecord      = useTransfersStore((s) => s.rejectRecord)
  const pushToast         = useToastStore((s) => s.push)

  // null = still loading, true = locked (show startup gate), false = unlocked
  const [locked,        setLocked]        = useState<boolean | null>(null)
  const [exitRequested, setExitRequested] = useState(false)
  const [securityPass,  setSecurityPass]  = useState('')

  // ── Load settings: sync language + check startup lock ───────────────────
  useEffect(() => {
    window.electronAPI.settings.get()
      .then((s) => {
        i18n.changeLanguage(s.language)
        saveLanguage(s.language as LanguageCode)
        const needsLock = !!(s.securityEnabled && s.securityAskOnStart && s.securityPassword)
        setSecurityPass(s.securityPassword ?? '')
        setLocked(needsLock)
      })
      .catch(() => { setLocked(false) /* allow in on error */ })
  }, [])

  // ── Listen for exit-auth request from main process ───────────────────────
  useEffect(() => {
    return window.electronAPI.appWindow.onExitRequested(() => {
      window.electronAPI.settings.get()
        .then((s) => {
          setSecurityPass(s.securityPassword ?? '')
          setExitRequested(true)
        })
        .catch(() => {
          void window.electronAPI.appWindow.confirmExit()
        })
    })
  }, [])

  useEffect(() => {
    pollBackendStatus()
    const id = setInterval(pollBackendStatus, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pollBackendStatus])

  const handleOpCompleted = useCallback((event: AipGateOperationCompletedEvent) => {
    resolveRecord(event.mac, event.operation)
    const kind = OPERATION_TO_KIND[event.operation]
    if (kind) pushToast(OP_SUCCESS_LABEL[event.operation] ?? 'Operation completed', 'success')
  }, [resolveRecord, pushToast])

  const handleOpError = useCallback((event: AipGateOperationErrorEvent) => {
    rejectRecord(event.mac, event.operation, event.message)
    pushToast(event.message, 'error')
  }, [rejectRecord, pushToast])

  useEffect(() => {
    const u1 = window.electronAPI.aip.onGateOperationCompleted(handleOpCompleted)
    const u2 = window.electronAPI.aip.onGateOperationError(handleOpError)
    return () => { u1(); u2() }
  }, [handleOpCompleted, handleOpError])

  // ── Scheduler fired events → log ────────────────────────────────────────
  useEffect(() => {
    return window.electronAPI.calendar.onEventFired((id, firedAt) => {
      const ev = useCalendarStore.getState().events.find((e) => e.id === id)
      useLogStore.getState().push({
        timestamp: firedAt,
        level:     'info',
        category:  'scheduler',
        message:   ev ? `Fired: "${ev.title}"` : `Fired: event ${id}`,
        details:   ev ? `action=${ev.action.type}` : `id=${id}`,
      })
    })
  }, [])

  // ── Scene dispatched → log ───────────────────────────────────────────────
  useEffect(() => {
    return window.electronAPI.scene.onSceneFired((_id, name, firedAt) => {
      useLogStore.getState().push({
        timestamp: firedAt,
        level:     'info',
        category:  'scene',
        message:   `Dispatched: "${name}"`,
      })
    })
  }, [])

  // Startup lock: blank screen while loading, then gate until unlocked
  if (locked === null) return null
  if (locked) {
    return (
      <LoginGate
        password={securityPass}
        mode="startup"
        onSuccess={() => setLocked(false)}
      />
    )
  }

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
      {exitRequested && (
        <LoginGate
          password={securityPass}
          mode="exit"
          onSuccess={() => void window.electronAPI.appWindow.confirmExit()}
          onCancel={() => setExitRequested(false)}
        />
      )}
    </>
  )
}
