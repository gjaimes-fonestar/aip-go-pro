/**
 * @module aip-go-pro/main/schedulerManager
 * @brief Manages the aip-database connection and SchedulerCore lifecycle.
 *
 * Single responsibility: own the DB + scheduler, dispatch AIP actions when
 * a scheduled message fires, and push the CALENDAR.FIRED event to all
 * renderer windows.
 *
 * Usage:
 *   // app startup
 *   await schedulerManager.start()
 *
 *   // after any calendar CRUD mutation
 *   await schedulerManager.reload()
 *
 *   // app shutdown
 *   schedulerManager.stop()
 */

import { join, dirname } from 'path'
import { app, BrowserWindow } from 'electron'
import {
  initialize,
  disconnect,
  type AipDatabaseServices,
  type ScheduledMessage,
  type Scene,
  type SceneStep,
} from 'aip-database'
import { SchedulerCore, type SchedulerEvent } from 'aip-scheduler'
import { IPC }           from '../shared/ipc'
import type { AipDeviceJson } from '../shared/ipc'
import { aipChannels, aipDevices } from './aip'

// ---------------------------------------------------------------------------
// SchedulerManager
// ---------------------------------------------------------------------------

class SchedulerManager {
  private _db:        AipDatabaseServices | null = null
  private _scheduler: SchedulerCore | null = null

  // ── Public API ────────────────────────────────────────────────────────────

  /** Access the database services. Throws if start() has not been called yet. */
  get db(): AipDatabaseServices {
    if (!this._db) throw new Error('[schedulerManager] not initialized — call start() first')
    return this._db
  }

  /**
   * Opens the database (applying any pending migrations), then starts the
   * sliding-window scheduler. Idempotent — subsequent calls are no-ops.
   */
  async start(): Promise<void> {
    if (this._db) return

    const dbPath = join(
      app.getPath('userData'),
      app.isPackaged ? 'aip-go-pro.db' : 'aip-go-pro-dev.db',
    )

    // Locate the prisma/migrations folder bundled with aip-database.
    // require.resolve('aip-database') returns dist/index.js; one dirname()
    // step up reaches the package root where prisma/migrations lives.
    // Works with pnpm symlinks in dev and inside the packaged app.
    const migrationsDir = join(
      dirname(require.resolve('aip-database')),
      '..',
      'prisma',
      'migrations',
    )

    console.log('[schedulerManager] opening database:', dbPath)
    this._db = await initialize({ url: dbPath }, migrationsDir)

    this._scheduler = new SchedulerCore({
      messages:   this._db.messages,
      onFire:     (event: SchedulerEvent) => void this._onFire(event),
      onError:    (err: unknown)          => console.error('[schedulerManager]', err),
    })

    await this._scheduler.start()
    console.log('[schedulerManager] started')
  }

  /**
   * Stops the scheduler and closes the database connection.
   * Idempotent — safe to call multiple times or before start().
   */
  stop(): void {
    this._scheduler?.stop()
    this._scheduler = null
    void disconnect().catch((err: unknown) => console.error('[schedulerManager] disconnect', err))
    this._db = null
    console.log('[schedulerManager] stopped')
  }

  /**
   * Re-reads enabled messages from the database and rebuilds the timer queue.
   * Must be called after every calendar event CRUD mutation so the scheduler
   * picks up changes without waiting for the next automatic window reload.
   */
  async reload(): Promise<void> {
    await this._scheduler?.reload()
  }

  /**
   * Manually fires a calendar event by id (IPC CALENDAR.TRIGGER handler).
   * Dispatches the AIP action immediately and pushes CALENDAR.FIRED to all renderers.
   */
  async triggerNow(id: string): Promise<{ fired: boolean; event?: ScheduledMessage }> {
    if (!this._db) return { fired: false }

    const msg = await this._db.messages.get(id).catch(() => null)
    if (!msg) return { fired: false }

    const firedAt = new Date().toISOString()
    this._pushFiredEvent(msg.id, firedAt)

    try {
      await this._dispatchAction(msg)
    } catch (err) {
      console.error('[schedulerManager] triggerNow dispatch failed', err)
    }

    return { fired: true, event: msg }
  }

  /**
   * Executes a scene by id against all currently connected devices.
   * Used by the IPC SCENE.TRIGGER handler.
   */
  async triggerScene(id: string): Promise<{ fired: boolean }> {
    if (!this._db) return { fired: false }

    const scene = await this._db.scenes.get(id).catch(() => null)
    if (!scene) return { fired: false }

    const allMacs = await this._allDeviceMacs()
    await this._dispatchScene(scene, allMacs)
    return { fired: true }
  }

  // ── Scheduler callback ────────────────────────────────────────────────────

  private async _onFire(event: SchedulerEvent): Promise<void> {
    const { message, firedAt } = event
    console.log('[schedulerManager] FIRED', message.id, `"${message.title}"`, firedAt)

    this._pushFiredEvent(message.id, firedAt)

    try {
      await this._dispatchAction(message)
    } catch (err) {
      console.error('[schedulerManager] action dispatch failed', err)
    }
  }

