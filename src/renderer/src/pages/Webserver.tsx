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
  AipGateConnectionConfig,
  AipGateRemoteFile,
  AipGateRemoteFolder,
  AipGateFilesUpdatedEvent,
  AipGateFoldersUpdatedEvent,
  AipGateWebConfig,
  AipGateSceneActions,
  AipGateRemoteScene,
  AipGateRemoteSchedule,
} from '@shared/ipc'
import { useDevicesStore } from '../store/devices.store'
import { getModelName, isWebserverDevice } from '../utils/deviceTypes'
import {
  useWebserverStore,
  confKey,
  type WebserverTab,
  type FilesSubTab,
} from '../store/webserver.store'
import { useTransfersStore } from '../store/transfers.store'

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

// ─── Gate Files tab ───────────────────────────────────────────────────────────

const GATE_CATEGORIES: FilesSubTab[] = ['messages', 'events', 'bgm']

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

function GateFileRow({
  file, onDownload, onDelete,
}: {
  file: AipGateRemoteFile
  onDownload: (f: AipGateRemoteFile) => void
  onDelete:   (f: AipGateRemoteFile) => void
}) {
  const { t } = useTranslation('webserver')
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-900 dark:text-white">{file.name}</p>
        <p className="truncate text-xs text-gray-400">
          {file.folder ? `${file.folder} · ` : ''}{file.duration > 0 ? t('files.gate.duration', { sec: file.duration }) : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Btn onClick={() => onDownload(file)} variant="ghost" size="xs" title={t('files.gate.download')}>
          <DownloadIcon />
        </Btn>
        <Btn onClick={() => onDelete(file)} variant="danger" size="xs" title={t('files.gate.delete')}>
          <TrashIcon />
        </Btn>
      </div>
    </div>
  )
}

