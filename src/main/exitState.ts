/** Shared flag set by the confirm-exit IPC handler to allow the next close event through. */
export let exitConfirmed = false

export function setExitConfirmed(): void {
  exitConfirmed = true
}
