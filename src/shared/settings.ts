/**
 * AppSettings — shared between main process and renderer.
 * Mirrors the AppSettings entity in aip-database.
 */

export type NetworkNameMode = 'default' | 'personalized'

export interface AppSettings {
  minimizeToTray:                   boolean
  minimizeOnClose:                  boolean
  bootOnStartup:                    boolean
  language:                         string
  networkNameMode:                  NetworkNameMode
  networkName:                      string | null
  securityEnabled:                  boolean
  securityPassword:                 string | null
  securityAskOnStart:               boolean
  securityAskOnExit:                boolean
  securityAllowVoiceWithoutPassword: boolean
}

export type UpdateAppSettings = Partial<AppSettings>
