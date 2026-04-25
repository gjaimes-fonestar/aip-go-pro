import { create } from 'zustand'

export interface Toast {
  id:      string
  message: string
  kind:    'success' | 'error'
}

interface ToastState {
  toasts:  Toast[]
  push:    (message: string, kind: Toast['kind']) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (message, kind) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4500)
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
