import { useEffect, useCallback } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAppStore } from './store/app.store'
import { useTransfersStore } from './store/transfers.store'
import type { AipGateOperationCompletedEvent, AipGateOperationErrorEvent } from '@shared/ipc'

const POLL_INTERVAL_MS = 3_000

export default function App() {
  const pollBackendStatus = useAppStore((s) => s.pollBackendStatus)
  const resolveRecord     = useTransfersStore((s) => s.resolveRecord)
  const rejectRecord      = useTransfersStore((s) => s.rejectRecord)

  useEffect(() => {
    pollBackendStatus()
    const id = setInterval(pollBackendStatus, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pollBackendStatus])

  const handleOpCompleted = useCallback((event: AipGateOperationCompletedEvent) => {
    resolveRecord(event.mac, event.operation)
  }, [resolveRecord])

  const handleOpError = useCallback((event: AipGateOperationErrorEvent) => {
    rejectRecord(event.mac, event.operation, event.message)
  }, [rejectRecord])

  useEffect(() => {
    const u1 = window.electronAPI.aip.onGateOperationCompleted(handleOpCompleted)
    const u2 = window.electronAPI.aip.onGateOperationError(handleOpError)
    return () => { u1(); u2() }
  }, [handleOpCompleted, handleOpError])

  return <RouterProvider router={router} />
}
