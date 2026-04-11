/**
 * Webserver — Gate / Webserver device management.
 *
 * Tabs:
 *   SIP Extensions  — manage SIP phone extensions on the Gate SIP server
 *   SIP Conferences — group extensions into multi-destination conferences
 *   Files           — upload / download audio files to the device (Messages · Events · BGM)
 */

import { useState, useEffect, useCallback, useId } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AipSipExtension,
  AipSipConference,
  AipSipConferenceParticipant,
  AipAudioFile,
} from '@shared/ipc'
import { useDevicesStore } from '../store/devices.store'
import {
  useWebserverStore,
  confKey,
  type WebserverTab,
  type FilesSubTab,
  type TrackedFile,
} from '../store/webserver.store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function basename(path: string): string {
  return path.replace(/\\/g, '/').split('/').pop() ?? path
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const FolderIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const UploadIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const WarningIcon = () => (
  <svg className="h-5 w-5 shrink-0 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
)

const InfoIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
)

// ─── Primitives ───────────────────────────────────────────────────────────────

function TextInput({
  value, onChange, placeholder, type = 'text', disabled = false,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-8 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:disabled:bg-gray-900"
    />
  )
}

function NumInput({
  value, onChange, min, max, placeholder,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; placeholder?: string
}) {
  return (
    <input
      type="number"
      value={value || ''}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={placeholder}
      className="h-8 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
    />
  )
}

