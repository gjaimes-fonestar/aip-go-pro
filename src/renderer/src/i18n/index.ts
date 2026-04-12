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
    en: { common: en_common, nav: en_nav, header: en_header, dashboard: en_dashboard, devices: en_devices, channels: en_channels, webserver: en_webserver, deviceConfig: en_deviceConfig, calendar: en_calendar },
    es: { common: es_common, nav: es_nav, header: es_header, dashboard: es_dashboard, devices: es_devices, channels: es_channels, webserver: es_webserver, deviceConfig: es_deviceConfig, calendar: es_calendar },
    pt: { common: pt_common, nav: pt_nav, header: pt_header, dashboard: pt_dashboard, devices: pt_devices, channels: pt_channels, webserver: pt_webserver, deviceConfig: pt_deviceConfig, calendar: pt_calendar },
    zh: { common: zh_common, nav: zh_nav, header: zh_header, dashboard: zh_dashboard, devices: zh_devices, channels: zh_channels, webserver: zh_webserver, deviceConfig: zh_deviceConfig, calendar: zh_calendar },
    vi: { common: vi_common, nav: vi_nav, header: vi_header, dashboard: vi_dashboard, devices: vi_devices, channels: vi_channels, webserver: vi_webserver, deviceConfig: vi_deviceConfig, calendar: vi_calendar },
  },
  lng:          getSavedLanguage(),
  fallbackLng:  'en',
  defaultNS:    'common',
  interpolation: { escapeValue: false },
})

export default i18n
