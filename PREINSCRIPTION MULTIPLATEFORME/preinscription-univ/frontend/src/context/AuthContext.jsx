import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import {
  getAccessToken,
  getRefreshToken,
  getStoredUserJson,
  setSession,
  clearSession,
} from '../lib/tokenStorage'
import { SESSION_EXPIRED_EVENT } from '../lib/setupAuthInterceptors'
import { applyEtabTheme, clearEtabTheme, getUserBrandColor } from '../utils/etabTheme'
import { stripAppBasePath, withAppBase } from '../utils/appBasePath'

const AuthContext = createContext(null)

/** Chemins publics : ne pas rediriger vers /connexion si la session expire ici. */
const PUBLIC_PATH_PREFIXES = [
  '/connexion',
  '/inscription',
  '/accueil',
  '/etablissement',
  '/facture-publique',
  '/demande-proforma',
  '/guide-conditions-admission',
  '/mot-de-passe-oublie',
  '/reinitialiser-mot-de-passe',
  '/verifier-email',
]

function isPublicPath(pathname) {
  const p = stripAppBasePath(pathname)
  if (p === '/') return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Session déclarée expirée par l'intercepteur (refresh échoué) : purge l'état
  // React et renvoie vers la connexion si on est sur une page protégée.
  useEffect(() => {
    const handleExpiry = () => {
      setUser(null)
      clearEtabTheme()
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(withAppBase(`/connexion?next=${next}`))
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiry)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiry)
  }, [])

  // Identité visuelle : couleur de l'établissement de l'utilisateur connecté.
  useEffect(() => {
    const color = getUserBrandColor(user)
    const secondary = user?.etablissement?.couleur_secondaire || null
    if (color) applyEtabTheme(color, secondary)
    else clearEtabTheme()
  }, [user])

  useEffect(() => {
    const token = getAccessToken()
    const savedUser = getStoredUserJson()
    if (token && savedUser) {
      let parsed
      try {
        parsed = JSON.parse(savedUser)
      } catch {
        clearSession()
        delete axios.defaults.headers.common['Authorization']
        setLoading(false)
        return
      }
      if (!parsed || typeof parsed !== 'object') {
        clearSession()
        delete axios.defaults.headers.common['Authorization']
        setLoading(false)
        return
      }
      setUser(parsed)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      axios
        .get('/api/auth/me', { timeout: 20000 })
        .then(({ data }) => {
          if (!data || typeof data !== 'object') {
            setLoading(false)
            return
          }
          try {
            const fresh = { ...parsed, ...data }
            setSession({ user: fresh })
            setUser(fresh)
          } catch {
            setUser(parsed)
          }
        })
        .catch((err) => {
          const st = err.response?.status
          if (st === 401 || st === 403) {
            clearSession()
            delete axios.defaults.headers.common['Authorization']
            setUser(null)
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (token, userData, refreshToken) => {
    setSession({
      accessToken: token,
      refreshToken: refreshToken ?? getRefreshToken(),
      user: userData,
    })
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  const logout = async () => {
    const token = getAccessToken()
    const refresh = getRefreshToken()
    try {
      if (token) {
        await axios.post(
          '/api/auth/deconnexion',
          refresh ? { refresh_token: refresh } : {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
      }
    } catch {
      /* ignore */
    }
    clearSession()
    delete axios.defaults.headers.common['Authorization']
    clearEtabTheme()
    setUser(null)
  }

  const refreshUser = async () => {
    const { data } = await axios.get('/api/auth/me')
    setSession({ user: data })
    setUser(data)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (ctx == null) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.')
  }
  return ctx
}