function FilesTab({
  gateMac, deviceIp, deviceName, gateWebConfig,
}: {
  gateMac: string
  deviceIp: string
  deviceName: string
  gateWebConfig: AipGateWebConfig | undefined
}) {
  const { t } = useTranslation('webserver')
  const { filesSubTab, setFilesSubTab, gateFiles, gateFolders, setGateFiles, setGateFolders } = useWebserverStore()
  const addRecord = useTransfersStore((s) => s.addRecord)
  const enqueueOp = useTransfersStore((s) => s.enqueueOp)
  const uid = useId()

  const [loading, setLoading]                     = useState(false)
  const [username, setUsername]                   = useState('')
  const [password, setPassword]                   = useState('')
  const [selectedFolder, setSelectedFolder] = useState<AipGateRemoteFolder | null>(null)
  const [showCreateFolder, setShowCreateFolder]   = useState(false)
  const [newFolderName, setNewFolderName]         = useState('')
  const [renameTarget, setRenameTarget]           = useState<AipGateRemoteFolder | null>(null)
  const [renameName, setRenameName]               = useState('')
  const [deleteFileTarget, setDeleteFileTarget]   = useState<AipGateRemoteFile | null>(null)

  const authEnabled = gateWebConfig?.authEnabled ?? false
  const canManageFolders = filesSubTab === 'bgm'

  const buildConfig = useCallback((): AipGateConnectionConfig => ({
    ip:         deviceIp,
    sslEnabled: gateWebConfig?.sslEnabled ?? false,
    username:   authEnabled ? username : undefined,
    password:   authEnabled ? password : undefined,
  }), [deviceIp, gateWebConfig, authEnabled, username, password])

  const allFiles   = gateFiles.get(gateMac)   ?? []
  const allFolders = gateFolders.get(gateMac) ?? []

  const categoryFolders = allFolders.filter((f) => f.category === filesSubTab)

  // Keep selectedFolder in sync with refreshed data; reset only if truly gone.
  useEffect(() => {
    setSelectedFolder((prev) => {
      if (!prev) return prev
      const fresh = categoryFolders.find((f) => f.id === prev.id)
      if (fresh) return fresh
      return categoryFolders.find((f) => f.name === prev.name) ?? null
    })
  }, [filesSubTab, categoryFolders])

  const visibleFiles = allFiles.filter((f) => {
    if (f.category !== filesSubTab) return false
    if (selectedFolder !== null) return f.folder === selectedFolder.name
    return true
  })

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const config = buildConfig()
      await window.electronAPI.aip.gateFetchFiles(gateMac, config)
      await window.electronAPI.aip.gateFetchFolders(gateMac, config)
      const [files, folders] = await Promise.all([
        window.electronAPI.aip.gateGetFiles(gateMac),
        window.electronAPI.aip.gateGetFolders(gateMac),
      ])
      setGateFiles(gateMac, files)
      setGateFolders(gateMac, folders)
    } catch (_) {
      // silent errors on background refresh
    } finally {
      if (!silent) setLoading(false)
    }
  }, [gateMac, buildConfig, setGateFiles, setGateFolders])

  useEffect(() => {
    const u1 = window.electronAPI.aip.onGateFilesUpdated((ev: AipGateFilesUpdatedEvent) => {
      if (ev.mac === gateMac) setGateFiles(gateMac, ev.files)
    })
    const u2 = window.electronAPI.aip.onGateFoldersUpdated((ev: AipGateFoldersUpdatedEvent) => {
      if (ev.mac === gateMac) setGateFolders(gateMac, ev.folders)
    })
    return () => { u1(); u2() }
  }, [gateMac, setGateFiles, setGateFolders])

  useEffect(() => { refresh() }, [gateMac])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh(true)
    }, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const handleUpload = async () => {
    const paths = await window.electronAPI.dialog.openFile({
      title:   t('files.gate.selectUpload'),
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] }],
    })
    if (!paths || paths.length === 0) return
    const localPath = paths[0]
    const label     = basename(localPath)
    const id        = `${uid}-${Date.now()}`
    const config    = buildConfig()
    const folderId  = selectedFolder?.id ?? undefined
    addRecord({ id, startedAt: Date.now(), kind: 'gate-upload', mac: gateMac, deviceName, label, category: filesSubTab, status: 'waiting' })
    enqueueOp(id, async () => {
      await window.electronAPI.aip.gateUploadFile(gateMac, config, localPath, filesSubTab, folderId)
      await refresh(true)
    })
  }

  const handleDownload = async (file: AipGateRemoteFile) => {
    const savePath = await window.electronAPI.dialog.saveFile({
      title:       t('files.gate.download'),
      defaultPath: file.name,
    })
    if (!savePath) return
    const id     = `${uid}-${Date.now()}`
    const config = buildConfig()
    addRecord({ id, startedAt: Date.now(), kind: 'gate-download', mac: gateMac, deviceName, label: file.name, category: filesSubTab, status: 'waiting' })
    enqueueOp(id, async () => {
      await window.electronAPI.aip.gateDownloadFile(gateMac, config, file.id, savePath)
    })
  }

  const handleDelete = async (file: AipGateRemoteFile) => {
    setDeleteFileTarget(null)
    const id     = `${uid}-${Date.now()}`
    const config = buildConfig()
    addRecord({ id, startedAt: Date.now(), kind: 'gate-delete', mac: gateMac, deviceName, label: file.name, category: filesSubTab, status: 'waiting' })
    enqueueOp(id, async () => {
      await window.electronAPI.aip.gateDeleteFile(gateMac, config, file.id)
      await refresh(true)
    })
  }

  const handleCreateFolder = async () => {
    if (!newFolderName) return
    const name   = newFolderName
    const id     = `${uid}-${Date.now()}`
    const config = buildConfig()
    addRecord({ id, startedAt: Date.now(), kind: 'gate-folder-create', mac: gateMac, deviceName, label: name, category: filesSubTab, status: 'waiting' })
    setShowCreateFolder(false)
    setNewFolderName('')
    enqueueOp(id, async () => {
      await window.electronAPI.aip.gateCreateFolder(gateMac, config, name, filesSubTab)
      await refresh(true)
    })
  }

  const handleRenameFolder = async () => {
    if (!renameTarget || !renameName) return
    const target = renameTarget
    const name   = renameName
    const id     = `${uid}-${Date.now()}`
    const config = buildConfig()
    addRecord({ id, startedAt: Date.now(), kind: 'gate-folder-rename', mac: gateMac, deviceName, label: name, category: filesSubTab, status: 'waiting' })
    setRenameTarget(null)
    setRenameName('')
    enqueueOp(id, async () => {
      await window.electronAPI.aip.gateRenameFolder(gateMac, config, target.name, name, filesSubTab)
      await refresh(true)
    })
  }

  const handleDeleteFolder = async (folder: AipGateRemoteFolder) => {
    const id     = `${uid}-${Date.now()}`
    const config = buildConfig()
    addRecord({ id, startedAt: Date.now(), kind: 'gate-folder-delete', mac: gateMac, deviceName, label: folder.name, category: filesSubTab, status: 'waiting' })
    if (selectedFolder?.id === folder.id) setSelectedFolder(null)
    enqueueOp(id, async () => {
      await window.electronAPI.aip.gateDeleteFolder(gateMac, config, folder.name, filesSubTab)
      await refresh(true)
    })
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Auth credentials */}
      {authEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/20">
          <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">{t('files.gate.authRequired')}</p>
          <div className="flex gap-2">
            <TextInput value={username} onChange={setUsername} placeholder={t('files.gate.username')} />
            <TextInput value={password} onChange={setPassword} placeholder={t('files.gate.password')} type="password" />
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
        {GATE_CATEGORIES.map((key) => (
          <button
            key={key}
            onClick={() => { setFilesSubTab(key); setSelectedFolder(null) }}
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

      {/* Explorer: folders left, files right */}
      <div className="flex flex-1 gap-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">

        {/* Left pane — folder tree */}
        <div className="flex w-48 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('files.gate.folders', { defaultValue: 'Folders' })}
            </span>
            {canManageFolders && (
              <button
                onClick={() => { setShowCreateFolder(true); setNewFolderName('') }}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                title={t('files.gate.createFolder')}
              >
                <PlusIcon />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* All files row */}
            <button
              onClick={() => setSelectedFolder(null)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                selectedFolder === null
                  ? 'bg-primary/10 font-medium text-primary dark:bg-primary/20'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'
              }`}
            >
              <FolderIcon />
              <span className="truncate">{t('files.gate.allFiles', { defaultValue: 'All files' })}</span>
            </button>
            {categoryFolders.map((folder) => (
              <div
                key={folder.id}
                className={`group flex items-center gap-1 pl-3 pr-1 py-2 transition-colors ${
                  selectedFolder?.id === folder.id
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'
                }`}
              >
                <button
                  onClick={() => setSelectedFolder(folder)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                >
                  <FolderIcon />
                  <span className="truncate">{folder.name}</span>
                </button>
                {canManageFolders && (
                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => { setRenameTarget(folder); setRenameName(folder.name) }}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
                      title={t('files.gate.renameFolder')}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder)}
                      className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                      title={t('files.gate.deleteFolder')}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right pane — file list */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
            <span className="truncate text-xs font-medium text-gray-500">
              {selectedFolder ? selectedFolder.name : t('files.gate.allFiles', { defaultValue: 'All files' })}
              <span className="ml-1.5 text-gray-400">({visibleFiles.length})</span>
            </span>
            <div className="flex items-center gap-1">
              {loading && <SpinnerIcon />}
              <button
                onClick={() => refresh()}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
                title={t('buttons.refresh', { ns: 'common' })}
                disabled={loading}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibleFiles.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <FolderIcon />
                <p className="mt-2 text-xs text-gray-400">{t('files.gate.noFilesInCategory')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {visibleFiles.map((f) => (
                  <GateFileRow
                    key={f.id}
                    file={f}
                    onDownload={handleDownload}
                    onDelete={(file) => setDeleteFileTarget(file)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upload bar */}
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/40">
            <Btn onClick={handleUpload} variant="primary" size="sm">
              <UploadIcon />
              {selectedFolder
                ? t('files.gate.uploadToFolder', { name: selectedFolder.name, defaultValue: `Upload to ${selectedFolder.name}` })
                : t('files.gate.upload')}
            </Btn>
          </div>
        </div>
      </div>

      {/* Confirm delete file modal */}
      {deleteFileTarget && (
        <Modal
          title={t('files.gate.confirmDelete', { name: deleteFileTarget.name })}
          onClose={() => setDeleteFileTarget(null)}
          footer={
            <>
              <Btn onClick={() => setDeleteFileTarget(null)} variant="default">{t('buttons.cancel', { ns: 'common' })}</Btn>
              <Btn onClick={() => handleDelete(deleteFileTarget)} variant="danger">{t('buttons.delete', { ns: 'common' })}</Btn>
            </>
          }
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('files.gate.deleteWarning')}</p>
        </Modal>
      )}

      {/* Create folder modal (BGM only) */}
      {showCreateFolder && (
        <Modal
          title={t('files.gate.createFolder')}
          onClose={() => setShowCreateFolder(false)}
          footer={
            <>
              <Btn onClick={() => setShowCreateFolder(false)} variant="default">{t('buttons.cancel', { ns: 'common' })}</Btn>
              <Btn onClick={handleCreateFolder} variant="primary" disabled={!newFolderName}>{t('buttons.create', { ns: 'common' })}</Btn>
            </>
          }
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('files.gate.folderName')}</label>
            <TextInput value={newFolderName} onChange={setNewFolderName} placeholder={t('files.gate.folderName')} />
          </div>
        </Modal>
      )}

      {/* Rename folder modal (BGM only) */}
      {renameTarget && (
        <Modal
          title={t('files.gate.renameFolder')}
          onClose={() => setRenameTarget(null)}
          footer={
            <>
              <Btn onClick={() => setRenameTarget(null)} variant="default">{t('buttons.cancel', { ns: 'common' })}</Btn>
              <Btn onClick={handleRenameFolder} variant="primary" disabled={!renameName || renameName === renameTarget.name}>
                {t('buttons.save', { ns: 'common' })}
              </Btn>
            </>
          }
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('files.gate.newFolderName')}</label>
            <TextInput value={renameName} onChange={setRenameName} placeholder={t('files.gate.newFolderName')} />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Icons for new tabs ───────────────────────────────────────────────────────

const PlayIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const SceneIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const ScheduleIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

// ─── Gate Channel Players tab ─────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function DaysDisplay({ days }: { days: number[] }) {
  return (
    <div className="flex gap-0.5">
      {DAY_LABELS.map((d, i) => (
        <span key={d} className={`inline-flex h-5 w-6 items-center justify-center rounded text-xs font-medium ${
          days.includes(i)
            ? 'bg-primary/15 text-primary dark:bg-primary/25'
            : 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600'
        }`}>{d}</span>
      ))}
    </div>
  )
}

function DaysCheckboxes({ days, onChange }: { days: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAY_LABELS.map((label, i) => (
        <label key={label} className="flex cursor-pointer items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={days.includes(i)}
            onChange={(e) => {
              if (e.target.checked) onChange([...days, i].sort())
              else onChange(days.filter((d) => d !== i))
            }}
            className="h-3.5 w-3.5 rounded border-gray-300 accent-primary"
          />
          {label}
        </label>
      ))}
    </div>
  )
}

type ChannelSourceType = 'folder' | 'file' | 'url'

function ChannelPlayersTab({
  gateMac, deviceIp, gateWebConfig,
}: {
  gateMac: string; deviceIp: string; gateWebConfig: AipGateWebConfig | undefined
}) {
  const { t } = useTranslation('webserver')
  const { gateChannelPlayers, setGateChannelPlayers, gateFiles, setGateFiles, gateFolders, setGateFolders } = useWebserverStore()
  const [loading, setLoading] = useState(false)
  const [showActivate, setShowActivate] = useState(false)
  const [activateName, setActivateName] = useState('')
  const [sourceType, setSourceType] = useState<ChannelSourceType>('folder')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [selectedFileId, setSelectedFileId] = useState('')
  const [urlValue, setUrlValue] = useState('')

  const authEnabled = gateWebConfig?.authEnabled ?? false
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const buildConfig = useCallback((): AipGateConnectionConfig => ({
    ip: deviceIp, sslEnabled: gateWebConfig?.sslEnabled ?? false,
    username: authEnabled ? username : undefined,
    password: authEnabled ? password : undefined,
  }), [deviceIp, gateWebConfig, authEnabled, username, password])

  const players  = gateChannelPlayers.get(gateMac) ?? []
  const files    = gateFiles.get(gateMac) ?? []
  const folders  = gateFolders.get(gateMac) ?? []

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await window.electronAPI.aip.gateFetchChannelPlayers(gateMac, buildConfig())
      const list = await window.electronAPI.aip.gateGetChannelPlayers(gateMac)
      setGateChannelPlayers(gateMac, list)
    } finally { setLoading(false) }
  }, [gateMac, buildConfig, setGateChannelPlayers])

  const loadSources = useCallback(async () => {
    const [fileList, folderList] = await Promise.all([
      window.electronAPI.aip.gateGetFiles(gateMac),
      window.electronAPI.aip.gateGetFolders(gateMac),
    ])
    setGateFiles(gateMac, fileList)
    setGateFolders(gateMac, folderList)
  }, [gateMac, setGateFiles, setGateFolders])

  useEffect(() => { void refresh() }, [gateMac])

  useEffect(() => {
    return window.electronAPI.aip.onGateChannelPlayersUpdated((ev) => {
      if (ev.mac === gateMac) setGateChannelPlayers(gateMac, ev.players)
    })
  }, [gateMac, setGateChannelPlayers])

  const openActivate = () => {
    setActivateName(''); setSourceType('folder'); setSelectedFolderId(''); setSelectedFileId(''); setUrlValue('')
    void loadSources()
    setShowActivate(true)
  }

  const computedSource = (): string => {
    if (sourceType === 'url') return urlValue
    if (sourceType === 'folder') {
      const f = folders.find((f) => f.id === selectedFolderId)
      return f ? `/${f.category}/${f.name}` : ''
    }
    const f = files.find((f) => f.id === selectedFileId)
    if (!f) return ''
    return f.folder ? `/${f.category}/${f.folder}/${f.name}` : `/${f.category}/${f.name}`
  }

  const handleActivate = async () => {
    const source = computedSource()
    if (!activateName || !source) return
    await window.electronAPI.aip.gateActivateChannelPlayer(gateMac, buildConfig(), activateName, source)
    setShowActivate(false)
    await refresh()
  }

  const handleDeactivate = async (playerId: string) => {
    await window.electronAPI.aip.gateDeactivateChannelPlayer(gateMac, buildConfig(), playerId)
    await refresh()
  }

  const stateColor = (s: string): 'green' | 'yellow' | 'gray' =>
    s === 'Playing' ? 'green' : s === 'Paused' ? 'yellow' : 'gray'

  const selectCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

  const groupedFiles = files.reduce<Record<string, typeof files>>((acc, f) => {
    const key = f.folder ? `${f.category} / ${f.folder}` : String(f.category)
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  const groupedFolders = folders.reduce<Record<string, typeof folders>>((acc, f) => {
    const key = String(f.category)
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {})

  const sourceIsValid = sourceType === 'url' ? !!urlValue : sourceType === 'folder' ? !!selectedFolderId : !!selectedFileId

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      {authEnabled && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('files.gate.username')}</label>
            <TextInput value={username} onChange={setUsername} placeholder={t('files.gate.username')} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('files.gate.password')}</label>
            <TextInput value={password} onChange={setPassword} type="password" placeholder={t('files.gate.password')} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('channelPlayers.count', { count: players.length })}
        </span>
        <div className="flex gap-2">
          {loading && <SpinnerIcon />}
          <Btn onClick={refresh} variant="default">{t('buttons.refresh', { ns: 'common' })}</Btn>
          <Btn onClick={openActivate} variant="primary"><PlusIcon />{t('channelPlayers.activate')}</Btn>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('channelPlayers.columns.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('channelPlayers.columns.source')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('channelPlayers.columns.state')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {players.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">{t('channelPlayers.empty')}</td></tr>
            )}
            {players.map((p) => (
              <tr key={p.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-500 font-mono">{p.source}</td>
                <td className="px-4 py-3"><Badge color={stateColor(p.playbackState)}>{p.playbackState}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <Btn onClick={() => handleDeactivate(p.id)} variant="danger" size="xs">
                    <TrashIcon />{t('channelPlayers.deactivate')}
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showActivate && (
        <Modal title={t('channelPlayers.activate')} onClose={() => setShowActivate(false)}
          footer={<>
            <Btn onClick={() => setShowActivate(false)} variant="default">{t('buttons.cancel', { ns: 'common' })}</Btn>
            <Btn onClick={handleActivate} variant="primary" disabled={!activateName || !sourceIsValid}>{t('buttons.save', { ns: 'common' })}</Btn>
          </>}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('channelPlayers.form.name')}</label>
              <TextInput value={activateName} onChange={setActivateName} placeholder={t('channelPlayers.form.namePlaceholder')} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('channelPlayers.form.source')}</label>
              <div className="mb-2 flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                {(['folder', 'file', 'url'] as ChannelSourceType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSourceType(type)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                      sourceType === type
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {type === 'folder' ? t('files.gate.folder') : type === 'file' ? 'File' : 'Online'}
                  </button>
                ))}
              </div>

              {sourceType === 'folder' && (
                folders.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 py-3 text-center text-xs text-gray-400 dark:border-gray-700">
                    {t('files.gate.noFolders')} — visit the Files tab to load them.
                  </p>
                ) : (
                  <select value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)} className={selectCls}>
                    <option value="">— Select a folder —</option>
                    {Object.entries(groupedFolders).map(([cat, flds]) => (
                      <optgroup key={cat} label={cat}>
                        {flds.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )
              )}

              {sourceType === 'file' && (
                files.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 py-3 text-center text-xs text-gray-400 dark:border-gray-700">
                    {t('files.gate.noFilesInCategory')} — visit the Files tab to load them.
                  </p>
                ) : (
                  <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className={selectCls}>
                    <option value="">— Select a file —</option>
                    {Object.entries(groupedFiles).map(([grp, fls]) => (
                      <optgroup key={grp} label={grp}>
                        {fls.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )
              )}

              {sourceType === 'url' && (
                <TextInput value={urlValue} onChange={setUrlValue} placeholder="http://stream.example.com/radio" />
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Gate Scenes tab ──────────────────────────────────────────────────────────

type GateActionType = 'changeVolume' | 'joinEmitterChannel' | 'joinLocalChannel' | 'leaveChannel'

interface GateStep {
  id:        string
  type:      GateActionType
  devices:   string[]
  volume:    number
  emitter:   string
  channelId: string
}

const GATE_ACTION_TYPES: GateActionType[] = ['changeVolume', 'joinEmitterChannel', 'joinLocalChannel', 'leaveChannel']

const GATE_ACTION_COLORS: Record<GateActionType, string> = {
  changeVolume:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  joinEmitterChannel: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  joinLocalChannel:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  leaveChannel:       'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
}

function actionsToSteps(actions: AipGateSceneActions): GateStep[] {
  const steps: GateStep[] = []
  for (const e of actions.changeVolume ?? []) {
    steps.push({ id: `cv-${Math.random()}`, type: 'changeVolume', devices: e.devices, volume: e.volume, emitter: '', channelId: '' })
  }
  for (const e of actions.joinEmitterChannel ?? []) {
    steps.push({ id: `jec-${Math.random()}`, type: 'joinEmitterChannel', devices: e.devices, volume: 0, emitter: e.emitter, channelId: '' })
  }
  for (const e of actions.joinLocalChannel ?? []) {
    steps.push({ id: `jlc-${Math.random()}`, type: 'joinLocalChannel', devices: e.devices, volume: 0, emitter: '', channelId: e.channelId })
  }
  for (const e of actions.leaveChannel ?? []) {
    steps.push({ id: `lc-${Math.random()}`, type: 'leaveChannel', devices: e.devices, volume: 0, emitter: '', channelId: '' })
  }
  return steps
}

function stepsToActions(steps: GateStep[]): AipGateSceneActions {
  return {
    changeVolume:       steps.filter((s) => s.type === 'changeVolume').map((s) => ({ devices: s.devices, volume: s.volume })),
    joinEmitterChannel: steps.filter((s) => s.type === 'joinEmitterChannel').map((s) => ({ devices: s.devices, emitter: s.emitter })),
    joinLocalChannel:   steps.filter((s) => s.type === 'joinLocalChannel').map((s) => ({ channelId: s.channelId, devices: s.devices })),
    leaveChannel:       steps.filter((s) => s.type === 'leaveChannel').map((s) => ({ devices: s.devices })),
  }
}

function newStep(): GateStep {
  return { id: `step-${Date.now()}-${Math.random()}`, type: 'changeVolume', devices: [], volume: 80, emitter: '', channelId: '' }
}

interface GateStepRowProps {
  step: GateStep
  allDevices: Array<{ mac: string; name: string }>
  onChange: (s: GateStep) => void
  onRemove: () => void
}

function GateStepRow({ step, allDevices, onChange, onRemove }: GateStepRowProps) {
  const field = (cls = '') =>
    `rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${cls}`

  const toggleDevice = (mac: string, on: boolean) => {
    const next = on ? [...step.devices, mac] : step.devices.filter((m) => m !== mac)
    onChange({ ...step, devices: next })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center gap-2">
        <select
          value={step.type}
          onChange={(e) => onChange({ ...step, type: e.target.value as GateActionType })}
          className={field('min-w-[160px]')}
        >
          {GATE_ACTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {step.type === 'changeVolume' && (
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={0} max={100}
              value={step.volume}
              onChange={(e) => onChange({ ...step, volume: parseInt(e.target.value) })}
              className="w-28 accent-primary"
            />
            <span className="w-7 text-xs text-gray-500">{step.volume}%</span>
          </div>
        )}

        {step.type === 'joinEmitterChannel' && (
          <input
            type="text"
            value={step.emitter}
            onChange={(e) => onChange({ ...step, emitter: e.target.value })}
            placeholder="Emitter MAC"
            className={field('flex-1 min-w-[140px] font-mono')}
          />
        )}

        {step.type === 'joinLocalChannel' && (
          <input
            type="text"
            value={step.channelId}
            onChange={(e) => onChange({ ...step, channelId: e.target.value })}
            placeholder="Channel ID"
            className={field('w-28')}
          />
        )}

        <button
          onClick={onRemove}
          className="ml-auto rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {allDevices.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {allDevices.map((d) => (
            <label key={d.mac} className="flex cursor-pointer items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={step.devices.includes(d.mac)}
                onChange={(e) => toggleDevice(d.mac, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 accent-primary"
              />
              {d.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

interface GateSceneModalProps {
  scene: AipGateRemoteScene | null
  allDevices: Array<{ mac: string; name: string }>
  onSave: (payload: { name: string; startAt: string; dateRange: { from: string; to: string }; daysOfWeek: number[]; actions: AipGateSceneActions }) => void
  onDelete?: () => void
  onClose: () => void
  saving?: boolean
}

function GateSceneModal({ scene, allDevices, onSave, onDelete, onClose, saving }: GateSceneModalProps) {
  const isNew = !scene?.id
  const [name, setName] = useState(scene?.name ?? '')
  const [startAt, setStartAt] = useState(scene?.startAt ?? '08:00:00')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(scene?.daysOfWeek ? [...scene.daysOfWeek] : [1, 2, 3, 4, 5])
  const [steps, setSteps] = useState<GateStep[]>(scene ? actionsToSteps(scene.actions) : [])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const addStep = () => setSteps((prev) => [...prev, newStep()])
  const updateStep = (idx: number, s: GateStep) => setSteps((prev) => { const n = [...prev]; n[idx] = s; return n })
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx))

  const handleSave = () => {
    onSave({ name, startAt, dateRange: { from: '', to: '' }, daysOfWeek, actions: stepsToActions(steps) })
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
  const labelCls = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-base font-semibold">{isNew ? 'New scene' : 'Edit scene'}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning routine" className={inputCls} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Timing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start time</label>
                <input type="text" value={startAt} onChange={(e) => setStartAt(e.target.value)} placeholder="HH:MM:SS" className={inputCls} />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Days</label>
              <DaysCheckboxes days={daysOfWeek} onChange={setDaysOfWeek} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Actions</p>
              <button
                onClick={addStep}
                className="flex items-center gap-1 rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add action
              </button>
            </div>
            {steps.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
                No actions. Click "Add action" to begin.
              </p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <GateStepRow
                    key={step.id}
                    step={step}
                    allDevices={allDevices}
                    onChange={(s) => updateStep(idx, s)}
                    onRemove={() => removeStep(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          <div>
            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Delete "{name}"?</span>
                  <button onClick={onDelete} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Delete</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Delete</button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={!name.trim() || saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScenesTab({
  gateMac, deviceIp, gateWebConfig,
}: {
  gateMac: string; deviceIp: string; gateWebConfig: AipGateWebConfig | undefined
}) {
  const { t } = useTranslation('webserver')
  const { gateScenes, setGateScenes } = useWebserverStore()
  const deviceEntries = useDevicesStore((s) => s.entries)
  const allDevices = Array.from(deviceEntries.values()).map((e) => ({ mac: e.device.mac, name: e.device.name }))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalScene, setModalScene] = useState<AipGateRemoteScene | null | undefined>(undefined)
  const authEnabled = gateWebConfig?.authEnabled ?? false
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const buildConfig = useCallback((): AipGateConnectionConfig => ({
    ip: deviceIp, sslEnabled: gateWebConfig?.sslEnabled ?? false,
    username: authEnabled ? username : undefined,
    password: authEnabled ? password : undefined,
  }), [deviceIp, gateWebConfig, authEnabled, username, password])

  const scenes = gateScenes.get(gateMac) ?? []

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await window.electronAPI.aip.gateFetchScenes(gateMac, buildConfig())
      const list = await window.electronAPI.aip.gateGetScenes(gateMac)
      setGateScenes(gateMac, list)
    } finally { setLoading(false) }
  }, [gateMac, buildConfig, setGateScenes])

  useEffect(() => { void refresh() }, [gateMac])

  useEffect(() => {
    return window.electronAPI.aip.onGateScenesUpdated((ev) => {
      if (ev.mac === gateMac) setGateScenes(gateMac, ev.scenes)
    })
  }, [gateMac, setGateScenes])

  const handleSave = async (payload: { name: string; startAt: string; dateRange: { from: string; to: string }; daysOfWeek: number[]; actions: AipGateSceneActions }) => {
    setSaving(true)
    try {
      if (modalScene?.id) await window.electronAPI.aip.gateUpdateScene(gateMac, buildConfig(), modalScene.id, payload)
      else                await window.electronAPI.aip.gateCreateScene(gateMac, buildConfig(), payload)
      setModalScene(undefined)
      await refresh()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!modalScene?.id) return
    await window.electronAPI.aip.gateDeleteScene(gateMac, buildConfig(), modalScene.id)
    setModalScene(undefined)
    await refresh()
  }

  const countActionTypes = (sc: AipGateRemoteScene): Record<string, number> => {
    const counts: Record<string, number> = {}
    for (const type of GATE_ACTION_TYPES) {
      const arr = (sc.actions as unknown as Record<string, unknown[]>)[type]
      if (arr?.length) counts[type] = arr.length
    }
    return counts
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {authEnabled && (
        <div className="flex gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('files.gate.username')}</label>
            <TextInput value={username} onChange={setUsername} placeholder={t('files.gate.username')} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('files.gate.password')}</label>
            <TextInput value={password} onChange={setPassword} type="password" placeholder={t('files.gate.password')} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('scenes.count', { count: scenes.length })}
        </span>
        <div className="flex gap-2">
          {loading && <SpinnerIcon />}
          <Btn onClick={refresh} variant="default">{t('buttons.refresh', { ns: 'common' })}</Btn>
          <Btn onClick={() => setModalScene(null)} variant="primary"><PlusIcon />{t('scenes.create')}</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {!loading && scenes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SceneIcon />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">{t('scenes.empty')}</p>
          </div>
        )}

        {scenes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scenes.map((sc) => {
              const actionCounts = countActionTypes(sc)
              return (
                <div
                  key={sc.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{sc.name}</p>
                      <p className="mt-0.5 tabular-nums text-xs text-gray-400">{sc.startAt}</p>
                    </div>
                    <button
                      onClick={() => setModalScene(sc)}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    >
                      <EditIcon />
                    </button>
                  </div>

                  <div className="mb-3">
                    <DaysDisplay days={sc.daysOfWeek} />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {Object.entries(actionCounts).map(([type, count]) => (
                      <span
                        key={type}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${GATE_ACTION_COLORS[type as GateActionType] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {type} ({count})
                      </span>
                    ))}
                    {Object.keys(actionCounts).length === 0 && (
                      <span className="text-xs text-gray-400">No actions</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalScene !== undefined && (
        <GateSceneModal
          scene={modalScene}
          allDevices={allDevices}
          onSave={handleSave}
          onDelete={modalScene?.id ? handleDelete : undefined}
          onClose={() => setModalScene(undefined)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Mini file explorer (used in Schedule modal) ─────────────────────────────

interface MiniFileExplorerProps {
  files:      AipGateRemoteFile[]
  folders:    AipGateRemoteFolder[]
  selectedId: string
  loading:    boolean
  onSelect:   (fileId: string) => void
}

function fmtDuration(sec: number): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

function MiniFileExplorer({ files, folders, selectedId, loading, onSelect }: MiniFileExplorerProps) {
  const [activeFolder, setActiveFolder] = useState<string | null>(null)

  const visibleFiles = activeFolder === null
    ? files
    : files.filter((f) => f.folder === activeFolder)

  const selectedFile = files.find((f) => f.id === selectedId)

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700">
        <SpinnerIcon />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
        No message files loaded. Open the <strong>Files → Messages</strong> tab first to load them.
      </p>
    )
  }

  const folderBtnCls = (active: boolean) =>
    `flex w-full items-center gap-1 px-2 py-1.5 text-left text-xs truncate transition-colors ${
      active
        ? 'bg-primary/10 font-medium text-primary dark:bg-primary/20'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
    }`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-48 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        {folders.length > 0 && (
          <div className="w-36 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
            <button onClick={() => setActiveFolder(null)} className={folderBtnCls(activeFolder === null)}>
              <FolderIcon /> All files
            </button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => setActiveFolder(f.name)} className={folderBtnCls(activeFolder === f.name)}>
                <FolderIcon /> {f.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {visibleFiles.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-gray-400">No files in this folder</p>
          ) : (
            visibleFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelect(f.id)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedId === f.id ? 'bg-primary/10 dark:bg-primary/20' : ''
                }`}
              >
                <span className="truncate text-xs text-gray-800 dark:text-gray-200">{f.name}</span>
                {f.duration > 0 && (
                  <span className="ml-2 shrink-0 text-[10px] tabular-nums text-gray-400">{fmtDuration(f.duration)}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {selectedFile ? (
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs dark:border-primary/30 dark:bg-primary/10">
          <svg className="h-3.5 w-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
          <span className="truncate font-medium text-gray-800 dark:text-gray-200">{selectedFile.name}</span>
          {selectedFile.folder && <span className="text-gray-400">· {selectedFile.folder}</span>}
          {selectedFile.duration > 0 && (
            <span className="ml-auto shrink-0 text-gray-500">{fmtDuration(selectedFile.duration)}</span>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Select a file above</p>
      )}
    </div>
  )
}

// ─── Gate Schedules tab ───────────────────────────────────────────────────────

const EMPTY_SCHEDULE_FORM = () => ({
  name: '', fileId: '', startAt: '08:00:00', repeatEach: '00:00:00', repeatUntil: '08:01:00',
  daysOfWeek: [1, 2, 3, 4, 5] as number[],
  dateFrom: '', dateTo: '', specialVolume: -1, durationLimit: '00:00:00',
})

type ScheduleForm = ReturnType<typeof EMPTY_SCHEDULE_FORM>

interface GateScheduleModalProps {
  form:     ScheduleForm
  onChange: (f: ScheduleForm) => void
  files:    AipGateRemoteFile[]
  folders:  AipGateRemoteFolder[]
  isNew:    boolean
  saving:   boolean
  onSave:   () => void
  onDelete?: () => void
  onClose:  () => void
}

function GateScheduleModal({ form, onChange, files, folders, isNew, saving, onSave, onDelete, onClose }: GateScheduleModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const set = (patch: Partial<ScheduleForm>) => onChange({ ...form, ...patch })

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
  const labelCls = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-base font-semibold">{isNew ? 'New schedule' : 'Edit schedule'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Morning announcement" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Message file</label>
            <MiniFileExplorer
              files={files}
              folders={folders}
              selectedId={form.fileId}
              loading={false}
              onSelect={(id) => set({ fileId: id })}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Timing</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Start time</label>
                <input type="text" value={form.startAt} onChange={(e) => set({ startAt: e.target.value })} placeholder="HH:MM:SS" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Repeat each</label>
                <input type="text" value={form.repeatEach} onChange={(e) => set({ repeatEach: e.target.value })} placeholder="HH:MM:SS" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Repeat until</label>
                <input type="text" value={form.repeatUntil} onChange={(e) => set({ repeatUntil: e.target.value })} placeholder="HH:MM:SS" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Duration limit</label>
                <input type="text" value={form.durationLimit} onChange={(e) => set({ durationLimit: e.target.value })} placeholder="HH:MM:SS" className={inputCls} />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Days</label>
              <DaysCheckboxes days={form.daysOfWeek} onChange={(d) => set({ daysOfWeek: d })} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Special volume (−1 = default)</label>
            <input
              type="number"
              min={-1} max={100}
              value={form.specialVolume}
              onChange={(e) => set({ specialVolume: parseInt(e.target.value) || -1 })}
              className={`${inputCls} w-32`}
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
          <div>
            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Delete "{form.name}"?</span>
                  <button onClick={onDelete} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Delete</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">Delete</button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Cancel</button>
            <button onClick={onSave} disabled={!form.name.trim() || !form.fileId || !form.startAt || saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SchedulesTab({
  gateMac, deviceIp, gateWebConfig,
}: {
  gateMac: string; deviceIp: string; gateWebConfig: AipGateWebConfig | undefined
}) {
  const { t } = useTranslation('webserver')
  const { gateSchedules, setGateSchedules, gateFiles, setGateFiles, gateFolders, setGateFolders } = useWebserverStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_SCHEDULE_FORM())
  const [editId, setEditId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const authEnabled = gateWebConfig?.authEnabled ?? false
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const buildConfig = useCallback((): AipGateConnectionConfig => ({
    ip: deviceIp, sslEnabled: gateWebConfig?.sslEnabled ?? false,
    username: authEnabled ? username : undefined,
    password: authEnabled ? password : undefined,
  }), [deviceIp, gateWebConfig, authEnabled, username, password])

  const schedules   = gateSchedules.get(gateMac) ?? []
  const msgFiles    = (gateFiles.get(gateMac) ?? []).filter((f) => f.category === 'messages')
  const msgFolders  = (gateFolders.get(gateMac) ?? []).filter((f) => f.category === 'messages')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await window.electronAPI.aip.gateFetchSchedules(gateMac, buildConfig())
      const list = await window.electronAPI.aip.gateGetSchedules(gateMac)
      setGateSchedules(gateMac, list)
    } finally { setLoading(false) }
  }, [gateMac, buildConfig, setGateSchedules])

  useEffect(() => { void refresh() }, [gateMac])

  useEffect(() => {
    return window.electronAPI.aip.onGateSchedulesUpdated((ev) => {
      if (ev.mac === gateMac) setGateSchedules(gateMac, ev.schedules)
    })
  }, [gateMac, setGateSchedules])

  // Auto-load message files via push events (same path as FilesTab)
  useEffect(() => {
    const u1 = window.electronAPI.aip.onGateFilesUpdated((ev: AipGateFilesUpdatedEvent) => {
      if (ev.mac === gateMac) setGateFiles(gateMac, ev.files)
    })
    const u2 = window.electronAPI.aip.onGateFoldersUpdated((ev: AipGateFoldersUpdatedEvent) => {
      if (ev.mac === gateMac) setGateFolders(gateMac, ev.folders)
    })
    void (async () => {
      try {
        const cfg = buildConfig()
        await window.electronAPI.aip.gateFetchFiles(gateMac, cfg)
        await window.electronAPI.aip.gateFetchFolders(gateMac, cfg)
      } catch { /* silent — store keeps whatever is already there */ }
    })()
    return () => { u1(); u2() }
  }, [gateMac])

  const openCreate = () => {
    setForm(EMPTY_SCHEDULE_FORM()); setEditId(null); setShowModal(true)
  }
  const openEdit = (sch: AipGateRemoteSchedule) => {
    setForm({
      name: sch.name, fileId: sch.fileId, startAt: sch.startAt,
      repeatEach: sch.repeatEach, repeatUntil: sch.repeatUntil,
      daysOfWeek: [...sch.daysOfWeek], dateFrom: sch.dateFrom, dateTo: sch.dateTo,
      specialVolume: sch.specialVolume, durationLimit: sch.durationLimit,
    })
    setEditId(sch.id); setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name, fileId: form.fileId, startAt: form.startAt,
        repeatEach: form.repeatEach, repeatUntil: form.repeatUntil,
        daysOfWeek: form.daysOfWeek,
        dateRange: { from: form.dateFrom, to: form.dateTo },
        specialVolume: form.specialVolume, durationLimit: form.durationLimit,
      }
      if (editId) await window.electronAPI.aip.gateUpdateSchedule(gateMac, buildConfig(), editId, payload)
      else         await window.electronAPI.aip.gateCreateSchedule(gateMac, buildConfig(), payload)
      setShowModal(false)
      await refresh()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editId) return
    await window.electronAPI.aip.gateDeleteSchedule(gateMac, buildConfig(), editId)
    setShowModal(false)
    await refresh()
  }

  const handleCancel = async (id: string) => {
    await window.electronAPI.aip.gateCancelSchedule(gateMac, buildConfig(), id)
    await refresh()
  }

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      {authEnabled && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('files.gate.username')}</label>
            <TextInput value={username} onChange={setUsername} placeholder={t('files.gate.username')} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('files.gate.password')}</label>
            <TextInput value={password} onChange={setPassword} type="password" placeholder={t('files.gate.password')} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('schedules.count', { count: schedules.length })}
        </span>
        <div className="flex gap-2">
          {loading && <SpinnerIcon />}
          <Btn onClick={refresh} variant="default">{t('buttons.refresh', { ns: 'common' })}</Btn>
          <Btn onClick={openCreate} variant="primary"><PlusIcon />{t('schedules.create')}</Btn>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('schedules.columns.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('schedules.columns.startAt')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('schedules.columns.days')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {schedules.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">{t('schedules.empty')}</td></tr>
            )}
            {schedules.map((sch) => (
              <tr key={sch.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{sch.name}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-gray-500">{sch.startAt}</td>
                <td className="px-4 py-3"><DaysDisplay days={sch.daysOfWeek} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Btn onClick={() => openEdit(sch)} variant="default" size="xs"><EditIcon /></Btn>
                    <Btn onClick={() => handleCancel(sch.id)} variant="ghost" size="xs" title={t('schedules.cancel')}>
                      <XIcon />
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <GateScheduleModal
          form={form}
          onChange={setForm}
          files={msgFiles}
          folders={msgFolders}
          isNew={!editId}
          saving={saving}
          onSave={handleSave}
          onDelete={editId ? handleDelete : undefined}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────


const TABS: { key: WebserverTab; tKey: string; Icon: React.FC }[] = [
  { key: 'sip-extensions',  tKey: 'tabs.extensions',    Icon: PhoneIcon    },
  { key: 'sip-conferences', tKey: 'tabs.conferences',    Icon: UsersIcon    },
  { key: 'files',           tKey: 'tabs.files',          Icon: FolderIcon   },
  { key: 'channel-players', tKey: 'tabs.channelPlayers', Icon: PlayIcon     },
  { key: 'scenes',          tKey: 'tabs.scenes',         Icon: SceneIcon    },
  { key: 'schedules',       tKey: 'tabs.schedules',      Icon: ScheduleIcon },
]

export default function Webserver() {
  const { t } = useTranslation('webserver')
  const selectedMac   = useDevicesStore((s) => s.selectedMac)
  const entries       = useDevicesStore((s) => s.entries)
  const { activeTab, setActiveTab, setSipExtensions, setSipConferences, gateWebConfigs } = useWebserverStore()

  const selectedEntry  = selectedMac ? entries.get(selectedMac) : undefined
  const selectedDevice = selectedEntry?.device ?? null
  const isWebserver    = selectedDevice ? isWebserverDevice(selectedDevice.device_type) : false

  const gateWebConfig = selectedDevice ? gateWebConfigs.get(selectedDevice.mac) : undefined

  useEffect(() => {
    if (!selectedDevice || !isWebserver) return
    const mac = selectedDevice.mac
    window.electronAPI.aip.getSipExtensions()
      .then(setSipExtensions)
      .catch(console.error)
    window.electronAPI.aip.getSipConferencesForDevice(mac)
      .then(setSipConferences)
      .catch(console.error)
    window.electronAPI.aip.getGateWebConfigs()
      .then((configs) => {
        const cfg = configs.find((c) => c.mac === mac)
        if (cfg) {
          const store = useWebserverStore.getState()
          store.setGateWebConfig(cfg)
        }
      })
      .catch(console.error)
  }, [selectedDevice?.mac])

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

  const typeLabel = getModelName(selectedDevice.device_type, selectedDevice.device_sub_type)

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
        {activeTab === 'files'           && (
          <FilesTab
            gateMac={selectedDevice.mac}
            deviceIp={selectedDevice.network.ip}
            deviceName={selectedDevice.name}
            gateWebConfig={gateWebConfig}
          />
        )}
        {activeTab === 'channel-players' && (
          <ChannelPlayersTab
            gateMac={selectedDevice.mac}
            deviceIp={selectedDevice.network.ip}
            gateWebConfig={gateWebConfig}
          />
        )}
        {activeTab === 'scenes' && (
          <ScenesTab
            gateMac={selectedDevice.mac}
            deviceIp={selectedDevice.network.ip}
            gateWebConfig={gateWebConfig}
          />
        )}
        {activeTab === 'schedules' && (
          <SchedulesTab
            gateMac={selectedDevice.mac}
            deviceIp={selectedDevice.network.ip}
            gateWebConfig={gateWebConfig}
          />
        )}
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
