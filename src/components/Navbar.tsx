'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const nav = [
    { href: '/bracket', label: '⚽ Palpites' },
    { href: '/ranking', label: '🏆 Ranking' },
    ...(profile?.is_admin ? [{ href: '/admin', label: '🔧 Admin' }] : []),
  ]

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <button onClick={() => router.push('/bracket')} className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-gray-800 text-sm leading-tight">
            Quarentiners<br/>
            <span className="text-green-600 font-extrabold">Soccer</span>
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {nav.map(n => (
            <button
              key={n.href}
              onClick={() => router.push(n.href)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === n.href
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>

        {/* User */}
        <div className="flex items-center gap-2">
          {profile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-1.5 transition-colors relative"
            >
              <span className="text-lg">{profile.avatar_emoji}</span>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{profile.username}</span>
              <span className="text-xs text-gray-400">▼</span>

              {menuOpen && (
                <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  {nav.map(n => (
                    <button
                      key={n.href}
                      onClick={() => { router.push(n.href); setMenuOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 md:hidden"
                    >
                      {n.label}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1 md:border-none md:pt-0">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 Sair
                    </button>
                  </div>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 flex">
        {nav.map(n => (
          <button
            key={n.href}
            onClick={() => router.push(n.href)}
            className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-0.5 transition-colors ${
              pathname === n.href ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            <span className="text-lg leading-none">{n.label.split(' ')[0]}</span>
            <span>{n.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
