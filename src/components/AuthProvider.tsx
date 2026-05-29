'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile } = useStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else if (pathname !== '/login' && pathname !== '/') {
        router.push('/login')
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
        if (pathname === '/login') router.push('/dashboard')
      } else {
        setUser(null)
        setProfile(null)
        if (pathname !== '/login' && pathname !== '/') router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }

  return <>{children}</>
}
