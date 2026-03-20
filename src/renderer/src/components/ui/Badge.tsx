interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'sip' | 'rtp' | 'http'
}

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sip:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  rtp:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  http:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${VARIANTS[variant]}`}>
      {label}
    </span>
  )
}