  private _pushFiredEvent(id: string, firedAt: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.CALENDAR.FIRED, id, firedAt)
    }
  }

  // ── Action dispatch ───────────────────────────────────────────────────────

  private async _dispatchAction(msg: ScheduledMessage): Promise<void> {
    const { action, targetDevices, volume } = msg

    if (action.type === 'scene') {
      if (!this._db) return
      const scene = await this._db.scenes.get(action.sceneId).catch(() => null)
      if (!scene) {
        console.warn('[schedulerManager] scene not found:', action.sceneId)
        return
      }
      const allMacs = await this._allDeviceMacs()
      await this._dispatchScene(scene, allMacs)
      return
    }

    const urls =
      action.type === 'file'     ? [action.filePath]
    : action.type === 'playlist' ? action.filePaths
    : action.type === 'online'   ? [action.streamUrl]
    : []

    if (urls.length === 0) return

    const devices = targetDevices.length > 0 ? targetDevices : await this._allDeviceMacs()

    let channelId: number
    try {
      channelId = await aipChannels.createChannel({
        name:    msg.title,
        urls,
        loop:    false,
        shuffle: false,
      })
    } catch (err) {
      console.error('[schedulerManager] createChannel failed', err)
      return
    }

    if (volume !== undefined) {
      await aipChannels.setChannelVolume(channelId, volume).catch(
        (err: unknown) => console.error('[schedulerManager] setChannelVolume', err),
      )
    }

    for (const mac of devices) {
      await aipChannels.linkChannelToDevice(channelId, mac).catch(
        (err: unknown) => console.error('[schedulerManager] linkChannelToDevice', mac, err),
      )
    }

    await aipChannels.playChannel(channelId).catch(
      (err: unknown) => console.error('[schedulerManager] playChannel', err),
    )

    // Auto-stop at dtEnd if present.
    if (msg.dtEnd) {
      const delay = new Date(msg.dtEnd).getTime() - Date.now()
      if (delay > 0) {
        setTimeout(
          () => void aipChannels.destroyChannel(channelId).catch(() => undefined),
          delay,
        )
      }
    }
  }

  // ── Scene execution ───────────────────────────────────────────────────────

  private async _dispatchScene(scene: Scene, allMacs: string[]): Promise<void> {
    console.log('[schedulerManager] scene:', scene.name, scene.steps.length, 'step(s)')
    // Steps are designed to fire simultaneously.
    await Promise.allSettled(scene.steps.map((step) => this._dispatchStep(step, allMacs)))
  }

  private async _dispatchStep(step: SceneStep, allMacs: string[]): Promise<void> {
    const macs   = step.targetDevice === 'all' ? allMacs : [step.targetDevice]
    const action = step.action

    switch (action.type) {
      case 'stop':
        await Promise.allSettled(macs.map((mac) => aipDevices.stopAudio(mac)))
        break

      case 'set_volume':
        await Promise.allSettled(macs.map((mac) => aipDevices.setVolume(mac, action.value)))
        break

      case 'play_file': {
        let ch: number
        try {
          ch = await aipChannels.createChannel({ name: action.fileName ?? step.id, urls: [action.filePath], loop: false, shuffle: false })
        } catch { break }
        for (const mac of macs) {
          await aipChannels.linkChannelToDevice(ch, mac).catch(() => undefined)
        }
        await aipChannels.playChannel(ch).catch(() => undefined)
        if (action.durationSecs) {
          setTimeout(() => void aipChannels.destroyChannel(ch).catch(() => undefined), action.durationSecs * 1_000)
        }
        break
      }

      case 'play_stream': {
        let ch: number
        try {
          ch = await aipChannels.createChannel({ name: action.streamName ?? step.id, urls: [action.url], loop: false, shuffle: false })
        } catch { break }
        for (const mac of macs) {
          await aipChannels.linkChannelToDevice(ch, mac).catch(() => undefined)
        }
        await aipChannels.playChannel(ch).catch(() => undefined)
        if (action.durationSecs) {
          setTimeout(() => void aipChannels.destroyChannel(ch).catch(() => undefined), action.durationSecs * 1_000)
        }
        break
      }

      case 'fade_in':
        // Approximate: set target volume immediately (no hardware ramp support yet).
        await Promise.allSettled(macs.map((mac) => aipDevices.setVolume(mac, action.targetVolume)))
        break

      case 'fade_out':
        // Approximate: lower volume to 0, wait the specified duration, then stop.
        await Promise.allSettled(macs.map((mac) => aipDevices.setVolume(mac, 0)))
        await new Promise<void>((r) => setTimeout(r, action.durationSecs * 1_000))
        await Promise.allSettled(macs.map((mac) => aipDevices.stopAudio(mac)))
        break
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async _allDeviceMacs(): Promise<string[]> {
    try {
      const json = await aipDevices.getDevicesJson()
      const devs = JSON.parse(json) as AipDeviceJson[]
      return devs.map((d) => d.mac)
    } catch {
      return []
    }
  }
}

export const schedulerManager = new SchedulerManager()
