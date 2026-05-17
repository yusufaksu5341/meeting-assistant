import { createClient } from '@supabase/supabase-js'
import { useAppStore } from '../store/useAppStore.js'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const supabase = createClient(
  import.meta.env['VITE_SUPABASE_URL'] as string,
  import.meta.env['VITE_SUPABASE_ANON_KEY'] as string,
)

export function Login() {
  const setUser = useAppStore((s) => s.setUser)
  const user = useAppStore((s) => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.['full_name'] as string | undefined,
        })
        navigate('/', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [setUser, navigate])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
        <div className="text-5xl mb-4">🤖</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Toplantı Asistanı</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Toplantılarınızı otomatik kaydet, özetle ve paylaş
        </p>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Google ile Giriş Yap
        </button>
      </div>
    </div>
  )
}
