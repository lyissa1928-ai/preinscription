import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { FaGraduationCap } from 'react-icons/fa'
import AuthCinematicBackground from '../components/AuthCinematicBackground'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')?.trim()
    if (!token) {
      setStatus('error')
      setMessage('Lien incomplet (token manquant).')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await axios.post('/api/auth/verifier-email', { token })
        if (cancelled) return
        login(data.token, data.utilisateur)
        toast.success(data.message || 'E-mail confirmé.')
        setStatus('ok')
        const role = data.utilisateur?.role
        const dest =
          role === 'admin'
            ? '/admin'
            : role === 'directeur'
              ? '/directeur'
              : role === 'controleur_qualite'
                ? '/qualite'
                : ['responsable', 'agent_admin', 'comptable'].includes(role)
                  ? '/mon-etablissement'
                  : '/dashboard'
        navigate(dest, { replace: true })
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setMessage(err.response?.data?.message || 'Lien invalide ou expiré.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, login, navigate])

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8">
      <AuthCinematicBackground showProgressDots={false} />
      <div className="relative z-10 w-full max-w-lg mx-auto min-h-[50vh] flex items-center justify-center">
        <div className="rounded-3xl border border-white/90 bg-white/95 backdrop-blur-xl p-8 shadow-xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold mb-4">
            <FaGraduationCap /> Confirmation e-mail
          </div>
          {status === 'loading' && <p className="text-slate-700">Validation du lien en cours…</p>}
          {status === 'error' && (
            <>
              <p className="text-red-700 mb-4">{message}</p>
              <Link to="/connexion" className="text-blue-600 font-medium hover:underline">
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
