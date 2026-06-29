'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AVATAR_OPTIONS } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('⚽')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (username.length < 2) {
      setError('Nome precisa ter pelo menos 2 caracteres')
      setLoading(false)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/bracket` }
    })

    if (authError) {
      setError(authError.message === 'User already registered'
        ? 'E-mail já cadastrado 😅'
        : 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }

    if (data.user) {
      // Atualiza perfil com username e avatar
      await supabase
        .from('profiles')
        .update({ username, avatar_emoji: avatar })
        .eq('id', data.user.id)

      router.push('/onboarding')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen hero-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-2xl font-extrabold text-white">Quarentiners Soccer</h1>
          <p className="text-green-300 text-sm mt-1">Bem-vindo ao bolão!</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5">Criar conta</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu emoji de jogador
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {AVATAR_OPTIONS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setAvatar(em)}
                    className={`text-2xl p-1 rounded-lg transition-all ${
                      avatar === em
                        ? 'bg-green-100 ring-2 ring-green-500 scale-110'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apelido</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                placeholder="Como você quer ser chamado?"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
                😬 {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95"
            >
              {loading ? '⏳ Criando...' : '🎉 Entrar no bolão!'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Já tem conta?{' '}
            <button onClick={() => router.push('/login')} className="text-green-600 font-semibold hover:underline">
              Entrar
            </button>
          </p>
        </div>

        <button onClick={() => router.push('/')} className="text-green-300 text-sm text-center w-full mt-4 hover:text-white">
          ← Voltar
        </button>
      </div>
    </main>
  )
}
