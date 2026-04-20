import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './index.css'
import '@xterm/xterm/css/xterm.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element missing from index.html')

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
