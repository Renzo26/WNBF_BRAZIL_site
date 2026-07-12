import { useEffect, useState } from 'react'
import Login from './Login'
import Scanner from './Scanner'
import { clearSession, getToken, getUser, setSession } from './lib/store'
import { DEMO_USER, isDemo, setDemo } from './lib/demo'

/* =====================================================================
   CredApp — app de credenciamento (rota /credenciamento).
   Porta de entrada: sem sessão -> Login; com sessão -> Scanner.
   Monitora o estado online/offline para alternar validação em tempo
   real x cache local.
   ===================================================================== */
export default function CredApp() {
  const [user, setUser] = useState(() => (isDemo() ? DEMO_USER : getToken() ? getUser() : null))
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    document.title = 'Credenciamento — WNBF Brasil'
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  const handleLogged = (token, u) => {
    setSession(token, u)
    setUser(u)
  }
  const handleDemo = () => {
    setDemo(true)
    setUser(DEMO_USER)
  }
  const handleLogout = () => {
    setDemo(false)
    clearSession()
    setUser(null)
  }

  if (!user) return <Login onLogged={handleLogged} onDemo={handleDemo} />
  return <Scanner user={user} online={online} onLogout={handleLogout} />
}