function Btn({
  onClick, disabled, variant = 'default', size = 'sm', children, title,
}: {
  onClick: () => void; disabled?: boolean; variant?: 'default' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'xs'; children: React.ReactNode; title?: string
}) {
  const base = 'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const sizes = { sm: 'px-3 py-1.5 text-sm', xs: 'px-2 py-1 text-xs' }
  const variants = {
    default: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
    primary: 'bg-primary text-white hover:bg-primary/90',
    danger:  'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
    ghost:   'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800',
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }) {
  const colors = {
    green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-500',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    gray:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title, onClose, children, footer,
}: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <XIcon />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SIP Extensions tab ───────────────────────────────────────────────────────

function SipExtensionsTab({ gateMac }: { gateMac: string }) {
  const { t } = useTranslation('webserver')
  const { sipExtensions, setSipExtensions, upsertSipExtension, removeSipExtensionLocal } =
    useWebserverStore()
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newExt, setNewExt] = useState({ extensionNumber: 0, username: '', password: '', mac: '' })

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.electronAPI.aip.getSipExtensions()
      setSipExtensions(list)
    } finally {
      setLoading(false)
    }
  }, [setSipExtensions])

  const handleCreate = async () => {
    const ext: AipSipExtension = {
      mac:             newExt.mac || gateMac,
      extensionNumber: newExt.extensionNumber,
      username:        newExt.username,
    }
    await window.electronAPI.aip.saveSipExtension(ext)
    await window.electronAPI.aip.addSipExtension(gateMac, {
      extensionNumber: ext.extensionNumber,
      username:        ext.username,
      password:        newExt.password || undefined,
    })
    upsertSipExtension(ext)
    setShowCreate(false)
    setNewExt({ extensionNumber: 0, username: '', password: '', mac: '' })
  }

  const handleDelete = async (ext: AipSipExtension) => {
    await window.electronAPI.aip.deleteSipExtension(gateMac, {
      extensionNumber: ext.extensionNumber,
      username:        ext.username,
    })
    await window.electronAPI.aip.removeSipExtension(ext.mac)
    removeSipExtensionLocal(ext.mac)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <InfoIcon />
        <p>{t('extensions.info')}</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('extensions.count', { count: sipExtensions.length })}
        </span>
        <div className="flex gap-2">
          {loading && <SpinnerIcon />}
          <Btn onClick={reload} variant="default" size="sm">{t('buttons.refresh', { ns: 'common' })}</Btn>
          <Btn onClick={() => setShowCreate(true)} variant="primary" size="sm">
            <PlusIcon /> {t('extensions.create')}
          </Btn>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('extensions.columns.number')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('extensions.columns.extension')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('extensions.columns.device')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {sipExtensions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                  {t('extensions.empty')}
                </td>
              </tr>
            )}
            {sipExtensions.map((ext) => (
              <tr key={ext.mac} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
                <td className="px-4 py-3 text-sm tabular-nums text-gray-500">{ext.extensionNumber}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <PhoneIcon />
                    {ext.username}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{ext.mac || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Btn onClick={() => handleDelete(ext)} variant="danger" size="xs" title={t('extensions.delete')}>
                    <TrashIcon /> {t('buttons.delete', { ns: 'common' })}
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal
          title={t('extensions.create')}
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <Btn onClick={() => setShowCreate(false)} variant="default">{t('buttons.cancel', { ns: 'common' })}</Btn>
              <Btn
                onClick={handleCreate}
                variant="primary"
                disabled={!newExt.username || !newExt.extensionNumber}
              >
                {t('buttons.create', { ns: 'common' })}
              </Btn>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('extensions.form.number')}</label>
              <NumInput value={newExt.extensionNumber} onChange={(v) => setNewExt((p) => ({ ...p, extensionNumber: v }))} min={1} placeholder={t('extensions.form.numberPlaceholder')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('extensions.form.username')}</label>
              <TextInput value={newExt.username} onChange={(v) => setNewExt((p) => ({ ...p, username: v }))} placeholder={t('extensions.form.usernamePlaceholder')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('extensions.form.password')}</label>
              <TextInput value={newExt.password} onChange={(v) => setNewExt((p) => ({ ...p, password: v }))} type="password" placeholder={t('extensions.form.password')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('extensions.form.mac')}</label>
              <TextInput value={newExt.mac} onChange={(v) => setNewExt((p) => ({ ...p, mac: v }))} placeholder={t('extensions.form.macPlaceholder')} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── SIP Conferences tab ──────────────────────────────────────────────────────

function SipConferencesTab({ gateMac }: { gateMac: string }) {
  const { t } = useTranslation('webserver')
  const { sipConferences, setSipConferences, upsertSipConference, removeSipConferenceLocal } = useWebserverStore()
  const [loading, setLoading]           = useState(false)
  const [showCreate, setShowCreate]     = useState(false)
  const [showAddUser, setShowAddUser]   = useState(false)
  const [newConf, setNewConf]           = useState({ conferenceNumber: 0, name: '' })
  const [newParticipant, setNewParticipant] = useState({ extensionNumber: 0, username: '' })
  const [selectedIdx, setSelectedIdx]   = useState<number | null>(null)

  // Reset selection when the device changes
  useEffect(() => { setSelectedIdx(null) }, [gateMac])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.electronAPI.aip.getSipConferencesForDevice(gateMac)
      setSipConferences(list)
      setSelectedIdx(null)
    } finally {
      setLoading(false)
    }
  }, [gateMac, setSipConferences])

  const selected = selectedIdx !== null ? (sipConferences[selectedIdx] ?? null) : null

  const handleCreate = async () => {
    const conf: AipSipConference = {
      mac:              gateMac,
      conferenceNumber: newConf.conferenceNumber,
      name:             newConf.name,
      participants:     [],
    }
    await window.electronAPI.aip.saveSipConference(conf)
    await window.electronAPI.aip.createSipConference(gateMac, conf)
    upsertSipConference(conf)
    setShowCreate(false)
    setNewConf({ conferenceNumber: 0, name: '' })
  }

  const handleDeleteConf = async (conf: AipSipConference) => {
    await window.electronAPI.aip.removeSipConference(conf.mac, conf.conferenceNumber)
    removeSipConferenceLocal(conf.mac, conf.conferenceNumber)
    setSelectedIdx(null)
  }

  const handleAddParticipant = async () => {
    if (!selected) return
    const participant: AipSipConferenceParticipant = {
      extensionNumber: newParticipant.extensionNumber,
      username:        newParticipant.username,
    }
    await window.electronAPI.aip.addSipConferenceUser(gateMac, participant)
    const updated: AipSipConference = {
      ...selected,
      participants: [...selected.participants, participant],
    }
    await window.electronAPI.aip.saveSipConference(updated)
    upsertSipConference(updated)
    setShowAddUser(false)
    setNewParticipant({ extensionNumber: 0, username: '' })
  }

  const handleRemoveParticipant = async (p: AipSipConferenceParticipant) => {
    if (!selected) return
    const updated: AipSipConference = {
      ...selected,
      participants: selected.participants.filter(
        (x) => x.extensionNumber !== p.extensionNumber
      ),
    }
    await window.electronAPI.aip.saveSipConference(updated)
    upsertSipConference(updated)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <InfoIcon />
        <p>{t('conferences.info')}</p>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 gap-3 overflow-hidden">

        {/* Left: conference list */}
        <div className="flex w-56 shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('conferences.header')}</span>
            {loading && <SpinnerIcon />}
          </div>
          <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {sipConferences.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-gray-400">{t('conferences.empty')}</p>
              )}
              {sipConferences.map((c, i) => (
                <button
                  key={confKey(c.mac, c.conferenceNumber)}
                  onClick={() => setSelectedIdx(i)}
                  className={`group flex w-full items-start justify-between px-4 py-3 text-left transition-colors ${
                    selectedIdx === i
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name || t('conferences.title', { number: c.conferenceNumber })}</p>
                    <p className="text-xs text-gray-400">{t('conferences.participants', { count: c.participants.length })}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Btn onClick={reload} variant="default" size="xs">{t('buttons.refresh', { ns: 'common' })}</Btn>
            <Btn onClick={() => setShowCreate(true)} variant="primary" size="xs">
              <PlusIcon /> {t('buttons.create', { ns: 'common' })}
            </Btn>
            {selected && (
              <Btn onClick={() => handleDeleteConf(selected)} variant="danger" size="xs">
                <TrashIcon />
              </Btn>
            )}
          </div>
        </div>

        {/* Right: participants */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {selected ? t('conferences.extensionsFor', { name: selected.name || t('conferences.title', { number: selected.conferenceNumber }) }) : t('conferences.extensionsHeader')}
            </span>
          </div>
          <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {!selected ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400">{t('conferences.selectConference')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {selected.participants.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-gray-400">{t('conferences.noExtensions')}</p>
                )}
                {selected.participants.map((p) => (
                  <div key={p.extensionNumber}
                    className="flex items-center justify-between bg-white px-4 py-3 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <PhoneIcon />
                      <span className="text-sm text-gray-900 dark:text-white">{p.username}</span>
                      <span className="text-xs text-gray-400">#{p.extensionNumber}</span>
                    </div>
                    <Btn onClick={() => handleRemoveParticipant(p)} variant="ghost" size="xs" title="Remove">
                      <XIcon />
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="flex gap-2">
              <Btn onClick={() => setShowAddUser(true)} variant="primary" size="xs">
                <PlusIcon /> {t('conferences.addExt')}
              </Btn>
            </div>
          )}
        </div>
      </div>

      {/* Create conference modal */}
      {showCreate && (
        <Modal
          title={t('conferences.create')}
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <Btn onClick={() => setShowCreate(false)} variant="default">{t('buttons.cancel', { ns: 'common' })}</Btn>
              <Btn
                onClick={handleCreate}
                variant="primary"
                disabled={!newConf.name || !newConf.conferenceNumber}
              >
                {t('buttons.create', { ns: 'common' })}
              </Btn>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('conferences.form.number')}</label>
              <NumInput value={newConf.conferenceNumber} onChange={(v) => setNewConf((p) => ({ ...p, conferenceNumber: v }))} min={1} placeholder={t('conferences.form.numberPlaceholder')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('conferences.form.name')}</label>
              <TextInput value={newConf.name} onChange={(v) => setNewConf((p) => ({ ...p, name: v }))} placeholder={t('conferences.form.namePlaceholder')} />
            </div>
          </div>
        </Modal>
      )}

      {/* Add participant modal */}
      {showAddUser && (
        <Modal
          title={t('conferences.addExtension')}
          onClose={() => setShowAddUser(false)}
          footer={
            <>
              <Btn onClick={() => setShowAddUser(false)} variant="default">{t('buttons.cancel', { ns: 'common' })}</Btn>
              <Btn
                onClick={handleAddParticipant}
                variant="primary"
                disabled={!newParticipant.username || !newParticipant.extensionNumber}
              >
                {t('buttons.add', { ns: 'common' })}
              </Btn>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('conferences.form.extNumber')}</label>
              <NumInput value={newParticipant.extensionNumber} onChange={(v) => setNewParticipant((p) => ({ ...p, extensionNumber: v }))} min={1} placeholder={t('extensions.form.numberPlaceholder')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('conferences.form.extUsername')}</label>
              <TextInput value={newParticipant.username} onChange={(v) => setNewParticipant((p) => ({ ...p, username: v }))} placeholder={t('conferences.form.extUsernamePlaceholder')} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── File row ─────────────────────────────────────────────────────────────────

function FileRow({ file, onRemove }: { file: TrackedFile; onRemove: (id: string) => void }) {
  const { t } = useTranslation('webserver')
  const statusBadge = {
    idle:        <Badge color="gray">{t('files.status.queued')}</Badge>,
    transferring:<Badge color="blue">{t('files.status.transferring')}</Badge>,
    done:        <Badge color="green"><CheckIcon /> {t('files.status.done')}</Badge>,
    error:       <Badge color="red">{t('files.status.error')}</Badge>,
    cancelled:   <Badge color="yellow">{t('files.status.cancelled')}</Badge>,
  }[file.status]

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="flex w-5 shrink-0 items-center justify-center text-gray-400">
        {file.direction === 'upload' ? <UploadIcon /> : <DownloadIcon />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.label}</span>
          {statusBadge}
        </div>
        <span className="truncate text-xs text-gray-400">{file.remotePath}</span>
        {file.status === 'transferring' && (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${file.percent}%` }}
            />
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(file.id)}
        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
        title={t('files.removeFromList')}
      >
        <XIcon />
      </button>
    </div>
  )
}

