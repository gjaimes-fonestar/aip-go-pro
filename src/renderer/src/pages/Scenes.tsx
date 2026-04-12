import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useScenesStore } from '../store/scenes.store'
import { useDevicesStore } from '../store/devices.store'
import type { Scene, SceneStep, SceneStepAction } from '@shared/scene'

// helpers

function deviceTypeLabel(type: number): string {
  switch (type) {
    case 0x00: return 'AIP-3010'
    case 0x01: return 'AIP-3010A'
    case 0x02: return 'AIP-PC'
    case 0x03: return 'AIP-MIC'
    case 0x04: return 'AIP-PMIC'
    case 0x05: return 'AIP-INT'
    case 0x07: return 'AIP-GW'
    case 0x08: return 'AIP-4010'
    case 0x09: return 'AIP-WEB'
    case 0x0A: return 'AIP-SM'
    case 0x0B: return 'AIP-IO'
    default:   return `0x${type.toString(16).toUpperCase().padStart(2, '0')}`
  }
}

// Icon picker — Heroicons outline paths keyed by name

const SCENE_ICONS: Record<string, string> = {
  'speaker-wave':    'M15.536 8.464a5 5 0 010 7.072M12 6.253v11.494m0 0A8.975 8.975 0 0021 12a8.975 8.975 0 00-9-5.747m0 11.494A8.975 8.975 0 013 12a8.975 8.975 0 019-5.747M9 12a3 3 0 006 0M9 12a3 3 0 000 6m6-6a3 3 0 000 6',
  'musical-note':    'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
  'bell':            'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  'megaphone':       'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  'play':            'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z',
  'stop':            'M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z',
  'bolt':            'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  'fire':            'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.62a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
  'shield-check':    'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  'sun':             'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z',
  'moon':            'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z',
  'clock':           'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  'calendar':        'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  'home':            'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  'building-office': 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z',
  'volume-up':       'M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z',
  'volume-off':      'M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z',
  'radio':           'M3.75 7.502l.002-.001a14.98 14.98 0 0116.496 0m-18 3c.94-.97 1.99-1.83 3.13-2.55m11.74 0c1.14.72 2.19 1.58 3.13 2.55M12 12.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zm0 0v6.75m0 0H9.75m2.25 0H14.25',
  'microphone':      'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
  'signal':          'M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.789M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  'exclamation':     'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  'star':            'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  'cog':             'M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495',
  'tag':             'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z',
}

const SCENE_ICON_KEYS = Object.keys(SCENE_ICONS)

function SceneIcon({ name, className = 'h-5 w-5' }: { name?: string; className?: string }) {
  const path = name ? SCENE_ICONS[name] : undefined
  if (!path) return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 0115.75 13.5H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
    </svg>
  )
}

const ACTION_TYPES = ['play_file', 'play_stream', 'stop', 'set_volume', 'fade_in', 'fade_out'] as const
type StepActionType = typeof ACTION_TYPES[number]

// Step editor row

interface StepRowProps {
  step: SceneStep
  devices: ReturnType<typeof useDevicesStore.getState>['entries']
  onChange: (step: SceneStep) => void
  onRemove: () => void
}

