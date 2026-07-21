import React, { lazy, Suspense, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import App from './App.jsx'
import Checkout from './pages/Checkout.jsx'
import { fbPageView } from './lib/fpixel.js'
import './index.css'

// App de credenciamento (validação na portaria) — carregado sob demanda.
const Credenciamento = lazy(() => import('./credenciamento/CredApp.jsx'))

// Dispara PageView do Meta Pixel a cada troca de rota. O 1º load já é contado
// pelo snippet do index.html, então pulamos a primeira renderização (sem duplicar).
function PixelRouteTracker() {
  const location = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    fbPageView()
  }, [location.pathname])
  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PixelRouteTracker />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/checkout/:slug" element={<Checkout />} />
        <Route
          path="/credenciamento"
          element={
            <Suspense fallback={null}>
              <Credenciamento />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
