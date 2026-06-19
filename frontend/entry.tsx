import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './src/App'
import './tailwind.css'

const rootElement = document.getElementById('react-upgrade-root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