function StepRow({ step, devices, onChange, onRemove }: StepRowProps) {
  const { t } = useTranslation('scene')
  const deviceList = Array.from(devices.values()).map((e) => e.device)
  const actionType = step.action.type as StepActionType

  const setActionType = (type: StepActionType) => {
    const defaults: Record<StepActionType, SceneStepAction> = {
      play_file:  { type: 'play_file',  filePath: '' },
      play_stream:{ type: 'play_stream',url: '' },
      stop:       { type: 'stop' },
      set_volume: { type: 'set_volume', value: 80 },
      fade_in:    { type: 'fade_in',    targetVolume: 80, durationSecs: 5 },
      fade_out:   { type: 'fade_out',   durationSecs: 5 },
    }
    onChange({ ...step, action: defaults[type] })
  }

  const field = (className = '') =>
    `rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-primary dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 ${className}`

  return (
    <div className="flex flex-wrap items-start gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      {/* Device */}
      <select
        value={step.targetDevice}
        onChange={(e) => onChange({ ...step, targetDevice: e.target.value })}
        className={field('min-w-[140px]')}
      >
        <option value="all">{t('steps.allDevices')}</option>
        {deviceList.map((d) => (
          <option key={d.mac} value={d.mac}>
            {d.name} ({deviceTypeLabel(d.device_type)})
          </option>
        ))}
      </select>

      {/* Action type */}
      <select
        value={actionType}
        onChange={(e) => setActionType(e.target.value as StepActionType)}
        className={field('min-w-[130px]')}
      >
        {ACTION_TYPES.map((t2) => (
          <option key={t2} value={t2}>{t(`action.${t2}`)}</option>
        ))}
      </select>

      {/* Action-specific fields */}
      {actionType === 'play_file' && (
        <>
          <input
            type="text"
            value={(step.action as { type: 'play_file'; filePath: string }).filePath}
            onChange={(e) => onChange({ ...step, action: { ...(step.action as { type: 'play_file'; filePath: string }), filePath: e.target.value } })}
            placeholder={t('action.filePathPlaceholder')}
            className={field('flex-1 min-w-[120px]')}
          />
          <button
            type="button"
            onClick={async () => {
              const files = await window.electronAPI.dialog.openFile({ filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'aac'] }] })
              if (files?.[0]) onChange({ ...step, action: { ...(step.action as { type: 'play_file'; filePath: string }), filePath: files[0] } })
            }}
            className={field('shrink-0')}
          >
            {t('action.browse')}
          </button>
          <input
            type="number"
            min={0}
            value={(step.action as { type: 'play_file'; filePath: string; durationSecs?: number }).durationSecs ?? ''}
            onChange={(e) => onChange({ ...step, action: { ...(step.action as object), durationSecs: parseInt(e.target.value) || undefined } as SceneStepAction })}
            placeholder={t('action.duration')}
            className={field('w-24')}
          />
        </>
      )}

      {actionType === 'play_stream' && (
        <>
          <input
            type="text"
            value={(step.action as { type: 'play_stream'; url: string }).url}
            onChange={(e) => onChange({ ...step, action: { ...(step.action as { type: 'play_stream'; url: string }), url: e.target.value } })}
            placeholder={t('action.urlPlaceholder')}
            className={field('flex-1 min-w-[160px]')}
          />
          <input
            type="number"
            min={0}
            value={(step.action as { type: 'play_stream'; url: string; durationSecs?: number }).durationSecs ?? ''}
            onChange={(e) => onChange({ ...step, action: { ...(step.action as object), durationSecs: parseInt(e.target.value) || undefined } as SceneStepAction })}
            placeholder={t('action.duration')}
            className={field('w-24')}
          />
        </>
      )}

      {actionType === 'set_volume' && (
        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min={0}
            max={100}
            value={(step.action as { type: 'set_volume'; value: number }).value}
            onChange={(e) => onChange({ ...step, action: { type: 'set_volume', value: parseInt(e.target.value) } })}
            className="w-28 accent-primary"
          />
          <span className="text-xs text-zinc-500 w-8">
            {(step.action as { type: 'set_volume'; value: number }).value}%
          </span>
        </div>
      )}

      {actionType === 'fade_in' && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">{t('action.targetVolume')}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={(step.action as { type: 'fade_in'; targetVolume: number; durationSecs: number }).targetVolume}
              onChange={(e) => onChange({ ...step, action: { ...(step.action as { type: 'fade_in'; targetVolume: number; durationSecs: number }), targetVolume: parseInt(e.target.value) || 0 } })}
              className={field('w-16')}
            />
            <span className="text-xs text-zinc-400">%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">{t('action.duration')}</span>
            <input
              type="number"
              min={1}
              value={(step.action as { type: 'fade_in'; targetVolume: number; durationSecs: number }).durationSecs}
              onChange={(e) => onChange({ ...step, action: { ...(step.action as { type: 'fade_in'; targetVolume: number; durationSecs: number }), durationSecs: parseInt(e.target.value) || 1 } })}
              className={field('w-16')}
            />
          </div>
        </>
      )}

      {actionType === 'fade_out' && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500">{t('action.duration')}</span>
          <input
            type="number"
            min={1}
            value={(step.action as { type: 'fade_out'; durationSecs: number }).durationSecs}
            onChange={(e) => onChange({ ...step, action: { type: 'fade_out', durationSecs: parseInt(e.target.value) || 1 } })}
            className={field('w-16')}
          />
        </div>
      )}

      <button
        onClick={onRemove}
        className="ml-auto rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        title="Remove step"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// Scene modal

