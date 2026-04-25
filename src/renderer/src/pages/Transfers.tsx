/**
 * Transfers — session-wide log of all Gate file transfer operations.
 */

import { useTranslation } from 'react-i18next'
import { useTransfersStore, type TransferRecord, type TransferKind } from '../store/transfers.store'

// ─── Icons ────────────────────────────────────────────────────────────────────

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

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const FolderPlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
)

const FolderMinusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 13h6M3 7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
)

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const TransferBigIcon = () => (
  <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

// ─── Kind icon + label ────────────────────────────────────────────────────────

const KIND_ICON: Record<TransferKind, React.FC> = {
  'gate-upload':        UploadIcon,
  'gate-download':      DownloadIcon,
  'gate-delete':        TrashIcon,
  'gate-folder-create': FolderPlusIcon,
  'gate-folder-delete': FolderMinusIcon,
  'gate-folder-rename': EditIcon,
  'ftp-upload':         UploadIcon,
  'ftp-download':       DownloadIcon,
}

const KIND_COLOR: Record<TransferKind, string> = {
  'gate-upload':        'text-blue-500',
  'gate-download':      'text-green-500',
  'gate-delete':        'text-red-500',
  'gate-folder-create': 'text-purple-500',
  'gate-folder-delete': 'text-red-400',
  'gate-folder-rename': 'text-orange-500',
  'ftp-upload':         'text-blue-500',
  'ftp-download':       'text-green-500',
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransferRecord['status'] }) {
  const { t } = useTranslation('transfers')
  const styles: Record<TransferRecord['status'], string> = {
    waiting:   'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    pending:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    done:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    error:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    cancelled: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-500',
  }
  const icons: Record<TransferRecord['status'], React.ReactNode> = {
    waiting:   <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />,
    pending:   <SpinnerIcon />,
    done:      <CheckIcon />,
    error:     <XIcon />,
    cancelled: <XIcon />,
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {t(`status.${status}`)}
    </span>
  )
}

// ─── Record row ───────────────────────────────────────────────────────────────

function RecordRow({ record }: { record: TransferRecord }) {
  const { t } = useTranslation('transfers')
  const KindIcon = KIND_ICON[record.kind]
  const time = new Date(record.startedAt).toLocaleTimeString()

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
      <div className={`mt-0.5 shrink-0 ${KIND_COLOR[record.kind]}`}>
        <KindIcon />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{record.label}</span>
          <StatusBadge status={record.status} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
          <span>{record.deviceName}</span>
          {record.category && (
            <>
              <span>·</span>
              <span className="capitalize">{record.category}</span>
            </>
          )}
          <span>·</span>
          <span>{t(`kind.${record.kind}`)}</span>
          <span>·</span>
          <span>{time}</span>
        </div>
        {record.error && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">{record.error}</p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Transfers() {
  const { t } = useTranslation('transfers')
  const { records, clearCompleted, clearAll } = useTransfersStore()

  const pendingCount = records.filter((r) => r.status === 'pending' || r.status === 'waiting').length

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-400">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {records.some((r) => r.status !== 'pending') && (
              <button
                onClick={clearCompleted}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('clearCompleted')}
              </button>
            )}
            {records.length > 0 && (
              <button
                onClick={clearAll}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
              >
                {t('clearAll')}
              </button>
            )}
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <SpinnerIcon />
            <span>{t('inProgress', { count: pendingCount })}</span>
          </div>
        )}
      </div>

      {/* Record list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {records.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <TransferBigIcon />
            <div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{t('empty')}</p>
              <p className="mt-1 text-sm text-gray-400">{t('emptyHelp')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <RecordRow key={r.id} record={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
