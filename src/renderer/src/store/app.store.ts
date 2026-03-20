import { create } from 'zustand'
import type { BackendInfo } from '@shared/ipc'

interface AppState {
  backend: BackendInfo
  sidebarOpen: boolean

  setBackend: (info: BackendInfo) => void
  setSidebarOpen: (open: boolean) => void
  pollBackendStatus: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  backend:     { status: 'stopped', url: null, pid: null },
  sidebarOpen: true,

  setBackend:    (backend) => set({ backend }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  pollBackendStatus: async () => {
    try {
      const info = await window.electronAPI.backend.getInfo()
      set({ backend: info })
    } catch {
      // Main process not reachable yet — ignore
    }
  },
}))
