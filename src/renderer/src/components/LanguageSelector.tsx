/**
 * LanguageSelector — dropdown to switch the application language.
 * Persists the selection to localStorage via saveLanguage().
 */

import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, saveLanguage, type LanguageCode } from '../i18n'

export default function LanguageSelector() {
  const { i18n } = useTranslation('header')

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value as LanguageCode
    saveLanguage(code)
    i18n.changeLanguage(code)
  }

  return (
    <select
      value={i18n.language}
      onChange={handleChange}
      className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
      aria-label="Select language"
    >
      {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
        <option key={code} value={code}>{flag} {label}</option>
      ))}
    </select>
  )
}
