interface VolumeBarProps {
  value: number  // 0–100
}

export function VolumeBar({ value }: VolumeBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const color =
    pct > 80 ? 'bg-red-400' :
    pct > 50 ? 'bg-yellow-400' :
               'bg-green-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
    </div>
  )
}
