import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/screens.css'
import { initTelegram } from './lib/telegram.js'
import App from './App.jsx'

initTelegram()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
