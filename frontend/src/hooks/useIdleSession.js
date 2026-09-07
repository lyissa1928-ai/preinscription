import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

/** Déconnexion après inactivité (pas de navigation / interaction). Défaut 30 min. */
const IDLE_MS = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS) || 30 * 60 * 1000
const EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']

/**
 * Surveille l’inactivité et appelle onIdle (logout) après IDLE_MS.
 */
export function useIdleSession(enabled, onIdle) {
  const timer = useRef(null)
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return undefined

    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        toast.error('Session fermée pour inactivité.')
        onIdleRef.current?.()
      }, IDLE_MS)
    }

    reset()
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      if (timer.current) clearTimeout(timer.current)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [enabled])
}
