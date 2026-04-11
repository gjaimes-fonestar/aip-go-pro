import React from 'react'
import ReactDOM from 'react-dom/client'
import { installBrowserPolyfill } from './browserPolyfill'
import App from './App'
import './i18n'
import './index.css'

installBrowserPolyfill()

// Apply saved theme before first render to avoid a flash
if (localStorage.getItem('aip_theme') === 'dark') {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
