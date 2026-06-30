'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { PHASE_MULTIPLIERS } from '@/types'

interface AuditEntry {
  id: number
  predicted_home_score: number | null
  predicted_away_score: number | null
  predicted_winner_id: number | null
  predicted_penalties: boolean
  is_updated: boolean
  points_earned: number
  breakdown: string | null
  match: {
    id: number
    phase: string
    match_label: string
    home_score: number
    away_score: number
    went_to_penalties: boolean
    winner_id: number
    is_finished: boolean
    is_locked: boolean
    display_order: number
    home_team: { id: number; name: string; flag: string }
    away_team: { id: number; name: string; flag: string }
    winner: { id: number; name: string; flag: string } | null
  }
}

interface Props {
  userId: string | null
  username: string
  avatarEmoji: string
  onClose: () => void
}

const PHASE_LABEL: Record<string, string> = {
  '16avos': '16avos de Final',
  'oitavas': 'Oitavas',
  'quartas': 'Quartas',
  'semi': 'Semifinal',
  'final': 'Final 🏆',
}

export default function AuditModal({ userId, username, avatarEmoji, onClose }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('predictions')
        .select(`
          id,
          predicted_home_score,
          predicted_away_score,
          predicted_winner_id,
          predicted_penalties,
          is_updated,
          points_earned,
          breakdown,
          match:matches!predictions_match_id_fkey(
            id, phase, match_label, home_score, away_score,
            went_to_penalties, winner_id, is_finished, is_locked, display_order,
            home_team:teams!matches_home_team_id_fkey(id, name, flag),
            away_team:teams!matches_away_team_id_fkey(id, name, flag),
            winner:teams!matches_winner_id_fkey(id, name, flag)
          )
        `)
        .eq('user_id', userId)
        .order('match_id')

      // Filtra apenas jogos encerrados e trancados
      const finished = ((data || []) as unknown as AuditEntry[])
        .filter(e => e.match?.is_finished && e.match?.is_locked)
        .sort((a, b) => a.match.display_order - b.match.display_order)

      setEntries(finished)
      setLoading(false)
    }
    load()
  }, [userId])

  const totalPoints = entries.reduce((s, e) => s + (e.points_earned || 0), 0)
  const correctCount = entries.filter(e => e.points_earned > 0).length

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{avatarEmoji}</span>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">{username}</h2>
              <p className="text-xs text-gray-400">Auditoria de palpites</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Summary bar */}
        {!loading && entries.length > 0 && (
          <div className="flex items-center justify-around px-5 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            <div className="text-center">
              <p className="text-xl font-extrabold text-yellow-500">{totalPoints.toFixed(1)}</p>
              <p className="text-xs text-gray-500">pontos totais</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-xl font-extrabold text-green-600">{correctCount}</p>
              <p className="text-xs text-gray-500">acertos</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-xl font-extrabold text-gray-700">{entries.length}</p>
              <p className="text-xs text-gray-500">jogos vistos</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {loading && (
            <div className="py-12 text-center">
              <div className="text-4xl animate-bounce mb-2">⚽</div>
              <p className="text-gray-400 text-sm">Carregando palpites...</p>
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <p>Nenhum palpite auditável ainda.</p>
              <p className="text-sm mt-1">Só aparece após o admin inserir os resultados.</p>
            </div>
          )}

          {!loading && entries.map(entry => {
            const m = entry.match
            const multiplier = PHASE_MULTIPLIERS[m.phase] || 1
            const pts = entry.points_earned || 0
            const hasPoints = pts > 0
            const exactScore =
              entry.predicted_home_score === m.home_score &&
              entry.predicted_away_score === m.away_score
            const correctWinner = entry.predicted_winner_id === m.winner_id
            const predHome = entry.predicted_home_score
            const predAway = entry.predicted_away_score

            return (
              <div
                key={entry.id}
                className={`rounded-2xl border p-3 ${
                  hasPoints
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-100'
                }`}
              >
                {/* Match info */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    {PHASE_LABEL[m.phase]} · {m.match_label}
                    <span className="text-gray-400 ml-1">×{multiplier}</span>
                  </span>
                  <span className={`text-sm font-extrabold ${hasPoints ? 'text-green-600' : 'text-red-400'}`}>
                    {pts > 0 ? `+${pts.toFixed(1)} pts` : '0 pts'}
                  </span>
                </div>

                {/* Teams + scores */}
                <div className="flex items-center gap-2">
                  {/* Home */}
                  <div className={`flex-1 flex items-center gap-1.5 ${m.winner_id === m.home_team?.id ? 'font-bold' : 'opacity-60'}`}>
                    <span className="text-lg">{m.home_team?.flag}</span>
                    <span className="text-xs text-gray-700 leading-tight">{m.home_team?.name}</span>
                  </div>

                  {/* Resultado real */}
                  <div className="text-center flex-shrink-0">
                    <div className="text-xs text-gray-400 mb-0.5">Resultado</div>
                    <div className="bg-white border border-gray-200 rounded-lg px-2 py-0.5 font-extrabold text-gray-800">
                      {m.home_score} × {m.away_score}
                      {m.went_to_penalties && <span className="text-yellow-500 text-xs ml-1">(pen)</span>}
                    </div>
                  </div>

                  {/* Away */}
                  <div className={`flex-1 flex items-center gap-1.5 justify-end ${m.winner_id === m.away_team?.id ? 'font-bold' : 'opacity-60'}`}>
                    <span className="text-xs text-gray-700 leading-tight text-right">{m.away_team?.name}</span>
                    <span className="text-lg">{m.away_team?.flag}</span>
                  </div>
                </div>

                {/* Aposta do usuário */}
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Apostou:</span>
                    <span className={`text-xs font-semibold ${
                      predHome !== null && predAway !== null
                        ? exactScore ? 'text-green-600' : correctWinner ? 'text-blue-600' : 'text-red-500'
                        : 'text-gray-400'
                    }`}>
                      {predHome !== null && predAway !== null
                        ? `${predHome} × ${predAway}`
                        : '—'
                      }
                    </span>
                    {entry.predicted_penalties && (
                      <span className="text-yellow-600 text-xs">🟡</span>
                    )}
                    {entry.is_updated && (
                      <span className="text-xs text-orange-400 italic">(atualizado)</span>
                    )}
                  </div>

                  {/* Ícone do resultado */}
                  <div className="text-sm">
                    {exactScore ? '🎯' : correctWinner ? '✅' : '❌'}
                  </div>
                </div>

                {/* Breakdown */}
                {entry.breakdown && (
                  <div className="mt-1 text-xs text-gray-400">{entry.breakdown}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
