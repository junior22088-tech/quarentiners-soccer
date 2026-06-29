'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const steps = [
  {
    emoji: '📋',
    title: 'Como funciona o bolão',
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          Você vai preencher o <strong className="text-gray-800">chaveamento completo</strong> da Copa do Mundo 2026,
          prevendo quem vai passar em cada jogo, do mata-mata até a grande final! 🏆
        </p>
        <p>
          Como estamos nos <strong>16avos de final</strong>, você prevê todos os jogos
          restantes de agora em diante.
        </p>
        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="font-semibold text-green-800 mb-1">🔑 Regra de ouro:</p>
          <p>Se seu time favorito foi eliminado e você queria que ele fosse mais longe, não tem drama — você pode <strong>atualizar</strong> o palpite antes de cada jogo. Mas vai perder pontos, hein!</p>
        </div>
      </div>
    ),
  },
  {
    emoji: '🎯',
    title: 'Como ganhar pontos',
    content: (
      <div className="space-y-2 text-sm">
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <div className="bg-gray-50 px-3 py-2 grid grid-cols-3 text-xs font-semibold text-gray-500 text-center">
            <span className="text-left">Acerto</span>
            <span>Original</span>
            <span>Atualizado</span>
          </div>
          {[
            ['🎯 Placar exato', '10 pts', '6 pts'],
            ['⚖️ Diferença de gols', '7 pts', '4 pts'],
            ['✅ Só o classificado', '4 pts', '2 pts'],
            ['🟡 Bônus pênaltis', '+2 pts', '+2 pts'],
          ].map(([label, orig, upd]) => (
            <div key={label} className="grid grid-cols-3 px-3 py-2.5 border-t border-gray-100 items-center">
              <span className="text-gray-700 text-xs">{label}</span>
              <span className="text-center font-bold text-blue-600">{orig}</span>
              <span className="text-center font-bold text-green-600">{upd}</span>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs">
          <strong className="text-amber-800">⚡ Multiplicador por fase:</strong>
          <div className="grid grid-cols-5 gap-1 mt-2 text-center">
            {[['16avos','×1'],['Oitavas','×1.5'],['Quartas','×2'],['Semi','×3'],['Final','×4']].map(([f,m]) => (
              <div key={f} className="bg-white rounded-lg p-1.5 border border-amber-100">
                <div className="text-amber-700 font-bold">{m}</div>
                <div className="text-gray-500 text-[10px]">{f}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    emoji: '✏️',
    title: 'Regras de atualização',
    content: (
      <div className="space-y-3 text-sm text-gray-600">
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <p className="font-semibold text-blue-800 mb-1">📌 Preencher = Original (pontos cheios)</p>
          <p>Ao preencher pela primeira vez, você pega os pontos máximos!</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
          <p className="font-semibold text-yellow-800 mb-1">🔄 Mudar antes do jogo = Atualizado (pontos reduzidos)</p>
          <p>Antes de cada jogo começar, você pode trocar o palpite — mas ganha menos pontos.</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <p className="font-semibold text-red-800 mb-1">🔒 Jogo em andamento = Fechado</p>
          <p>Quando o jogo começa, acabou! Sem segundo chance.</p>
        </div>
        <p className="text-center text-green-600 font-semibold">Pronto! Agora vai lá palpitar! 🚀</p>
      </div>
    ),
  },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const finish = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_done: true })
        .eq('id', user.id)
    }
    router.push('/bracket')
  }

  const current = steps[step]

  return (
    <main className="min-h-screen hero-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`step-dot ${i === step ? 'bg-yellow-400 w-6' : i < step ? 'bg-green-400' : 'bg-white/30'}`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="text-center mb-5">
            <div className="text-5xl mb-2">{current.emoji}</div>
            <h2 className="text-xl font-bold text-gray-800">{current.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Passo {step + 1} de {steps.length}</p>
          </div>

          <div className="mb-6">{current.content}</div>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-all"
              >
                ← Voltar
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl transition-all active:scale-95"
              >
                🚀 Preencher meus palpites!
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
