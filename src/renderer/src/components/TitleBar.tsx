/**
 * TitleBar — frameless window title bar with drag region and custom window controls.
 * Uses -webkit-app-region: drag so the user can drag the window by the bar,
 * and -webkit-app-region: no-drag on the action buttons so they receive clicks.
 */

import React from 'react'

const dragStyle   = { WebkitAppRegion: 'drag'    } as React.CSSProperties
const noDragStyle  = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export default function TitleBar() {
  const minimize = () => window.electronAPI.appWindow.minimize()
  const maximize = () => window.electronAPI.appWindow.maximize()
  const close    = () => window.electronAPI.appWindow.close()

  return (
    <div
      className="flex h-8 shrink-0 items-center justify-between bg-white px-3 dark:bg-gray-800 select-none"
      style={dragStyle}
    >
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">AIP Go Pro</span>

      <div className="flex items-center" style={noDragStyle}>
        {/* Minimize */}
        <button
          onClick={minimize}
          className="flex h-8 w-10 items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Minimize"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={maximize}
          className="flex h-8 w-10 items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label="Maximize"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth={2} />
          </svg>
        </button>

        {/* Close */}
        <button
          onClick={close}
          className="flex h-8 w-10 items-center justify-center text-gray-500 hover:bg-red-500 hover:text-white dark:text-gray-400 dark:hover:bg-red-600"
          aria-label="Close"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
