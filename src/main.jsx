import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App.jsx'
import Checkout from './pages/Checkout.jsx'
import './index.css'

// App de credenciamento (validação na portaria) — carregado sob demanda.
const Credenciamento = lazy(() => import('./credenciamento/CredApp.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
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
