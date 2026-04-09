import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      let parsed
      try {
        parsed = JSON.parse(savedUser)
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        setLoading(false)
        return
      }
      if (!parsed || typeof parsed !== 'object') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        setLoading(false)
        return
      }
      setUser(parsed)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // Rafraîchir depuis la DB — garantit etablissement_id et autres champs à jour
      axios
        .get('/api/auth/me', { timeout: 20000 })
        .then(({ data }) => {
          if (!data || typeof data !== 'object') {
            setLoading(false)
            return
          }
          try {
            const fresh = { ...parsed, ...data }
            localStorage.setItem('user', JSON.stringify(fresh))
            setUser(fresh)
          } catch {
            /* JSON ou fusion impossible — garder la session locale */
            setUser(parsed)
          }
        })
        .catch((err) => {
          const st = err.response?.status
          if (st === 401 || st === 403) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            delete axios.defaults.headers.common['Authorization']
            setUser(null)
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  const logout = async () => {
    const token = localStorage.getItem('token')
    try {
      if (token) {
        await axios.post(
          '/api/auth/deconnexion',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
    } catch {
      /* ignore — déconnexion locale même si l’API échoue */
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const refreshUser = async () => {
    const { data } = await axios.get('/api/auth/me')
    localStorage.setItem('user', JSON.stringify(data))
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
