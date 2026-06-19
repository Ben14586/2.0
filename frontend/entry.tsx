import React from 'react'
import ReactDOM from 'react-dom/client'
import { Features } from '../components/blocks/features-10'
import './tailwind.css'

const rootElement = document.getElementById('react-upgrade-root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Features />
    </React.StrictMode>
  )
}
