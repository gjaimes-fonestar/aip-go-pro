import { useEffect, useState } from 'react'
import type { AipNetworkInterface } from '@shared/ipc'

interface Props {
  onConfirm: (address: string) => void
}

/**
 * Full-screen overlay shown on first visit to the Devices page.
 * Lets the user pick a local network interface to use for AIP multicast discovery.
 */
export function InterfaceSelectModal({ onConfirm }: Props) {
  const [interfaces,  setInterfaces]  = useState<AipNetworkInterface[]>([])
  const [selected,    setSelected]    = useState<string>('')
  const [loading,     setLoading]     = useState(true)
  const [starting,    setStarting]    = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    // If the daemon is already initialized (e.g. Electron started it), skip the modal.
    window.electronAPI.aip.getStatus()
      .then(({ initialized }) => {
        if (initialized) { onConfirm(''); return }
        return window.electronAPI.aip
          .getInterfaces()
          .then((ifaces) => {
            setInterfaces(ifaces)
            if (ifaces.length > 0) setSelected(ifaces[0].address)
          })
          .catch(() => setError('Could not enumerate network interfaces.'))
          .finally(() => setLoading(false))
      })
      .catch(() => {
        // getStatus not supported — fall back to normal flow
        window.electronAPI.aip
          .getInterfaces()
          .then((ifaces) => {
            setInterfaces(ifaces)
            if (ifaces.length > 0) setSelected(ifaces[0].address)
          })
          .catch(() => setError('Could not enumerate network interfaces.'))
          .finally(() => setLoading(false))
      })
  }, [])

  async function handleStart() {
    if (!selected || starting) return
    setStarting(true)
    setError(null)
    try {
      await window.electronAPI.aip.initialize(selected)
      onConfirm(selected)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">

        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Select Network Interface
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose the interface to use for AIP multicast discovery
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : interfaces.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No non-loopback IPv4 interfaces found.<br />
              Connect to a network and try again.
            </p>
          ) : (
            <div className="space-y-2">
              {interfaces.map((iface) => (
                <label
                  key={iface.address}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    selected === iface.address
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="iface"
                    value={iface.address}
                    checked={selected === iface.address}
                    onChange={() => setSelected(iface.address)}
                    className="accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {iface.name}
                    </p>
                    <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {iface.address}
                    </p>
                  </div>
                  {selected === iface.address && (
                    <svg className="h-4 w-4 shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" clipRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  )}
                </label>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={handleStart}
            disabled={!selected || starting || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Initializing…
              </>
            ) : (
              'Start Discovery'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
