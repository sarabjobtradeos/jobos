'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleLogin() {
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-400 mb-4">
            <span className="text-white text-2xl font-bold">J</span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">JobOS</h1>
          <p className="text-gray-400 text-sm mt-1">Your automated job search OS</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          {!sent ? (
            <>
              <h2 className="text-white font-medium mb-1">Sign in</h2>
              <p className="text-gray-400 text-sm mb-5">We'll send you a magic link — no password needed.</p>
              <div className="mb-4">
                <label className="label text-gray-400">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@example.com"
                  className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-brand-400"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading || !email}
                className="btn-brand w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <h2 className="text-white font-medium mb-2">Check your email</h2>
              <p className="text-gray-400 text-sm">
                Magic link sent to <span className="text-brand-400">{email}</span>. 
                Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-300"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Personal use only · Your data stays yours
        </p>
      </div>
    </div>
  )
}
