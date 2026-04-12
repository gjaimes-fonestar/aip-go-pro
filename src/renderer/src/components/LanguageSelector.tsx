/**
 * LanguageSelector — custom dropdown to switch the application language.
 * Uses a div-based popover instead of a native <select> so that flag emoji
 * render correctly on Windows (native <select> uses GDI+/Segoe UI which
 * does not support regional indicator flag sequences).
 * Persists the selection to localStorage via saveLanguage().
 */

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, saveLanguage, type LanguageCode } from '../i18n'

export default function LanguageSelector() {
  const { i18n } = useTranslation('header')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0]

  const select = (code: LanguageCode) => {
    saveLanguage(code)
    i18n.changeLanguage(code)
    setOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 hover:bg-zinc-50 focus:border-primary focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg className="h-3 w-3 opacity-50" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
        >
          {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
            <li key={code} role="option" aria-selected={code === current.code}>
              <button
                type="button"
                onClick={() => select(code as LanguageCode)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                  code === current.code ? 'font-medium text-primary' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span>{flag}</span>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
