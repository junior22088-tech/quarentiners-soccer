'use client'
import { Match, Team } from '@/types'

type MatchWithTeams = Match & { home_team: Team | null; away_team: Team | null }

export default function UpdateConfirmModal({
  isOpen,
  match,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  match: MatchWithTeams | null
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen || !match) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in scale-95">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">⚠️</div>
          <h3 className="text-xl font-bold text-gray-800">Atualizar palpite?</h3>
        </div>

        <div className="space-y-3 mb-5 text-sm">
          <p className="text-gray-600">
            Você quer atualizar seu palpite para <strong>{match.home_team?.name}</strong> × <strong>{match.away_team?.name}</strong>.
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="font-semibold text-orange-900 text-xs mb-1.5">⚠️ Atenção: Você vai perder pontos!</p>
            <div className="text-orange-800 text-xs space-y-0.5">
              <p>🎯 Placar exato: <span className="line-through">10 pts</span> → <strong>6 pts</strong></p>
              <p>⚖️ Diferença de gols: <span className="line-through">7 pts</span> → <strong>4 pts</strong></p>
              <p>✅ Só o classificado: <span className="line-through">4 pts</span> → <strong>2 pts</strong></p>
              <p className="mt-1">🟡 Bônus pênaltis: <strong>+2 pts</strong> (igual)</p>
            </div>
          </div>

          <p className="text-gray-500 text-xs">
            Isso acontece porque você não está preenchendo pela primeira vez — é uma <strong>atualização</strong>, não o palpite original.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
          >
            Entendi, atualizar mesmo
          </button>
        </div>
      </div>
    </div>
  )
}
