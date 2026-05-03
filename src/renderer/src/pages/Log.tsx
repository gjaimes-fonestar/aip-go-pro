import { useLogStore, type LogLevel } from '../store/log.store'
import { format, parseISO } from 'date-fns'

// ─── Level badge ──────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<LogLevel, string> = {
  info:  'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300',
  warn:  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  error: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300',
}

function LevelBadge({ level }: { level: LogLevel }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${LEVEL_STYLES[level]}`}>
      {level}
    </span>
  )
}

// ─── Log page ─────────────────────────────────────────────────────────────────

export default function Log() {
  const entries = useLogStore((s) => s.entries)
  const clear   = useLogStore((s) => s.clear)

  return (
    <div className="flex h-full flex-col gap-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Log</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {entries.length === 0
              ? 'No entries yet — events will appear here when the scheduler fires them.'
              : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} (latest first)`}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={clear}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Waiting for events…</p>
          </div>
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-44">Time</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-16">Level</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-28">Category</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {format(parseISO(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2.5">
                    <LevelBadge level={entry.level} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                    {entry.category}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                    {entry.message}
                    {entry.details && (
                      <span className="ml-2 font-mono text-xs text-gray-400 dark:text-gray-500">
                        {entry.details}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