// ─── Catalog file row ─────────────────────────────────────────────────────────

function CatalogFileRow({ file, deviceIp }: { file: AipAudioFile; deviceIp: string }) {
  const { t } = useTranslation('webserver')
  const { addFile } = useWebserverStore()
  const uid = useId()

  const handleDownload = async () => {
    const savePath = await window.electronAPI.dialog.saveFile({
      title:       t('files.save'),
      defaultPath: file.name,
    })
    if (!savePath) return
    const remotePath = file.directoryName ? `${file.directoryName}/${file.name}` : file.name
    const id         = `${uid}-${Date.now()}`
    addFile({
      id,
      category:   'messages',
      label:      file.name,
      localPath:  savePath,
      remotePath,
      deviceIp,
      direction:  'download',
      status:     'idle',
      percent:    0,
    })
    await window.electronAPI.aip.enqueueFileTransfer({
      localPath:  savePath,
      remotePath,
      deviceIp,
      direction:  'download',
    })
  }

  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-900 dark:text-white">{file.name}</p>
        {file.directoryName && (
          <p className="truncate text-xs text-gray-400">{file.directoryName}</p>
        )}
      </div>
      <Btn onClick={handleDownload} variant="ghost" size="xs" title="Download">
        <DownloadIcon />
      </Btn>
    </div>
  )
}

