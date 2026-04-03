/**
 * DeviceConfigPanel — sliding right-side panel for device configuration.
 *
 * Tabs shown depend on device type:
 *   Receiver / Player   → Main · Audio · Network · I/O · SIP · Options
 *   Transmitter         → Main · Audio · Network · Options
 *   Amplifier           → Main · Audio · Network · I/O · SIP · Options
 *   Gate / Controller   → Main · Network · Date & Time · Webserver · Options
 *   Unknown             → Main · Network · Options
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  AipDeviceJson,
  AipSipConfigChangedEvent,
  AipSoundMeterConfigChangedEvent,
  AipSipConfigWrite,
  AipDeviceNetworkConfig,
  AipSensorRelayConfig,
} from '@shared/ipc'

// ─── Capabilities ─────────────────────────────────────────────────────────────

type ConfigTab = 'main' | 'audio' | 'network' | 'io' | 'sip' | 'datetime' | 'webserver' | 'options'

interface DeviceCaps {
  tabs: ConfigTab[]
}

function deviceCaps(deviceType: number): DeviceCaps {
  switch (deviceType) {
    case 0: // Player
    case 1: // PlayerAmplifier
    case 5: // Intercom
      return { tabs: ['main', 'audio', 'network', 'io', 'sip', 'options'] }
    case 3: // SimpleMicrophone
    case 4: // ProMicrophone
    case 8: // Transmitter
      return { tabs: ['main', 'audio', 'network', 'options'] }
    case 7: // PCGateway
    case 9: // WebServer
      return { tabs: ['main', 'network', 'datetime', 'webserver', 'options'] }
    case 10: // SoundMeter
    case 11: // SensorRelay
      return { tabs: ['main', 'network', 'io', 'options'] }
    default:
      return { tabs: ['main', 'network', 'options'] }
  }
}

const TAB_LABELS: Record<ConfigTab, string> = {
  main:      'Main',
  audio:     'Audio',
  network:   'Network',
  io:        'I/O',
  sip:       'SIP',
  datetime:  'Date & Time',
  webserver: 'Webserver',
  options:   'Options',
}

// ─── SIP state label ─────────────────────────────────────────────────────────

function sipStateLabel(state: number): string {
  switch (state) {
    case 0: return 'Not configured'
    case 1: return 'Not registered'
    case 2: return 'Registering…'
    case 3: return 'Registered in SIP server'
    case 4: return 'Registration failed'
    default: return `State ${state}`
  }
}

// ─── Shared form primitives ───────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-40 shrink-0 text-sm text-gray-600 dark:text-gray-400">{children}</span>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function TextInput({
  value, onChange, disabled = false, type = 'text', placeholder,
}: {
  value: string; onChange: (v: string) => void
  disabled?: boolean; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="h-8 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
    />
  )
}

function NumInput({
  value, onChange, min, max, disabled = false,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="h-8 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
    />
  )
}

function SelectInput<T extends string | number>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)}
      className="h-8 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {children}
    </p>
  )
}

function ApplyButton({ onClick, label = 'Apply' }: { onClick: () => void; label?: string }) {
  const [flash, setFlash] = useState(false)
  const handle = () => {
    onClick()
    setFlash(true)
    setTimeout(() => setFlash(false), 1400)
  }
  return (
    <button
      onClick={handle}
      className={`rounded-md px-5 py-1.5 text-sm font-semibold transition-colors ${
        flash
          ? 'bg-green-500 text-white'
          : 'bg-primary text-white hover:bg-primary/90'
      }`}
    >
      {flash ? '✓ Sent' : label}
    </button>
  )
}

// ─── Tab: Main ────────────────────────────────────────────────────────────────

const BOOT_MODES = [
  { value: 0, label: 'Direct boot' },
  { value: 1, label: 'Last state' },
  { value: 2, label: 'Last state. Direct or standby' },
]

const BUTTON_COLORS = [
  { value: 'off',    label: 'Off',    rgb: [0,0,0] as [number,number,number] },
  { value: 'red',    label: 'Red',    rgb: [255,0,0] as [number,number,number] },
  { value: 'green',  label: 'Green',  rgb: [0,255,0] as [number,number,number] },
  { value: 'blue',   label: 'Blue',   rgb: [0,0,255] as [number,number,number] },
  { value: 'yellow', label: 'Yellow', rgb: [255,220,0] as [number,number,number] },
  { value: 'white',  label: 'White',  rgb: [255,255,255] as [number,number,number] },
  { value: 'custom', label: 'Custom', rgb: [128,128,128] as [number,number,number] },
]

function TabMain({ device, isGate }: { device: AipDeviceJson; isGate: boolean }) {
  const [bootMode,      setBootMode]      = useState(0)
  const [colorPreset,   setColorPreset]   = useState('yellow')
  const [customColor,   setCustomColor]   = useState('#ffdc00')
  const [restoreLastCh, setRestoreLastCh] = useState(true)

  const handleApply = useCallback(() => {
    const preset = BUTTON_COLORS.find((c) => c.value === colorPreset)
    let r = 255, g = 220, b = 0
    if (colorPreset === 'custom') {
      const hex = customColor.replace('#', '')
      r = parseInt(hex.substring(0, 2), 16)
      g = parseInt(hex.substring(2, 4), 16)
      b = parseInt(hex.substring(4, 6), 16)
    } else if (preset) {
      [r, g, b] = preset.rgb
    }
    window.electronAPI.aip.changeButtonColor(device.mac, r, g, b).catch(console.error)
    window.electronAPI.aip.changeStartupMode(device.mac, bootMode).catch(console.error)
  }, [device.mac, bootMode, colorPreset, customColor])

  return (
    <div className="space-y-4">
      <FormRow label="Boot mode">
        <SelectInput value={bootMode} onChange={setBootMode} options={BOOT_MODES} />
      </FormRow>

      <FormRow label="Power button color">
        <div className="flex items-center gap-2">
          <SelectInput
            value={colorPreset}
            onChange={setColorPreset}
            options={BUTTON_COLORS.map((c) => ({ value: c.value, label: c.label }))}
          />
          {colorPreset !== 'custom' && (
            <span
              className="h-6 w-6 shrink-0 rounded border border-gray-300"
              style={{
                background: BUTTON_COLORS.find((c) => c.value === colorPreset)
                  ? `rgb(${BUTTON_COLORS.find((c) => c.value === colorPreset)!.rgb.join(',')})`
                  : 'transparent',
              }}
            />
          )}
          {colorPreset === 'custom' && (
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
            />
          )}
        </div>
      </FormRow>

      {!isGate && (
        <FormRow label="">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={restoreLastCh}
              onChange={(e) => setRestoreLastCh(e.target.checked)}
              className="rounded accent-primary"
            />
            Restore last background music channel
          </label>
        </FormRow>
      )}

      <div className="pt-2">
        <ApplyButton onClick={handleApply} />
      </div>
    </div>
  )
}

// ─── Tab: Audio ───────────────────────────────────────────────────────────────

const VOLUME_MODES = [
  { value: 0, label: 'General volume' },
  { value: 1, label: 'Per-action volume' },
]

const LATENCY_OPTIONS = [
  { value: 0, label: 'High' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Low' },
]

function TabAudio({ device }: { device: AipDeviceJson }) {
  const [volumeMode,    setVolumeMode]    = useState(0)
  const [generalVolume, setGeneralVolume] = useState(device.volume)
  const [latency,       setLatency]       = useState(device.latency)

  useEffect(() => {
    setGeneralVolume(device.volume)
    setLatency(device.latency)
  }, [device.mac])

  const handleApply = useCallback(() => {
    window.electronAPI.aip.setVolume(device.mac, generalVolume).catch(console.error)
  }, [device.mac, generalVolume])

  return (
    <div className="space-y-4">
      <FormRow label="Volume mode">
        <SelectInput value={volumeMode} onChange={setVolumeMode} options={VOLUME_MODES} />
      </FormRow>
      <FormRow label="General volume">
        <NumInput value={generalVolume} onChange={setGeneralVolume} min={0} max={100} />
      </FormRow>
      <FormRow label="Latency">
        <SelectInput value={latency} onChange={setLatency} options={LATENCY_OPTIONS} />
      </FormRow>
      <div className="pt-2">
        <ApplyButton onClick={handleApply} />
      </div>
    </div>
  )
}

// ─── Tab: Network ─────────────────────────────────────────────────────────────

function TabNetwork({ device }: { device: AipDeviceJson }) {
  const [dhcp,    setDhcp]    = useState(device.network.dhcp)
  const [ip,      setIp]      = useState(device.network.ip)
  const [subnet,  setSubnet]  = useState(device.network.subnet_mask)
  const [gateway, setGateway] = useState(device.network.gateway)

  useEffect(() => {
    setDhcp(device.network.dhcp)
    setIp(device.network.ip)
    setSubnet(device.network.subnet_mask)
    setGateway(device.network.gateway)
  }, [device.mac])

  const handleApply = useCallback(() => {
    const config: AipDeviceNetworkConfig = {
      dhcp, ipAddress: ip, subnetMask: subnet, gateway,
    }
    window.electronAPI.aip.changeNetworkConfig(device.mac, config).catch(console.error)
  }, [device.mac, dhcp, ip, subnet, gateway])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            checked={dhcp}
            onChange={() => setDhcp(true)}
            className="accent-primary"
          />
          Obtain an IP address automatically
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            checked={!dhcp}
            onChange={() => setDhcp(false)}
            className="accent-primary"
          />
          Use the following IP address
        </label>
      </div>

      <div className={`space-y-3 transition-opacity ${dhcp ? 'pointer-events-none opacity-40' : ''}`}>
        <FormRow label="IP"><TextInput value={ip} onChange={setIp} disabled={dhcp} /></FormRow>
        <FormRow label="Netmask"><TextInput value={subnet} onChange={setSubnet} disabled={dhcp} /></FormRow>
        <FormRow label="Gateway"><TextInput value={gateway} onChange={setGateway} disabled={dhcp} /></FormRow>
      </div>

      <div className="pt-2">
        <ApplyButton onClick={handleApply} />
      </div>
    </div>
  )
}

// ─── Tab: I/O ─────────────────────────────────────────────────────────────────

const REST_STATE_OPTS = [
  { value: false, label: 'Open'   },
  { value: true,  label: 'Closed' },
]

const ACTIVATION_OPTS = [
  { value: true,  label: 'Closed circuit' },
  { value: false, label: 'Open circuit'   },
]

const RELAY_NAMES   = ['Relay 1',  'Relay 2',  'Relay 3',  'Relay 4']
const SENSOR_NAMES  = ['Sensor 1', 'Sensor 2', 'Sensor 3', 'Sensor 4']

function TabIO({ device }: { device: AipDeviceJson }) {
  const [relayStates,  setRelayStates]  = useState<boolean[]>([false, false, false, false])
  const [relayVoIP,    setRelayVoIP]    = useState<boolean[]>([false, false, false, false])
  const [sensorStates, setSensorStates] = useState<boolean[]>([true,  true,  true,  true])

  const setRelay  = (i: number, v: boolean) => setRelayStates((p)  => p.map((x, j) => j === i ? v : x))
  const setVoIP   = (i: number, v: boolean) => setRelayVoIP((p)    => p.map((x, j) => j === i ? v : x))
  const setSensor = (i: number, v: boolean) => setSensorStates((p) => p.map((x, j) => j === i ? v : x))

  const handleApply = useCallback(() => {
    const config: AipSensorRelayConfig = {
      changeSensors: true,
      changeRelays:  true,
      sensorValues:  sensorStates,
      relayValues:   relayStates,
    }
    window.electronAPI.aip.changeSensorRelayConfig(device.mac, config).catch(console.error)
  }, [device.mac, relayStates, sensorStates])

  return (
    <div className="space-y-5">
      {/* Relay rest states */}
      <div>
        <SectionTitle>State of rest for relays</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Rest state</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {RELAY_NAMES.map((name, i) => (
                <tr key={i} className="bg-white dark:bg-gray-800">
                  <td className="px-3 py-1.5 text-xs text-gray-500">{i + 1}</td>
                  <td className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">{name}</td>
                  <td className="px-3 py-1.5 text-right">
                    <select
                      value={String(relayStates[i])}
                      onChange={(e) => setRelay(i, e.target.value === 'true')}
                      className="h-7 rounded border border-gray-200 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {REST_STATE_OPTS.map((o) => (
                        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relays during VoIP */}
      <div>
        <SectionTitle>Relays during VoIP and message from microphone</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Use relay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {RELAY_NAMES.map((name, i) => (
                <tr key={i} className="bg-white dark:bg-gray-800">
                  <td className="px-3 py-1.5 text-xs text-gray-500">{i + 1}</td>
                  <td className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">{name}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="checkbox"
                      checked={relayVoIP[i]}
                      onChange={(e) => setVoIP(i, e.target.checked)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensor activation */}
      <div>
        <SectionTitle>Activation of sensors</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Activation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {SENSOR_NAMES.map((name, i) => (
                <tr key={i} className="bg-white dark:bg-gray-800">
                  <td className="px-3 py-1.5 text-xs text-gray-500">{i + 1}</td>
                  <td className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">{name}</td>
                  <td className="px-3 py-1.5 text-right">
                    <select
                      value={String(sensorStates[i])}
                      onChange={(e) => setSensor(i, e.target.value === 'true')}
                      className="h-7 rounded border border-gray-200 bg-white px-2 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {ACTIVATION_OPTS.map((o) => (
                        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-1">
        <ApplyButton onClick={handleApply} />
      </div>
    </div>
  )
}

// ─── Tab: SIP ─────────────────────────────────────────────────────────────────

function TabSIP({
  device, sipConfig,
}: {
  device: AipDeviceJson
  sipConfig?: AipSipConfigChangedEvent
}) {
  const [loading,     setLoading]     = useState(!sipConfig)
  const [activated,   setActivated]   = useState(sipConfig?.configured ?? false)
  const [serverIp,    setServerIp]    = useState(sipConfig?.serverIp ?? '')
  const [serverPort,  setServerPort]  = useState(sipConfig?.serverPort ?? 5060)
  const [username,    setUsername]    = useState(sipConfig?.username ?? '')
  const [password,    setPassword]    = useState('')
  const [audioPortFrom, setAudioPortFrom] = useState(sipConfig?.clientAudioPort ?? 10000)
  const [audioPortRange, setAudioPortRange] = useState(sipConfig?.clientAudioPortRange ?? 10000)
  const [sipVolume,   setSipVolume]   = useState(sipConfig?.sipVolume ?? 70)
  const [relayActive, setRelayActive] = useState<boolean[]>(
    sipConfig?.relays ?? [false, false, false, false]
  )

  // When sipConfig arrives (push event), populate form and stop spinner
  useEffect(() => {
    if (!sipConfig) return
    setLoading(false)
    setActivated(sipConfig.configured)
    setServerIp(sipConfig.serverIp)
    setServerPort(sipConfig.serverPort)
    setUsername(sipConfig.username)
    setAudioPortFrom(sipConfig.clientAudioPort)
    setAudioPortRange(sipConfig.clientAudioPortRange)
    setSipVolume(sipConfig.sipVolume)
    setRelayActive(sipConfig.relays ?? [false, false, false, false])
  }, [sipConfig?.mac])

  const handleRequest = () => {
    setLoading(true)
    window.electronAPI.aip.requestSIPConfig(device.mac).catch(console.error)
  }

  const handleApply = useCallback(() => {
    const config: AipSipConfigWrite = {
      configured:           activated,
      state:                sipConfig?.state ?? 0,
      serverIp,
      serverPort,
      clientAudioPort:      audioPortFrom,
      clientAudioPortRange: audioPortRange,
      username,
      password:             password || undefined,
      sipVolume,
      zones:                sipConfig?.zones ?? [],
      relays:               relayActive,
    }
    window.electronAPI.aip.changeSIPConfig(device.mac, config).catch(console.error)
  }, [device.mac, activated, serverIp, serverPort, username, password,
      audioPortFrom, audioPortRange, sipVolume, relayActive, sipConfig])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Reading SIP config from device…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={activated}
            onChange={(e) => setActivated(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          Activated
        </label>
        <div className="flex items-center gap-2">
          {sipConfig && (
            <span className={`text-xs font-medium ${
              sipConfig.state === 3
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-400'
            }`}>
              {sipStateLabel(sipConfig.state)}
            </span>
          )}
          <button
            onClick={handleRequest}
            title="Read current config from device"
            className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Server */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <SectionTitle>Server</SectionTitle>
        <div className="space-y-3">
          <FormRow label="IP"><TextInput value={serverIp}   onChange={setServerIp} /></FormRow>
          <FormRow label="Port"><NumInput value={serverPort} onChange={setServerPort} min={1} max={65535} /></FormRow>
          <FormRow label="User"><TextInput value={username}  onChange={setUsername} /></FormRow>
          <FormRow label="Password">
            <TextInput value={password} onChange={setPassword} type="password" placeholder="Leave blank to keep" />
          </FormRow>
          <FormRow label="Audio port range">
            <div className="flex items-center gap-2">
              <NumInput value={audioPortFrom}  onChange={setAudioPortFrom}  min={1024} max={65535} />
              <span className="text-sm text-gray-400">–</span>
              <NumInput value={audioPortRange} onChange={setAudioPortRange} min={0}    max={65535} />
            </div>
          </FormRow>
        </div>
      </div>

      {/* Active relays */}
      <div>
        <SectionTitle>Active relays</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Activation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {RELAY_NAMES.map((name, i) => (
                <tr key={i} className="bg-white dark:bg-gray-800">
                  <td className="px-3 py-1.5 text-xs text-gray-500">{i + 1}</td>
                  <td className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">{name}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="checkbox"
                      checked={relayActive[i] ?? false}
                      onChange={(e) =>
                        setRelayActive((p) => p.map((x, j) => j === i ? e.target.checked : x))
                      }
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Options */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <SectionTitle>Options</SectionTitle>
        <FormRow label="SIP Volume">
          <div className="flex items-center gap-3">
            <input
              type="range" min={0} max={100} value={sipVolume}
              onChange={(e) => setSipVolume(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-8 text-right text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
              {sipVolume}
            </span>
          </div>
        </FormRow>
      </div>

      <ApplyButton onClick={handleApply} />
    </div>
  )
}

// ─── Tab: Date & Time ─────────────────────────────────────────────────────────

function TabDateTime() {
  return (
    <div className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
      <p>Date & time synchronisation settings will be available in a future release.</p>
    </div>
  )
}

// ─── Tab: Webserver ───────────────────────────────────────────────────────────

function TabWebserver({ device }: { device: AipDeviceJson }) {
  const [useHttps,      setUseHttps]      = useState(false)
  const [authEnabled,   setAuthEnabled]   = useState(false)

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={useHttps} onChange={(e) => setUseHttps(e.target.checked)}
          className="h-4 w-4 rounded accent-primary" />
        Use HTTPS
      </label>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={authEnabled} onChange={(e) => setAuthEnabled(e.target.checked)}
            className="h-4 w-4 rounded accent-primary" />
          Enable authentication
        </label>
        <button
          disabled={!authEnabled}
          className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Manage users
        </button>
      </div>
      <button
        onClick={() => window.electronAPI.aip.changeStartupMode(device.mac, 99).catch(console.error)}
        className="rounded border border-gray-200 px-5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        Reboot service
      </button>
    </div>
  )
}

// ─── Tab: Options ─────────────────────────────────────────────────────────────

function TabOptions({ device }: { device: AipDeviceJson }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Software version: <span className="font-semibold text-gray-900 dark:text-white">{device.software_version || '—'}</span>
      </p>
      <div className="flex flex-col gap-2">
        <button
          className="w-48 rounded border border-gray-200 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          onClick={() => { /* firmware upgrade placeholder */ }}
        >
          Select upgrade
        </button>
        <button
          className="w-48 rounded border border-gray-200 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          onClick={() => window.electronAPI.aip.changeStartupMode(device.mac, 0).catch(console.error)}
        >
          Restart
        </button>
      </div>
    </div>
  )
}

// ─── Main panel component ─────────────────────────────────────────────────────

export interface DeviceConfigPanelProps {
  device:          AipDeviceJson
  sipConfig?:      AipSipConfigChangedEvent
  soundMeterConfig?: AipSoundMeterConfigChangedEvent
  open:            boolean
  onClose:         () => void
}

export function DeviceConfigPanel({
  device,
  sipConfig,
  soundMeterConfig: _soundMeterConfig,
  open,
  onClose,
}: DeviceConfigPanelProps) {
  const caps = deviceCaps(device.device_type)
  const isGate = device.device_type === 7 || device.device_type === 9

  const [activeTab, setActiveTab] = useState<ConfigTab>(caps.tabs[0])

  // Reset to first tab when device changes
  useEffect(() => {
    setActiveTab(caps.tabs[0])
  }, [device.mac])

  // Ensure activeTab is valid for current device type
  useEffect(() => {
    if (!caps.tabs.includes(activeTab)) setActiveTab(caps.tabs[0])
  }, [caps.tabs, activeTab])

  // Fallback: request SIP config on tab open only if not yet pre-loaded
  const sipRequestedRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeTab !== 'sip') return
    if (sipConfig) return // already available from background pre-load
    if (sipRequestedRef.current === device.mac) return
    sipRequestedRef.current = device.mac
    window.electronAPI.aip.requestSIPConfig(device.mac).catch(console.error)
  }, [activeTab, device.mac, sipConfig])

  return (
    <div
      className={`flex h-full flex-col border-l border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 ${
        open ? 'w-[460px]' : 'w-0 overflow-hidden'
      }`}
    >
      {open && (
        <>
          {/* Panel header */}
          <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {device.name}
              </h2>
              <p className="font-mono text-[10px] text-gray-400">{device.mac}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body: left tab rail + content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Vertical tab rail */}
            <div className="flex w-28 shrink-0 flex-col gap-0.5 border-r border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/60">
              {caps.tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full rounded-md px-2 py-2 text-left text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {activeTab === 'main'      && <TabMain     device={device} isGate={isGate} />}
              {activeTab === 'audio'     && <TabAudio    device={device} />}
              {activeTab === 'network'   && <TabNetwork  device={device} />}
              {activeTab === 'io'        && <TabIO       device={device} />}
              {activeTab === 'sip'       && <TabSIP      device={device} sipConfig={sipConfig} />}
              {activeTab === 'datetime'  && <TabDateTime />}
              {activeTab === 'webserver' && <TabWebserver device={device} />}
              {activeTab === 'options'   && <TabOptions  device={device} />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
