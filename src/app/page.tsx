'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/bracket')
    })
  }, [])

  return (
    <main className="min-h-screen hero-gradient flex flex-col items-center justify-center px-4 text-white relative">

      {/* Floating balls */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['⚽','🏆','⭐','🔥','🎯'].map((e, i) => (
          <span
            key={i}
            className="absolute text-3xl opacity-10 select-none"
            style={{
              top: `${[15,65,30,80,50][i]}%`,
              left: `${[10,80,55,20,90][i]}%`,
              transform: `rotate(${[15,-20,10,-15,25][i]}deg)`
            }}
          >{e}</span>
        ))}
      </div>

      {/* Logo */}
      <div className="relative z-10 text-center mb-10">
        <div className="text-7xl mb-4">⚽</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
          Quarentiners
          <br />
          <span className="text-yellow-400">Soccer</span>
        </h1>
        <p className="text-green-200 text-lg mt-3">
          Copa do Mundo 2026 🏆
        </p>
        <p className="text-green-300 text-sm mt-1">
          Bolão entre amigos — na base do estudo e do chute!
        </p>
      </div>

      {/* Features */}
      <div className="relative z-10 grid grid-cols-3 gap-3 mb-10 max-w-sm w-full text-center">
        {[
          { emoji: '🎯', label: 'Acerte o placar' },
          { emoji: '⚖️', label: 'Ou a diferença' },
          { emoji: '🟡', label: 'Preveja pênaltis' },
        ].map((f, i) => (
          <div key={i} className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <div className="text-2xl mb-1">{f.emoji}</div>
            <div className="text-xs text-green-100 font-medium">{f.label}</div>
          </div>
        ))}
      </div>

      {/* Auth buttons */}
      <div className="relative z-10 flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => router.push('/register')}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-4 rounded-2xl text-lg transition-all active:scale-95 shadow-lg"
        >
          🚀 Criar conta
        </button>
        <button
          onClick={() => router.push('/login')}
          className="w-full bg-white/15 hover:bg-white/25 text-white font-semibold py-3.5 rounded-2xl text-base transition-all active:scale-95 border border-white/20"
        >
          Já tenho conta → Entrar
        </button>
      </div>

      {/* Fun footer */}
      <p className="relative z-10 mt-8 text-green-400 text-xs text-center opacity-70">
        Sem visto de apostas, sem confusão 😂 <br/>É só entre amigos!
      </p>
    </main>
  )
}
