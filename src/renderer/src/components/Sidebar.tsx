import { useMemo, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/app.store'
import { useDevicesStore } from '../store/devices.store'
import type { BackendStatus } from '@shared/ipc'

// Icons

const Icons = {
  Devices: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Channels: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
  Streams: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  ),
  Messages: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  Events: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Scenes: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Log: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Transfers: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  Sonometers: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  SipDevices: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Webserver: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5 12H3m18 0h-2M12 5V3m0 18v-2m4.95-13.95l-1.414 1.414M6.464 17.536L5.05 18.95M18.95 18.95l-1.414-1.414M6.464 6.464L5.05 5.05M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
}

const STATUS_DOT: Record<BackendStatus, string> = {
  ready:    'bg-green-400',
  starting: 'bg-yellow-400 animate-pulse',
  error:    'bg-red-400',
  stopped:  'bg-gray-500',
}

export default function Sidebar() {
  const { t } = useTranslation('nav')
  const { sidebarOpen, backend } = useAppStore()
  const entries = useDevicesStore((s) => s.entries)

  const selectedMac         = useDevicesStore((s) => s.selectedMac)
  const selectedEntry       = selectedMac ? entries.get(selectedMac) : undefined
  const selectedIsWebserver = selectedEntry
    ? selectedEntry.device.device_type === 7 || selectedEntry.device.device_type === 9
    : false

  const WebserverIconAnimated = useCallback(() => (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
      <Icons.Webserver />
    </span>
  ), [])

  const networkItems = useMemo(() => {
    const base = [
      { to: '/devices',     label: t('items.devices'),    Icon: Icons.Devices    },
      { to: '/channels',    label: t('items.channels'),   Icon: Icons.Channels   },
      { to: '/sip-devices', label: t('items.sipDevices'), Icon: Icons.SipDevices },
    ]
    if (selectedIsWebserver) {
      base.push({ to: '/webserver', label: t('items.webserver'), Icon: WebserverIconAnimated })
    }
    return base
  }, [selectedIsWebserver, WebserverIconAnimated, t])

  const allGroups = useMemo(() => [
    {
      label: t('groups.network'),
      items: networkItems,
    },
    {
      label: t('groups.audio'),
      items: [
        { to: '/messages',   label: t('items.messages'),   Icon: Icons.Messages   },
        { to: '/sonometers', label: t('items.sonometers'), Icon: Icons.Sonometers },
      ],
    },
    {
      label: t('groups.automation'),
      items: [
        { to: '/streams',        label: t('items.streams'),       Icon: Icons.Streams       },
        { to: '/calendar',       label: t('items.calendar'),      Icon: Icons.Calendar      },
        { to: '/events',         label: t('items.events'),        Icon: Icons.Events        },
        { to: '/scenes',         label: t('items.scenes'),        Icon: Icons.Scenes        },
        { to: '/transfers',      label: t('items.transfers'),     Icon: Icons.Transfers     },
      ],
    },
    {
      label: t('groups.system'),
      items: [
        { to: '/log', label: t('items.log'), Icon: Icons.Log },
      ],
    },
  ], [networkItems, t])

  if (!sidebarOpen) return null

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-5 dark:border-gray-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">
          AIP
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">AIP Go Pro</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Management Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {allGroups.map(({ label, items }) => (
          <div key={label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, label: itemLabel, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`
                  }
                >
                  <Icon />
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Backend status footer */}
      <div className="shrink-0 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[backend.status]}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('footer.backend')}:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
              {backend.status}
            </span>
          </span>
        </div>
        {backend.url && backend.status === 'ready' && (
          <p className="mt-0.5 truncate text-[10px] text-gray-400">{backend.url}</p>
        )}
        {backend.error && (
          <p className="mt-0.5 truncate text-[10px] text-red-400">{backend.error}</p>
        )}
      </div>
    </aside>
  )
}
