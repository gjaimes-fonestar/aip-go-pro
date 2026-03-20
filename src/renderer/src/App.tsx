import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAppStore } from './store/app.store'

const POLL_INTERVAL_MS = 3_000

export default function App() {
  const pollBackendStatus = useAppStore((s) => s.pollBackendStatus)

  useEffect(() => {
    pollBackendStatus()
    const id = setInterval(pollBackendStatus, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pollBackendStatus])

  return <RouterProvider router={router} />
}
