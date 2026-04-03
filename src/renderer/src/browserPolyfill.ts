/**
 * Browser polyfill for window.electronAPI.
 *
 * When the renderer runs outside Electron (e.g. Vite dev server in a plain
 * browser), this module installs a compatible implementation that talks
 * directly to aip-daemon via WebSocket.
 *
 * Uses native WebSocket directly — no aip-client import — so there are no
 * CJS/ESM bundling issues.
 *
 * Install by calling installBrowserPolyfill() before ReactDOM.createRoot().
 * In Electron the preload already sets window.electronAPI, so this is a no-op.
 */

import type {
    AipChannelConfig,
    AipChannelInfo,
    AipChannelPlayerEvent,
    AipForeignChannelInfo,
    AipNetworkInterface,
} from '../../shared/ipc'

// Minimal request/response WebSocket client matching aip-daemon's JSON protocol
class DaemonClient {
    private _ws: WebSocket | null = null
    private _pending  = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
    private _queued:  Array<{ id: string; msg: string; resolve: (v: unknown) => void; reject: (e: Error) => void }> = []
    private _seq = 0
    private _stopped = false
    private _reconnectDelay: number
    private _url: string

    readonly deviceSubs  = new Set<(json: string) => void>()
    readonly channelSubs = new Set<(json: string) => void>()

    constructor(url: string, reconnectDelay = 2000) {
        this._url = url
        this._reconnectDelay = reconnectDelay
        this._open()
    }

    send(cmd: string, params?: Record<string, unknown>): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const id  = String(++this._seq)
            const msg = JSON.stringify({ id, cmd, ...params })
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._pending.set(id, { resolve, reject })
                this._ws.send(msg)
            } else {
                // Socket not ready yet — queue until onopen fires
                this._queued.push({ id, msg, resolve, reject })
            }
        })
    }

    private _open(): void {
        const ws = new WebSocket(this._url)
        this._ws = ws

        ws.onopen = () => {
            const queued = this._queued.splice(0)
            for (const { id, msg, resolve, reject } of queued) {
                this._pending.set(id, { resolve, reject })
                ws.send(msg)
            }
        }

        ws.onmessage = (ev) => {
            let msg: Record<string, unknown>
            try { msg = JSON.parse(ev.data as string) as Record<string, unknown> }
            catch { return }

            if (typeof msg['type'] === 'string') {
                const type = msg['type'] as string
                const inner = msg['json'] as string | undefined
                if (inner) {
                    if (type === 'device_event')  this.deviceSubs.forEach((cb) => cb(inner))
                    if (type === 'channel_event') this.channelSubs.forEach((cb) => cb(inner))
                }
                return
            }

            const id = msg['id'] as string | undefined
            if (!id) return
            const p = this._pending.get(id)
            if (!p) return
            this._pending.delete(id)
            if (msg['ok'] === true) p.resolve(msg['result'] ?? null)
            else p.reject(new Error(String(msg['error'] ?? 'unknown error')))
        }

        ws.onerror = () => { /* onclose fires next */ }

        ws.onclose = () => {
            this._ws = null
            const pending = this._pending
            this._pending = new Map()
            pending.forEach((p) => p.reject(new Error('DaemonClient: connection lost')))
            const queued = this._queued.splice(0)
            queued.forEach((q) => q.reject(new Error('DaemonClient: connection lost')))
            if (!this._stopped) {
                setTimeout(() => { if (!this._stopped) this._open() }, this._reconnectDelay)
            }
        }
    }
}