// ─── Files tab ────────────────────────────────────────────────────────────────

const FILE_SECTION_KEYS: FilesSubTab[] = ['messages', 'events', 'bgm']

const REMOTE_PREFIXES: Record<FilesSubTab, string> = {
  messages: '/messages/',
  events:   '/events/',
  bgm:      '/bgm/',
}

const AUDIO_TYPE_FOR_TAB: Record<FilesSubTab, number> = {
  messages: 0,
  events:   1,
  bgm:      2,
}

function FilesTab({ deviceMac, deviceIp }: { deviceMac: string; deviceIp: string }) {
  const { t } = useTranslation('webserver')
  const {
    files, filesSubTab, setFilesSubTab, addFile, removeFile,
    deviceAudioFiles, setDeviceAudioFiles,
  } = useWebserverStore()
  const [remotePath, setRemotePath] = useState('')
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const uid = useId()

  const sectionFiles = files.filter((f) => f.category === filesSubTab)

  const audioType = AUDIO_TYPE_FOR_TAB[filesSubTab]
  const catalogFiles = deviceAudioFiles.filter((f) => f.audioType === audioType)

  const reloadCatalog = useCallback(async () => {
    setLoadingCatalog(true)
    try {
      const list = await window.electronAPI.aip.getAudioFilesForDevice(deviceMac, audioType)
      setDeviceAudioFiles(list)
    } catch {
      // ignore — device may not support audio file queries
    } finally {
      setLoadingCatalog(false)
    }
  }, [deviceMac, audioType, setDeviceAudioFiles])

  useEffect(() => {
    reloadCatalog()
  }, [reloadCatalog])

  const handleUpload = async () => {
    const paths = await window.electronAPI.dialog.openFile({
      title: t('files.selectFile'),
      filters: [
        { name: t('files.categories.messages'), extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] },
        { name: t('buttons.upload', { ns: 'common' }), extensions: ['*'] },
      ],
    })
    if (!paths || paths.length === 0) return
    const localPath = paths[0]
    const label     = basename(localPath)
    const remote    = remotePath || `${REMOTE_PREFIXES[filesSubTab]}${label}`
    const id        = `${uid}-${Date.now()}`

    addFile({ id, category: filesSubTab, label, localPath, remotePath: remote, deviceIp, direction: 'upload', status: 'idle', percent: 0 })
    await window.electronAPI.aip.enqueueFileTransfer({ localPath, remotePath: remote, deviceIp, direction: 'upload' })
    setRemotePath('')
  }

  const handleDownload = async () => {
    if (!remotePath) return
    const savePath = await window.electronAPI.dialog.saveFile({
      title: t('files.saveDownloaded'),
      defaultPath: basename(remotePath),
    })
    if (!savePath) return
    const id    = `${uid}-${Date.now()}`
    const label = basename(remotePath)

    addFile({ id, category: filesSubTab, label, localPath: savePath, remotePath, deviceIp, direction: 'download', status: 'idle', percent: 0 })
    await window.electronAPI.aip.enqueueFileTransfer({ localPath: savePath, remotePath, deviceIp, direction: 'download' })
    setRemotePath('')
  }

  const handleCancel = () => {
    window.electronAPI.aip.cancelFileTransfer().catch(console.error)
  }

  const hasActive = files.some((f) => f.status === 'transferring')

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      {/* Section tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
        {FILE_SECTION_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setFilesSubTab(key)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              filesSubTab === key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t(`files.categories.${key}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: device catalog */}
        <div className="flex w-64 shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('files.onDevice')}
            </span>
            <div className="flex items-center gap-1">
              {loadingCatalog && <SpinnerIcon />}
              <Btn onClick={reloadCatalog} variant="ghost" size="xs">{t('buttons.refresh', { ns: 'common' })}</Btn>
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {catalogFiles.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <FolderIcon />
                <p className="mt-2 text-xs text-gray-400">{t('files.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {catalogFiles.map((f) => (
                  <CatalogFileRow key={`${f.mac}|${f.id}`} file={f} deviceIp={deviceIp} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: transfer queue */}
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t('files.transfers')}
          </span>
          <div className="flex-1 space-y-2 overflow-auto">
            {sectionFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12 dark:border-gray-700">
                <FolderIcon />
                <p className="mt-2 text-sm text-gray-400">{t('files.noTransfers')}</p>
                <p className="text-xs text-gray-400">{t('files.transferHelp')}</p>
              </div>
            )}
            {sectionFiles.map((f) => (
              <FileRow key={f.id} file={f} onRemove={removeFile} />
            ))}
          </div>

          {/* Add-file row */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('files.remotePath')}</p>
            <div className="flex gap-2">
              <TextInput
                value={remotePath}
                onChange={setRemotePath}
                placeholder={`${REMOTE_PREFIXES[filesSubTab]}filename.mp3`}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={handleUpload} variant="primary" size="sm">
                <UploadIcon /> {t('files.uploadFile')}
              </Btn>
              <Btn onClick={handleDownload} variant="default" size="sm" disabled={!remotePath}>
                <DownloadIcon /> {t('buttons.download', { ns: 'common' })}
              </Btn>
              {hasActive && (
                <Btn onClick={handleCancel} variant="danger" size="sm">
                  <XIcon /> {t('files.cancelTransfer')}
                </Btn>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEVICE_TYPE_LABEL: Record<number, string> = {
  7: 'AIP-GATE',
  9: 'AIP-WEB',
}

const TABS: { key: WebserverTab; tKey: string; Icon: React.FC }[] = [
  { key: 'sip-extensions',  tKey: 'tabs.extensions',  Icon: PhoneIcon  },
  { key: 'sip-conferences', tKey: 'tabs.conferences',  Icon: UsersIcon  },
  { key: 'files',           tKey: 'tabs.files',        Icon: FolderIcon },
]

export default function Webserver() {
  const { t } = useTranslation('webserver')
  // Driven by the device selected in the Devices page
  const selectedMac   = useDevicesStore((s) => s.selectedMac)
  const entries       = useDevicesStore((s) => s.entries)
  const { activeTab, setActiveTab, setSipExtensions, setSipConferences } = useWebserverStore()
  const { applyProgress, applyCompleted } = useWebserverStore()

  const selectedEntry  = selectedMac ? entries.get(selectedMac) : undefined
  const selectedDevice = selectedEntry?.device ?? null
  const isWebserver    = selectedDevice
    ? selectedDevice.device_type === 7 || selectedDevice.device_type === 9
    : false

  // Load existing data from daemon on device change
  useEffect(() => {
    if (!selectedDevice || !isWebserver) return
    const mac = selectedDevice.mac
    window.electronAPI.aip.getSipExtensions()
      .then(setSipExtensions)
      .catch(console.error)
    window.electronAPI.aip.getSipConferencesForDevice(mac)
      .then(setSipConferences)
      .catch(console.error)
  }, [selectedDevice?.mac])

  // Wire file transfer push events for the lifetime of this page
  useEffect(() => {
    const unsubProgress  = window.electronAPI.aip.onFileTransferProgress(applyProgress)
    const unsubCompleted = window.electronAPI.aip.onFileTransferCompleted(applyCompleted)
    return () => { unsubProgress(); unsubCompleted() }
  }, [applyProgress, applyCompleted])

  // Not a Gate/Webserver device selected
  if (!selectedDevice || !isWebserver) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-8">
        <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        <div>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{t('empty.title')}</p>
          <p className="mt-1 text-sm text-gray-400">{t('empty.help')}</p>
        </div>
      </div>
    )
  }

  const typeLabel = DEVICE_TYPE_LABEL[selectedDevice.device_type] ?? `Type ${selectedDevice.device_type}`

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Icons.Webserver />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{selectedDevice.name}</h1>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20">
                {typeLabel}
              </span>
            </div>
            <p className="font-mono text-xs text-gray-400">{selectedDevice.mac} · {selectedDevice.network.ip}</p>
          </div>
        </div>

        {/* DHCP warning */}
        {selectedDevice.network.dhcp && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700/50 dark:bg-yellow-900/20 dark:text-yellow-300">
            <WarningIcon />
            <p>{t('warnings.dhcp')}</p>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 gap-1 border-b border-gray-200 px-6 dark:border-gray-700">
        {TABS.map(({ key, tKey, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon />
            {t(tKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sip-extensions'  && <SipExtensionsTab  gateMac={selectedDevice.mac} />}
        {activeTab === 'sip-conferences' && <SipConferencesTab gateMac={selectedDevice.mac} />}
        {activeTab === 'files'           && <FilesTab          deviceMac={selectedDevice.mac} deviceIp={selectedDevice.network.ip} />}
      </div>
    </div>
  )
}

// Inline icon for the header (re-uses same SVG as Sidebar)
const Icons = {
  Webserver: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5 12H3m18 0h-2M12 5V3m0 18v-2m4.95-13.95l-1.414 1.414M6.464 17.536L5.05 18.95M18.95 18.95l-1.414-1.414M6.464 6.464L5.05 5.05M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
}
