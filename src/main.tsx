import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startSessionTimeout } from './sessionTimeout'
import './styles.css'

startSessionTimeout()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
