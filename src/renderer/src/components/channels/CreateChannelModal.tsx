import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

// ─── Types ────────────────────────────────────────────────────────────────────

type AudioSource = 'local' | 'online' | 'windows'
type StartWith   = 'files' | 'playlist'
type Quality     = 'low' | 'normal' | 'high'
type Channels    = 'mono' | 'stereo'

export interface NewChannelForm {
  name:           string
  sourceType:     AudioSource
  startWith:      StartWith
  streamUrl:      string
  windowsDevice:  string
  quality:        Quality
  audioChannels:  Channels
  loopAll:        boolean
  shuffle:        boolean
  startOnCreate:  boolean
  permanent:      boolean
  restoreDevices: boolean
  restoreState:   boolean
}

interface Props {
  open:     boolean
  onClose:  () => void
  onCreate: (form: NewChannelForm) => void
}

const DEFAULTS: NewChannelForm = {
  name:           '',
  sourceType:     'local',
  startWith:      'files',
  streamUrl:      '',
  windowsDevice:  'Default audio device',
  quality:        'normal',
  audioChannels:  'stereo',
  loopAll:        false,
  shuffle:        false,
  startOnCreate:  true,
  permanent:      false,
  restoreDevices: false,
  restoreState:   false,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {children}
    </p>
  )
}

function RadioOption({
  label, checked, onChange, disabled,
}: {
  label: string; checked: boolean; onChange: () => void; disabled?: boolean
}) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="accent-primary"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  )
}

function CheckOption({
  label, checked, onChange, disabled,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded accent-primary"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CreateChannelModal({ open, onClose, onCreate }: Props) {
  const { t } = useTranslation('channels')
  const [form, setForm] = useState<NewChannelForm>(DEFAULTS)
  const nameRef = useRef<HTMLInputElement>(null)

  // Focus name on open; reset on close
  useEffect(() => {
    if (open) {
      setForm(DEFAULTS)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open])

  const set = <K extends keyof NewChannelForm>(key: K, value: NewChannelForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleCreate = () => {
    if (!form.name.trim()) { nameRef.current?.focus(); return }
    onCreate(form)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('modal.title')}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('modal.name')}
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={t('modal.namePlaceholder')}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Audio sources */}
          <div>
            <SectionLabel>{t('modal.audioSources')}</SectionLabel>
            <div className="space-y-2.5">
              <RadioOption
                label={t('modal.local')}
                checked={form.sourceType === 'local'}
                onChange={() => set('sourceType', 'local')}
              />
              {form.sourceType === 'local' && (
                <div className="ml-6 flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('modal.startWith')}</span>
                  <select
                    value={form.startWith}
                    onChange={(e) => set('startWith', e.target.value as StartWith)}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <option value="files">{t('modal.files')}</option>
                    <option value="playlist">{t('modal.playlist')}</option>
                  </select>
                </div>
              )}

              <RadioOption
                label={t('modal.online')}
                checked={form.sourceType === 'online'}
                onChange={() => set('sourceType', 'online')}
              />
              {form.sourceType === 'online' && (
                <div className="ml-6">
                  <input
                    type="text"
                    value={form.streamUrl}
                    onChange={(e) => set('streamUrl', e.target.value)}
                    placeholder={t('modal.streamPlaceholder')}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}

              <RadioOption
                label={t('modal.windowsCapture')}
                checked={form.sourceType === 'windows'}
                onChange={() => set('sourceType', 'windows')}
              />
              {form.sourceType === 'windows' && (
                <div className="ml-6">
                  <select
                    value={form.windowsDevice}
                    onChange={(e) => set('windowsDevice', e.target.value)}
                    className="w-full h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <option>Default audio device</option>
                    <option>Speakers (High Definition Audio Device)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Audio streaming */}
          <div>
            <SectionLabel>{t('modal.audioStreaming')}</SectionLabel>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-12">{t('modal.quality')}</span>
                <select
                  value={form.quality}
                  onChange={(e) => set('quality', e.target.value as Quality)}
                  className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="low">{t('quality.low')}</option>
                  <option value="normal">{t('quality.normal')}</option>
                  <option value="high">{t('quality.high')}</option>
                </select>
              </div>

              <div className="flex items-center gap-5">
                <RadioOption
                  label={t('audio.mono')}
                  checked={form.audioChannels === 'mono'}
                  onChange={() => set('audioChannels', 'mono')}
                />
                <RadioOption
                  label={t('audio.stereo')}
                  checked={form.audioChannels === 'stereo'}
                  onChange={() => set('audioChannels', 'stereo')}
                />
              </div>

              <CheckOption label={t('modal.loopAll')} checked={form.loopAll}  onChange={(v) => set('loopAll', v)} />
              <CheckOption label={t('modal.shuffle')} checked={form.shuffle}  onChange={(v) => set('shuffle', v)} />
            </div>
          </div>

          {/* Options */}
          <div>
            <SectionLabel>{t('modal.options')}</SectionLabel>
            <div className="space-y-2.5">
              <CheckOption
                label={t('modal.startOnCreate')}
                checked={form.startOnCreate}
                onChange={(v) => set('startOnCreate', v)}
              />
              <CheckOption
                label={t('modal.permanent')}
                checked={form.permanent}
                onChange={(v) => set('permanent', v)}
              />
              <div className="ml-6 space-y-2">
                <CheckOption
                  label={t('modal.restoreDevices')}
                  checked={form.restoreDevices}
                  onChange={(v) => set('restoreDevices', v)}
                  disabled={!form.permanent}
                />
                <CheckOption
                  label={t('modal.restoreState')}
                  checked={form.restoreState}
                  onChange={(v) => set('restoreState', v)}
                  disabled={!form.permanent}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={!form.name.trim()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {t('buttons.create', { ns: 'common' })}
          </button>
        </div>
      </div>
    </div>
  )
}
