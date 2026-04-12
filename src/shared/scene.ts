/**
 * Scene data model — shared between main process and renderer.
 * A Scene is a named preset that fires a set of device actions simultaneously.
 * Scenes are referenced from calendar events (action.type = 'scene').
 */

/** What a single step does on its target device. */
export type SceneStepAction =
  | { type: 'play_file';   filePath: string; fileName?: string; durationSecs?: number }
  | { type: 'play_stream'; url: string; streamName?: string; durationSecs?: number }
  | { type: 'stop' }
  | { type: 'set_volume';  value: number }
  | { type: 'fade_in';     targetVolume: number; durationSecs: number }
  | { type: 'fade_out';    durationSecs: number }

/** One action targeting one device (or all devices). */
export interface SceneStep {
  id: string
  /** MAC address of the target device, or 'all' to target every connected device. */
  targetDevice: 'all' | string
  action: SceneStepAction
}

/** A named, reusable preset composed of one or more steps. */
export interface Scene {
  id: string
  name: string
  description?: string
  /** All steps execute simultaneously when the scene is activated. */
  steps: SceneStep[]
  createdAt: string
  updatedAt: string
}

export type SceneId = string

export interface SceneCreatePayload {
  scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>
}

export interface SceneUpdatePayload {
  id: SceneId
  changes: Partial<Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>>
}
