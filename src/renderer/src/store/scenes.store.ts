import { create } from 'zustand'
import type { Scene } from '@shared/scene'

interface ScenesState {
  scenes: Scene[]
  loading: boolean
  modalSceneId: string | null | undefined  // undefined = closed, null = new, string = editing
  setScenes: (scenes: Scene[]) => void
  upsertScene: (scene: Scene) => void
  removeScene: (id: string) => void
  setLoading: (v: boolean) => void
  openModal: (id: string | null) => void
  closeModal: () => void
}

export const useScenesStore = create<ScenesState>((set) => ({
  scenes: [],
  loading: false,
  modalSceneId: undefined,
  setScenes: (scenes) => set({ scenes }),
  upsertScene: (scene) =>
    set((s) => {
      const idx = s.scenes.findIndex((e) => e.id === scene.id)
      const next = [...s.scenes]
      if (idx >= 0) next[idx] = scene
      else next.push(scene)
      return { scenes: next }
    }),
  removeScene: (id) => set((s) => ({ scenes: s.scenes.filter((e) => e.id !== id) })),
  setLoading: (loading) => set({ loading }),
  openModal: (id) => set({ modalSceneId: id }),
  closeModal: () => set({ modalSceneId: undefined }),
}))
