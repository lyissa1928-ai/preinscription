import axios from 'axios'
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearSession,
} from './tokenStorage'

export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

let refreshPromise = null

/**
 * Session irrécupérable (refresh échoué / absent) : on purge le stockage ET on
 * notifie l'application (AuthContext) pour remettre l'état React à zéro et
 * rediriger vers la connexion. Évite l'UI « connectée » fantôme.
 */
function forceSessionExpiry() {
  clearSession()
  delete axios.defaults.headers.common.Authorization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return null
  const { data } = await axios.post(
    '/api/auth/refresh',
    { refresh_token: refresh },
    { headers: { Authorization: undefined } },
  )
  if (data?.token) {
    setAccessToken(data.token)
    axios.defaults.headers.common.Authorization = `Bearer ${data.token}`
  }
  if (data?.refresh_token) setRefreshToken(data.refresh_token)
  return data?.token || null
}

export function setupAuthInterceptors() {
  axios.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config
      if (!original || original._retry) return Promise.reject(error)

      if (error.response?.status === 403 && error.response?.data?.code === 'MUST_CHANGE_PASSWORD') {
        if (!window.location.pathname.startsWith('/changer-mot-de-passe-obligatoire')) {
          window.location.assign('/changer-mot-de-passe-obligatoire')
        }
        return Promise.reject(error)
      }

      if (error.response?.status !== 401) return Promise.reject(error)
      if (original.url?.includes('/api/auth/connexion')) return Promise.reject(error)
      if (original.url?.includes('/api/auth/refresh')) {
        forceSessionExpiry()
        return Promise.reject(error)
      }

      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        const newToken = await refreshPromise
        if (!newToken) {
          forceSessionExpiry()
          return Promise.reject(error)
        }
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newToken}`
        return axios(original)
      } catch (e) {
        forceSessionExpiry()
        return Promise.reject(e)
      }
    },
  )
}