interface SceneModalProps {
  scene: Partial<Scene> | null
  onSave: (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

function SceneModal({ scene, onSave, onDelete, onClose }: SceneModalProps) {
  const { t } = useTranslation('scene')
  const deviceEntries = useDevicesStore((s) => s.entries)
  const isNew = !scene?.id

  const [name, setName] = useState(scene?.name ?? '')
  const [description, setDescription] = useState(scene?.description ?? '')
  const [icon, setIcon] = useState(scene?.icon ?? '')
  const [steps, setSteps] = useState<SceneStep[]>(scene?.steps ?? [])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const addStep = () => {
    const id = `step-${Date.now()}`
    setSteps((prev) => [...prev, { id, targetDevice: 'all', action: { type: 'set_volume', value: 80 } }])
  }

  const updateStep = (idx: number, step: SceneStep) => {
    setSteps((prev) => { const next = [...prev]; next[idx] = step; return next })
  }

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    onSave({ name, description: description || undefined, icon: icon || undefined, steps })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:text-zinc-100">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-base font-semibold">{isNew ? t('new') : t('edit')}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('form.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('form.description')}</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t('form.icon')}</p>
            <div className="grid grid-cols-8 gap-1.5 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40 sm:grid-cols-12">
              {SCENE_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  title={key.replace(/-/g, ' ')}
                  onClick={() => setIcon(icon === key ? '' : key)}
                  className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                    icon === key
                      ? 'bg-primary text-white shadow'
                      : 'text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  <SceneIcon name={key} className="h-5 w-5" />
                </button>
              ))}
            </div>
            {icon && (
              <button
                type="button"
                onClick={() => setIcon('')}
                className="mt-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {t('form.iconClear')}
              </button>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {t('steps.title')}
              </p>
              <button
                onClick={addStep}
                className="flex items-center gap-1 rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('steps.add')}
              </button>
            </div>

            {steps.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-200 py-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
                {t('steps.noSteps')}
              </p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    devices={deviceEntries}
                    onChange={(s) => updateStep(idx, s)}
                    onRemove={() => removeStep(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">{t('deleteConfirm', { name })}</span>
                  <button
                    onClick={() => onDelete(scene!.id!)}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                  >
                    {t('delete')}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    {t('common:buttons.cancel', 'Cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  {t('delete')}
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {t('common:buttons.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {t('common:buttons.save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Scenes page

export default function Scenes() {
  const { t } = useTranslation('scene')
  const { scenes, loading, modalSceneId, setScenes, upsertScene, removeScene, setLoading, openModal, closeModal } = useScenesStore()

  useEffect(() => {
    setLoading(true)
    window.electronAPI.scene.list()
      .then(setScenes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [setScenes, setLoading])

  const handleSave = useCallback(
    async (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (modalSceneId) {
        const updated = await window.electronAPI.scene.update({ id: modalSceneId, changes: data })
        if (updated) upsertScene(updated)
      } else {
        const created = await window.electronAPI.scene.create({ scene: data })
        upsertScene(created)
      }
      closeModal()
    },
    [modalSceneId, upsertScene, closeModal],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await window.electronAPI.scene.delete(id)
      removeScene(id)
      closeModal()
    },
    [removeScene, closeModal],
  )

  const handleTrigger = async (id: string) => {
    await window.electronAPI.scene.trigger(id)
  }

  const modalScene = modalSceneId === undefined
    ? null
    : modalSceneId === null
      ? {}
      : scenes.find((s) => s.id === modalSceneId) ?? {}

  const ACTION_TYPE_COLOR: Record<string, string> = {
    play_file:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    play_stream: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    stop:        'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
    set_volume:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    fade_in:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    fade_out:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{t('title')}</h1>
        <button
          onClick={() => openModal(null)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('new')}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && scenes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('noScenes')}</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('noScenesHelp')}</p>
        </div>
      )}

      {!loading && scenes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                    <SceneIcon name={scene.icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{scene.name}</p>
                    {scene.description && (
                      <p className="mt-0.5 truncate text-xs text-zinc-400">{scene.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openModal(scene.id)}
                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  title="Edit"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-1">
                {scene.steps.map((step) => (
                  <span
                    key={step.id}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_TYPE_COLOR[step.action.type] ?? 'bg-zinc-100 text-zinc-600'}`}
                  >
                    {t(`action.${step.action.type}`)}
                  </span>
                ))}
                {scene.steps.length === 0 && (
                  <span className="text-xs text-zinc-400">{t('steps.noSteps')}</span>
                )}
              </div>

              <button
                onClick={() => handleTrigger(scene.id)}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 dark:border-primary/30"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('trigger')}
              </button>
            </div>
          ))}
        </div>
      )}

      {modalSceneId !== undefined && modalScene !== null && (
        <SceneModal
          scene={modalScene as Partial<Scene>}
          onSave={handleSave}
          onDelete={modalSceneId ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