export function installBrowserPolyfill(): void {
    if (typeof (window as { electronAPI?: unknown }).electronAPI !== 'undefined') {
        return  // Running inside Electron — preload already set window.electronAPI
    }

    // Allow overriding the daemon URL via ?daemon=ws://192.168.1.x:9000
    const params    = new URLSearchParams(window.location.search)
    const daemonUrl = params.get('daemon') ?? `ws://${window.location.hostname}:9000`
    const c = new DaemonClient(daemonUrl)

    const polyfill = {
        __isBrowserPolyfill: true as const,

        backend: {
            getInfo:  () => Promise.resolve({ status: 'ready' as const, url: null, pid: null }),
            getUrl:   () => Promise.resolve(null as string | null),
            restart:  () => Promise.resolve(),
        },

        app: {
            getVersion:  () => Promise.resolve('dev'),
            getPlatform: () => Promise.resolve(navigator.platform),
        },

        dialog: {
            openFile: () => Promise.resolve(null as string[] | null),
            saveFile: () => Promise.resolve(null as string | null),
        },

        aip: {
            getStatus: (): Promise<{ initialized: boolean }> =>
                c.send('getStatus') as Promise<{ initialized: boolean }>,

            getInterfaces: (): Promise<AipNetworkInterface[]> =>
                c.send('getInterfaces') as Promise<AipNetworkInterface[]>,

            initialize: (networkInterface: string): Promise<void> =>
                c.send('initialize', { iface: networkInterface }) as Promise<void>,

            shutdown: (): Promise<void> =>
                c.send('shutdown') as Promise<void>,

            onDeviceEvent: (cb: (json: string) => void): (() => void) => {
                c.deviceSubs.add(cb)
                return () => { c.deviceSubs.delete(cb) }
            },

            onChannelEvent: (cb: (event: AipChannelPlayerEvent) => void): (() => void) => {
                const wrapped = (json: string): void => {
                    try { cb(JSON.parse(json) as AipChannelPlayerEvent) } catch { /* ignore */ }
                }
                c.channelSubs.add(wrapped)
                return () => { c.channelSubs.delete(wrapped) }
            },

            getDevices: (): Promise<string> =>
                c.send('getDevices').then((d) => JSON.stringify(d)),

            getDevice: (mac: string): Promise<string> =>
                c.send('getDevice', { mac }).then((d) => d ? JSON.stringify(d) : '{}'),

            setVolume: (mac: string, volume: number): Promise<void> =>
                c.send('setVolume', { mac, volume }) as Promise<void>,

            stopAudio: (mac: string): Promise<void> =>
                c.send('stopAudio', { mac }) as Promise<void>,

            createChannel: (config: AipChannelConfig): Promise<number> =>
                c.send('createChannel', config as unknown as Record<string, unknown>) as Promise<number>,

            destroyChannel: (id: number): Promise<void> =>
                c.send('destroyChannel', { id }) as Promise<void>,

            getChannel: (id: number): Promise<AipChannelInfo | undefined> =>
                c.send('getChannel', { id }).then((ch) => ch as AipChannelInfo | null ?? undefined),

            getChannels: (): Promise<AipChannelInfo[]> =>
                c.send('getChannels') as Promise<AipChannelInfo[]>,

            getForeignChannels: (): Promise<AipForeignChannelInfo[]> =>
                c.send('getForeignChannels') as Promise<AipForeignChannelInfo[]>,

            playChannel:     (id: number): Promise<void> => c.send('playChannel',     { id }) as Promise<void>,
            pauseChannel:    (id: number): Promise<void> => c.send('pauseChannel',    { id }) as Promise<void>,
            stopChannel:     (id: number): Promise<void> => c.send('stopChannel',     { id }) as Promise<void>,
            nextChannel:     (id: number): Promise<void> => c.send('nextChannel',     { id }) as Promise<void>,
            previousChannel: (id: number): Promise<void> => c.send('previousChannel', { id }) as Promise<void>,

            setChannelVolume: (id: number, volume: number): Promise<void> =>
                c.send('setChannelVolume', { id, volume }) as Promise<void>,

            linkChannelToDevice: (channelId: number, deviceMac: string): Promise<void> =>
                c.send('linkChannelToDevice', { channelId, mac: deviceMac }) as Promise<void>,

            linkNetworkChannelToDevice: (channelMac: string, channelNumber: number, deviceMac: string): Promise<void> =>
                c.send('linkNetworkChannelToDevice', { channelMac, channelNumber, deviceMac }) as Promise<void>,
        },
    }

    ;(window as unknown as Record<string, unknown>).electronAPI = polyfill
}
