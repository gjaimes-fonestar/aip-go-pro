/**
 * i18n configuration.
 * Supported languages: English (default), Spanish, Portuguese, Chinese (Simplified), Vietnamese.
 * Language preference is persisted in localStorage under the key "aip_language".
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// English
import en_common       from './locales/en/common.json'
import en_nav          from './locales/en/nav.json'
import en_header       from './locales/en/header.json'
import en_dashboard    from './locales/en/dashboard.json'
import en_devices      from './locales/en/devices.json'
import en_channels     from './locales/en/channels.json'
import en_webserver    from './locales/en/webserver.json'
import en_deviceConfig from './locales/en/deviceConfig.json'
import en_calendar     from './locales/en/calendar.json'
import en_scene        from './locales/en/scene.json'
import en_messages     from './locales/en/messages.json'
import en_events       from './locales/en/events.json'
import en_streams      from './locales/en/streams.json'

// Spanish
import es_common       from './locales/es/common.json'
import es_nav          from './locales/es/nav.json'
import es_header       from './locales/es/header.json'
import es_dashboard    from './locales/es/dashboard.json'
import es_devices      from './locales/es/devices.json'
import es_channels     from './locales/es/channels.json'
import es_webserver    from './locales/es/webserver.json'
import es_deviceConfig from './locales/es/deviceConfig.json'
import es_calendar     from './locales/es/calendar.json'
import es_scene        from './locales/es/scene.json'
import es_messages     from './locales/es/messages.json'
import es_events       from './locales/es/events.json'
import es_streams      from './locales/es/streams.json'

// Portuguese
import pt_common       from './locales/pt/common.json'
import pt_nav          from './locales/pt/nav.json'
import pt_header       from './locales/pt/header.json'
import pt_dashboard    from './locales/pt/dashboard.json'
import pt_devices      from './locales/pt/devices.json'
import pt_channels     from './locales/pt/channels.json'
import pt_webserver    from './locales/pt/webserver.json'
import pt_deviceConfig from './locales/pt/deviceConfig.json'
import pt_calendar     from './locales/pt/calendar.json'
import pt_scene        from './locales/pt/scene.json'
import pt_messages     from './locales/pt/messages.json'
import pt_events       from './locales/pt/events.json'
import pt_streams      from './locales/pt/streams.json'

// Chinese (Simplified)
import zh_common       from './locales/zh/common.json'
import zh_nav          from './locales/zh/nav.json'
import zh_header       from './locales/zh/header.json'
import zh_dashboard    from './locales/zh/dashboard.json'
import zh_devices      from './locales/zh/devices.json'
import zh_channels     from './locales/zh/channels.json'
import zh_webserver    from './locales/zh/webserver.json'
import zh_deviceConfig from './locales/zh/deviceConfig.json'
import zh_calendar     from './locales/zh/calendar.json'
import zh_scene        from './locales/zh/scene.json'
import zh_messages     from './locales/zh/messages.json'
import zh_events       from './locales/zh/events.json'
import zh_streams      from './locales/zh/streams.json'

// Vietnamese
import vi_common       from './locales/vi/common.json'
import vi_nav          from './locales/vi/nav.json'
import vi_header       from './locales/vi/header.json'
import vi_dashboard    from './locales/vi/dashboard.json'
import vi_devices      from './locales/vi/devices.json'
import vi_channels     from './locales/vi/channels.json'
import vi_webserver    from './locales/vi/webserver.json'
import vi_deviceConfig from './locales/vi/deviceConfig.json'
import vi_calendar     from './locales/vi/calendar.json'
import vi_scene        from './locales/vi/scene.json'
import vi_messages     from './locales/vi/messages.json'
import vi_events       from './locales/vi/events.json'
import vi_streams      from './locales/vi/streams.json'

/** All supported language options shown in the language selector. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

const STORAGE_KEY = 'aip_language'

/** Returns the persisted language code, falling back to English. */
export function getSavedLanguage(): LanguageCode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
    return saved as LanguageCode
  }
  return 'en'
}

/** Persists the selected language code to localStorage. */
export function saveLanguage(code: LanguageCode): void {
  localStorage.setItem(STORAGE_KEY, code)
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en_common, nav: en_nav, header: en_header, dashboard: en_dashboard, devices: en_devices, channels: en_channels, webserver: en_webserver, deviceConfig: en_deviceConfig, calendar: en_calendar, scene: en_scene, messages: en_messages, events: en_events, streams: en_streams },
    es: { common: es_common, nav: es_nav, header: es_header, dashboard: es_dashboard, devices: es_devices, channels: es_channels, webserver: es_webserver, deviceConfig: es_deviceConfig, calendar: es_calendar, scene: es_scene, messages: es_messages, events: es_events, streams: es_streams },
    pt: { common: pt_common, nav: pt_nav, header: pt_header, dashboard: pt_dashboard, devices: pt_devices, channels: pt_channels, webserver: pt_webserver, deviceConfig: pt_deviceConfig, calendar: pt_calendar, scene: pt_scene, messages: pt_messages, events: pt_events, streams: pt_streams },
    zh: { common: zh_common, nav: zh_nav, header: zh_header, dashboard: zh_dashboard, devices: zh_devices, channels: zh_channels, webserver: zh_webserver, deviceConfig: zh_deviceConfig, calendar: zh_calendar, scene: zh_scene, messages: zh_messages, events: zh_events, streams: zh_streams },
    vi: { common: vi_common, nav: vi_nav, header: vi_header, dashboard: vi_dashboard, devices: vi_devices, channels: vi_channels, webserver: vi_webserver, deviceConfig: vi_deviceConfig, calendar: vi_calendar, scene: vi_scene, messages: vi_messages, events: vi_events, streams: vi_streams },
  },
  lng:          getSavedLanguage(),
  fallbackLng:  'en',
  defaultNS:    'common',
  interpolation: { escapeValue: false },
})

export default i18n
