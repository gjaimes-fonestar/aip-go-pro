import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/app.store'
import ThemeToggle from './ThemeToggle'
import { SettingsModal } from './SettingsModal'

export default function Header() {
  const { t } = useTranslation('header')
  const { sidebarOpen, setSidebarOpen, backend } = useAppStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleRestart = async () => {
    await window.electronAPI.backend.restart()
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={t('toggleSidebar')}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {(backend.status === 'error' || backend.status === 'stopped') && (
            <button
              onClick={handleRestart}
              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
            >
              {t('restartBackend')}
            </button>
          )}
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Settings"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
