import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppSettings, UpdateAppSettings } from '@shared/settings'
import i18n, { SUPPORTED_LANGUAGES, saveLanguage, type LanguageCode } from '../i18n'

type Tab = 'main' | 'network' | 'security'

interface Props {
  onClose: () => void
}

/** Flag-safe language dropdown — mirrors LanguageSelector but inline. */
function LangPicker({ value, onChange }: { value: string; onChange: (code: LanguageCode) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === value) ?? SUPPORTED_LANGUAGES[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg className="h-3 w-3 opacity-50" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => { onChange(code as LanguageCode); setOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  code === value ? 'font-medium text-primary' : 'text-gray-700 dark:text-gray-300'
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

/**
 * Settings modal with three tabs: Main, Network, Security.
 * Loads current settings on mount and saves on confirm.
 */
export function SettingsModal({ onClose }: Props) {
  const { t } = useTranslation('settings')
  const [tab,     setTab]     = useState<Tab>('main')
  const [form,    setForm]    = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.settings.get()
      .then((s) => { setForm(s); setLoading(false) })
      .catch(() => { setError(t('error.load')); setLoading(false) })
  }, [t])

  function patch(changes: Partial<AppSettings>) {
    setForm((prev) => prev ? { ...prev, ...changes } : prev)
  }

  async function handleSave() {
    if (!form || saving) return
    setSaving(true)
    setError(null)
    try {
      const changes: UpdateAppSettings = { ...form }
      await window.electronAPI.settings.save(changes)
      i18n.changeLanguage(form.language)
      saveLanguage(form.language as LanguageCode)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
      tab === t
        ? 'border-primary text-primary'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('title')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b border-gray-100 dark:border-gray-800">
            <button className={tabCls('main')}     onClick={() => setTab('main')}>{t('tabs.main')}</button>
            <button className={tabCls('network')}  onClick={() => setTab('network')}>{t('tabs.network')}</button>
            <button className={tabCls('security')} onClick={() => setTab('security')}>{t('tabs.security')}</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[220px]">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : form && tab === 'main' ? (
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('main.minimizeToTray')}</span>
                <input type="checkbox" checked={form.minimizeToTray}
                  onChange={(e) => patch({ minimizeToTray: e.target.checked })}
                  className="h-4 w-4 accent-primary" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('main.minimizeOnClose')}</span>
                <input type="checkbox" checked={form.minimizeOnClose}
                  onChange={(e) => patch({ minimizeOnClose: e.target.checked })}
                  className="h-4 w-4 accent-primary" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('main.bootOnStartup')}</span>
                <input type="checkbox" checked={form.bootOnStartup}
                  onChange={(e) => patch({ bootOnStartup: e.target.checked })}
                  className="h-4 w-4 accent-primary" />
              </label>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('main.language')}</span>
                <LangPicker value={form.language} onChange={(code) => patch({ language: code })} />
              </div>
            </div>
          ) : form && tab === 'network' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('network.mode')}</span>
                <div className="flex gap-4">
                  {(['default', 'personalized'] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="networkNameMode"
                        value={mode}
                        checked={form.networkNameMode === mode}
                        onChange={() => patch({ networkNameMode: mode })}
                        className="accent-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t(`network.mode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="netName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('network.customName')}
                </label>
                <input
                  id="netName"
                  type="text"
                  disabled={form.networkNameMode !== 'personalized'}
                  value={form.networkName ?? ''}
                  onChange={(e) => patch({ networkName: e.target.value || null })}
                  placeholder={t('network.customNamePlaceholder')}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          ) : form && tab === 'security' ? (
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('security.enabled')}</span>
                <input type="checkbox" checked={form.securityEnabled}
                  onChange={(e) => patch({ securityEnabled: e.target.checked })}
                  className="h-4 w-4 accent-primary" />
              </label>
              <div className="space-y-1">
                <label htmlFor="secPwd" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('security.password')}</label>
                <input
                  id="secPwd"
                  type="password"
                  disabled={!form.securityEnabled}
                  value={form.securityPassword ?? ''}
                  onChange={(e) => patch({ securityPassword: e.target.value || null })}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('security.askOnStart')}</span>
                <input type="checkbox"
                  disabled={!form.securityEnabled}
                  checked={form.securityAskOnStart}
                  onChange={(e) => patch({ securityAskOnStart: e.target.checked })}
                  className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('security.askOnExit')}</span>
                <input type="checkbox"
                  disabled={!form.securityEnabled}
                  checked={form.securityAskOnExit}
                  onChange={(e) => patch({ securityAskOnExit: e.target.checked })}
                  className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('security.allowVoice')}</span>
                <input type="checkbox"
                  disabled={!form.securityEnabled}
                  checked={form.securityAllowVoiceWithoutPassword}
                  onChange={(e) => patch({ securityAllowVoiceWithoutPassword: e.target.checked })}
                  className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
              </label>
            </div>
          ) : null}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('common:buttons.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {t('common:buttons.save', 'Save')}
          </button>
        </div>

      </div>
    </div>
  )
}
