import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/app.store'
import { api } from '../api/client'

interface PingResponse {
  message: string
}

type CardColor = 'blue' | 'green' | 'purple' | 'amber' | 'gray'

const CARD_COLORS: Record<CardColor, string> = {
  blue:   'bg-blue-50   border-blue-200   text-blue-800   dark:bg-blue-900/20  dark:border-blue-800  dark:text-blue-300',
  green:  'bg-green-50  border-green-200  text-green-800  dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
  purple: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
  amber:  'bg-amber-50  border-amber-200  text-amber-800  dark:bg-amber-900/20  dark:border-amber-800  dark:text-amber-300',
  gray:   'bg-gray-50   border-gray-200   text-gray-800   dark:bg-gray-800     dark:border-gray-700  dark:text-gray-300',
}

function StatCard({
  title,
  value,
  color = 'blue',
  subtitle,
}: {
  title: string
  value: string
  color?: CardColor
  subtitle?: string
}) {
  return (
    <div className={`rounded-xl border p-6 ${CARD_COLORS[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{title}</p>
      <p className="mt-2 truncate text-xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs opacity-50 truncate">{subtitle}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const backend = useAppStore((s) => s.backend)
  const [ping, setPing] = useState<string>('—')

  useEffect(() => {
    if (backend.status !== 'ready') {
      setPing('—')
      return
    }
    api
      .get<PingResponse>('/ping')
      .then((d) => setPing(d.message))
      .catch(() => setPing('unreachable'))
  }, [backend.status])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('stats.backend')}
          value={backend.status}
          color={
            backend.status === 'ready'    ? 'green'  :
            backend.status === 'starting' ? 'amber'  : 'gray'
          }
          subtitle={backend.url ?? undefined}
        />
        <StatCard
          title={t('stats.pid')}
          value={backend.pid ? String(backend.pid) : '—'}
          color="blue"
        />
        <StatCard
          title={t('stats.ping')}
          value={ping}
          color="purple"
        />
        <StatCard
          title={t('stats.platform')}
          value={window.navigator.platform}
          color="amber"
        />
      </div>

      {backend.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <strong>{t('backendError')}:</strong> {backend.error}
        </div>
      )}
    </div>
  )
}
