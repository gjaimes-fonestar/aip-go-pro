/**
 * Browser polyfill for window.electronAPI.
 *
 * When the renderer runs outside Electron (e.g. Vite dev server in a plain
 * browser), this module installs a compatible implementation that talks
 * directly to aip-daemon via WebSocket using aip-client.
 *
 * Install by calling installBrowserPolyfill() before ReactDOM.createRoot().
 */

import * as aip from 'aip-client'
import type {
    AipChannelConfig,
    AipChannelInfo,
    AipChannelPlayerEvent,
    AipForeignChannelInfo,
    AipNetworkInterface,
} from '../../shared/ipc'

aip.configure({ url: 'ws://127.0.0.1:9000', reconnectDelay: 2000 })

// Track raw channel-event subscribers so multiple components can coexist.
const _channelEventSubs = new Set<(ev: AipChannelPlayerEvent) => void>()
aip.onChannelEvent((json: string) => {
    try {
        const ev = JSON.parse(json) as AipChannelPlayerEvent
        _channelEventSubs.forEach((cb) => cb(ev))
    } catch { /* ignore malformed */ }
})

const _deviceEventSubs = new Set<(json: string) => void>()
aip.onDeviceEvent((json: string) => {
    _deviceEventSubs.forEach((cb) => cb(json))
})

const polyfill = {
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
        getInterfaces: (): Promise<AipNetworkInterface[]> =>
            aip.getInterfaces(),

        initialize: (networkInterface: string): Promise<void> =>
            aip.initialize(networkInterface),

        shutdown: (): Promise<void> =>
            aip.shutdown(),

        onDeviceEvent: (cb: (json: string) => void): (() => void) => {
            _deviceEventSubs.add(cb)
            return () => { _deviceEventSubs.delete(cb) }
        },

        onChannelEvent: (cb: (event: AipChannelPlayerEvent) => void): (() => void) => {
            _channelEventSubs.add(cb)
            return () => { _channelEventSubs.delete(cb) }
        },

        getDevices: (): Promise<string> =>
            aip.getDevicesJson(),

        getDevice: (mac: string): Promise<string> =>
            aip.getDeviceByMacJson(mac),

        setVolume: (mac: string, volume: number): Promise<void> =>
            aip.setVolume(mac, volume).then(() => undefined),

        stopAudio: (mac: string): Promise<void> =>
            aip.stopAudio(mac),

        createChannel: (config: AipChannelConfig): Promise<number> =>
            aip.createChannel(config),

        destroyChannel: (id: number): Promise<void> =>
            aip.destroyChannel(id),

        getChannel: (id: number): Promise<AipChannelInfo | undefined> =>
            aip.channel(id).then((ch) => ch as AipChannelInfo | null ?? undefined),

        getChannels: (): Promise<AipChannelInfo[]> =>
            aip.channels() as Promise<AipChannelInfo[]>,

        getForeignChannels: (): Promise<AipForeignChannelInfo[]> =>
            aip.foreignChannels() as Promise<AipForeignChannelInfo[]>,

        playChannel:     (id: number): Promise<void> => aip.playChannel(id),
        pauseChannel:    (id: number): Promise<void> => aip.pauseChannel(id),
        stopChannel:     (id: number): Promise<void> => aip.stopChannel(id),
        nextChannel:     (id: number): Promise<void> => aip.nextChannel(id),
        previousChannel: (id: number): Promise<void> => aip.previousChannel(id),

        setChannelVolume: (id: number, volume: number): Promise<void> =>
            aip.setChannelVolume(id, volume),

        linkChannelToDevice: (channelId: number, deviceMac: string): Promise<void> =>
            aip.linkChannelToDevice(channelId, deviceMac),
    },
}

export type BrowserElectronAPI = typeof polyfill

export function installBrowserPolyfill(): void {
    if (typeof (window as { electronAPI?: unknown }).electronAPI === 'undefined') {
        (window as unknown as Record<string, unknown>).electronAPI = polyfill
    }
}
