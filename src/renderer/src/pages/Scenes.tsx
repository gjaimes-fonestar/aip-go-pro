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
    onSave({ name, description: description || undefined, steps })
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{scene.name}</p>
                  {scene.description && (
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{scene.description}</p>
                  )}
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
