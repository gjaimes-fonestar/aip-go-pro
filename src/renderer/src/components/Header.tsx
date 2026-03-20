import { useAppStore } from '../store/app.store'

export default function Header() {
  const { sidebarOpen, setSidebarOpen, backend } = useAppStore()

  const handleRestart = async () => {
    await window.electronAPI.backend.restart()
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {(backend.status === 'error' || backend.status === 'stopped') && (
          <button
            onClick={handleRestart}
            className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
          >
            Restart Backend
          </button>
        )}
      </div>
    </header>
  )
}
