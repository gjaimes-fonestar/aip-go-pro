import React from 'react'
import ReactDOM from 'react-dom/client'
import { installBrowserPolyfill } from './browserPolyfill'
import App from './App'
import './i18n'
import './index.css'

installBrowserPolyfill()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
