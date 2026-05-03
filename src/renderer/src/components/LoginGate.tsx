import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** The correct password to match against. */
  password: string
  /** 'startup' = full-screen blocking overlay; 'exit' = modal with Cancel. */
  mode: 'startup' | 'exit'
  onSuccess: () => void
  /** Only used in 'exit' mode — cancels the close attempt. */
  onCancel?: () => void
}

/**
 * Password prompt used for two scenarios:
 *  - startup: blocks the whole UI until the correct password is entered
 *  - exit: shown when the user tries to close the app and securityAskOnExit is on
 */
export function LoginGate({ password, mode, onSuccess, onCancel }: Props) {
  const { t } = useTranslation('settings')
  const [value,  setValue]  = useState('')
  const [error,  setError]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value === password) {
      onSuccess()
    } else {
      setError(true)
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const isExit = mode === 'exit'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="px-6 pt-8 pb-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AIP Go Pro</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isExit ? t('auth.exitSubtitle') : t('auth.startupSubtitle')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false) }}
              placeholder={t('auth.passwordPlaceholder')}
              autoFocus
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors
                dark:bg-gray-800 dark:text-gray-100
                ${error
                  ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
                  : 'border-gray-200 bg-white focus:border-primary dark:border-gray-700'
                }`}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                {t('auth.wrongPassword')}
              </p>
            )}
          </div>

          <div className={`flex gap-3 ${isExit ? '' : 'justify-center'}`}>
            {isExit && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t('common:buttons.cancel', 'Cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={!value}
              className={`rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${isExit && onCancel ? 'flex-1' : 'w-full'}`}
            >
              {isExit ? t('auth.exit') : t('auth.unlock')}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
