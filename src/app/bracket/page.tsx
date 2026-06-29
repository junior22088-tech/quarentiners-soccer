'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import UpdateConfirmModal from '@/components/UpdateConfirmModal'
import { createClient } from '@/lib/supabase'
import { formatMatchDate, isMatchPast } from '@/lib/scoring'
import { PHASE_LABELS, PHASE_MULTIPLIERS, type Match, type Team, type Prediction, type Profile } from '@/types'

type MatchWithTeams = Match & {
  home_team: Team | null
  away_team: Team | null
  winner: Team | null
}

type PredEntry = {
  homeScore: string
  awayScore: string
  winnerId: number | null
  penalties: boolean
  savedInDB: boolean   // veio do banco — não muda ao editar
  isUpdated: boolean   // is_updated do banco
}

const PHASES = ['16avos', 'oitavas', 'quartas', 'semi', 'final'] as const

export default function BracketPage() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [preds, setPreds] = useState<Record<number, PredEntry>>({})
  const [activePhase, setActivePhase] = useState<string>('16avos')
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [justSaved, setJustSaved] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(0)
  const [confirmMatch, setConfirmMatch] = useState<MatchWithTeams | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: mts }, { data: prs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), winner:teams!matches_winner_id_fkey(*)')
        .order('display_order'),
      supabase.from('predictions').select('*').eq('user_id', user.id)
    ])

    setMatches((mts as MatchWithTeams[]) || [])

    const pts = ((prs as Prediction[]) || []).reduce((s, p) => s + (p.points_earned || 0), 0)
    setTotalPoints(pts)

    const map: Record<number, PredEntry> = {}

    // Preenche com palpites existentes do banco
    for (const p of (prs as Prediction[]) || []) {
      map[p.match_id] = {
        homeScore: p.predicted_home_score?.toString() ?? '',
        awayScore: p.predicted_away_score?.toString() ?? '',
        winnerId: p.predicted_winner_id,
        penalties: p.predicted_penalties ?? false,
        savedInDB: true,
        isUpdated: p.is_updated ?? false,
      }
    }

    // Inicializa vazios para jogos sem palpite
    for (const m of (mts as MatchWithTeams[]) || []) {
      if (!map[m.id]) {
        map[m.id] = {
          homeScore: '',
          awayScore: '',
          winnerId: null,
          penalties: false,
          savedInDB: false,
          isUpdated: false,
        }
      }
    }

    setPreds(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const updatePred = (matchId: number, field: string, value: unknown) => {
    setPreds(prev => {
      const entry = prev[matchId]
      const updated = { ...entry, [field]: value }

      if (field === 'homeScore' || field === 'awayScore') {
        const hs = field === 'homeScore' ? String(value) : entry.homeScore
        const as_ = field === 'awayScore' ? String(value) : entry.awayScore
        const hNum = parseInt(hs)
        const aNum = parseInt(as_)
        if (!isNaN(hNum) && !isNaN(aNum)) {
          const m = matches.find(x => x.id === matchId)
          if (hNum > aNum) updated.winnerId = m?.home_team_id ?? null
          else if (aNum > hNum) updated.winnerId = m?.away_team_id ?? null
        }
      }
      return { ...prev, [matchId]: updated }
    })
  }

  const doSave = async (match: MatchWithTeams) => {
    const pred = preds[match.id]
    if (!pred) return

    const hScore = parseInt(pred.homeScore)
    const aScore = parseInt(pred.awayScore)

    if (isNaN(hScore) || isNaN(aScore)) { alert('Preencha o placar! ⚽'); return }
    if (!pred.winnerId) { alert('Escolha quem vai passar! 🏆'); return }

    setSaving(s => ({ ...s, [match.id]: true }))
    setConfirmMatch(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: match.id,
      predicted_home_score: hScore,
      predicted_away_score: aScore,
      predicted_winner_id: pred.winnerId,
      predicted_penalties: pred.penalties,
      is_updated: pred.savedInDB, // true se já existia antes
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,match_id' })

    if (!error) {
      setPreds(p => ({
        ...p,
        [match.id]: { ...p[match.id], savedInDB: true, isUpdated: pred.savedInDB }
      }))
      setJustSaved(s => ({ ...s, [match.id]: true }))
      setTimeout(() => setJustSaved(s => ({ ...s, [match.id]: false })), 2500)
    }

    setSaving(s => ({ ...s, [match.id]: false }))
  }

  const handleSaveClick = (match: MatchWithTeams) => {
    const pred = preds[match.id]
    if (!pred) return

    // Se já tem palpite no banco → pede confirmação
    if (pred.savedInDB) {
      setConfirmMatch(match)
    } else {
      doSave(match)
    }
  }

  const phaseMatches = matches.filter(m => m.phase === activePhase)
  const currentPhaseMultiplier = PHASE_MULTIPLIERS[activePhase] || 1

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">⚽</div>
          <p className="text-gray-500">Carregando palpites...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <Navbar />

        {/* Header */}
        <div className="bg-gradient-to-r from-green-800 to-green-700 text-white px-4 py-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-green-300 text-xs font-medium uppercase tracking-wide">Copa do Mundo 2026</p>
              <h1 className="text-xl font-bold mt-0.5">Meus Palpites</h1>
            </div>
            <div className="text-right bg-white/10 rounded-2xl px-4 py-2">
              <p className="text-green-300 text-xs">Total de pontos</p>
              <p className="text-2xl font-extrabold text-yellow-400">{totalPoints.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {PHASES.map(phase => (
              <button
                key={phase}
                onClick={() => setActivePhase(phase)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activePhase === phase
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
                }`}
              >
                {phase === 'final' ? '🏆 Final' : phase === 'semi' ? 'Semifinais' : phase === 'quartas' ? 'Quartas' : phase === 'oitavas' ? 'Oitavas' : '16avos'}
              </button>
            ))}
          </div>

          {/* Multiplier banner */}
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-amber-600 text-lg">⚡</span>
            <span className="text-xs text-amber-700">
              <strong>{PHASE_LABELS[activePhase]}:</strong> ×{currentPhaseMultiplier}
              {currentPhaseMultiplier > 1 && ' — cada ponto vale mais!'}
            </span>
          </div>

          {/* Match list */}
          <div className="mt-4 space-y-3">
            {phaseMatches.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">⏳</div>
                <p>Confrontos ainda não definidos.</p>
              </div>
            )}

            {phaseMatches.map(match => {
              const pred = preds[match.id]
              const isLocked = match.is_locked || isMatchPast(match.scheduled_at)
              const isFinished = match.is_finished
              const noTeams = !match.home_team || !match.away_team
              const isSaving = saving[match.id]
              const isSaved = justSaved[match.id]
              const hasPredInDB = pred?.savedInDB ?? false

              return (
                <div
                  key={match.id}
                  className={`bg-white rounded-2xl shadow-sm border match-card overflow-hidden ${
                    isFinished ? 'border-gray-100' : isLocked ? 'border-orange-100' : 'border-gray-100'
                  }`}
                >
                  {/* Match header */}
                  <div className={`px-4 py-2 flex items-center justify-between ${
                    isFinished ? 'bg-gray-50' : isLocked ? 'bg-orange-50' : 'bg-green-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{match.match_label}</span>
                      {match.location && <span className="text-xs text-gray-400">· {match.location}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {isFinished ? (
                        <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-medium">🔒 Encerrado</span>
                      ) : isLocked ? (
                        <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 font-medium">⏳ Aguardando resultado</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">✏️ Aberto</span>
                      )}
                      <span className="text-xs text-gray-400">{formatMatchDate(match.scheduled_at)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {noTeams ? (
                      <div className="text-center py-4 text-gray-400">
                        <span className="text-2xl">🔮</span>
                        <p className="text-sm mt-1">A ser definido...</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          {/* Home team */}
                          <button
                            onClick={() => !isLocked && !isFinished && updatePred(match.id, 'winnerId', match.home_team_id)}
                            disabled={isLocked || isFinished}
                            className={`flex-1 text-center rounded-xl p-2 transition-all ${
                              pred?.winnerId === match.home_team_id
                                ? 'bg-green-50 ring-2 ring-green-500'
                                : isFinished && match.winner_id === match.home_team_id
                                ? 'bg-green-50 ring-2 ring-green-500'
                                : 'hover:bg-gray-50'
                            } ${isLocked || isFinished ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className="text-2xl">{match.home_team?.flag}</div>
                            <div className="text-xs font-semibold text-gray-700 mt-1 leading-tight">{match.home_team?.name}</div>
                            {isFinished && match.winner_id === match.home_team_id && (
                              <div className="text-xs text-green-600 font-bold mt-0.5">✓ Passou</div>
                            )}
                          </button>

                          {/* Scores */}
                          <div className="flex items-center gap-2">
                            {isFinished ? (
                              <div className="flex items-center gap-2">
                                <div className="text-2xl font-extrabold text-gray-800">{match.home_score}</div>
                                <div className="text-gray-300 font-light text-lg">×</div>
                                <div className="text-2xl font-extrabold text-gray-800">{match.away_score}</div>
                              </div>
                            ) : isLocked ? (
                              <div className="flex items-center gap-1">
                                <div className="score-input bg-gray-50 text-gray-400 flex items-center justify-center text-xl font-bold rounded-xl border-2 border-gray-200">
                                  {pred?.homeScore || '?'}
                                </div>
                                <span className="text-gray-300 text-sm">×</span>
                                <div className="score-input bg-gray-50 text-gray-400 flex items-center justify-center text-xl font-bold rounded-xl border-2 border-gray-200">
                                  {pred?.awayScore || '?'}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={pred?.homeScore ?? ''}
                                  onChange={e => updatePred(match.id, 'homeScore', e.target.value)}
                                  className="score-input"
                                  placeholder="0"
                                />
                                <span className="text-gray-300 text-sm">×</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={pred?.awayScore ?? ''}
                                  onChange={e => updatePred(match.id, 'awayScore', e.target.value)}
                                  className="score-input"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>

                          {/* Away team */}
                          <button
                            onClick={() => !isLocked && !isFinished && updatePred(match.id, 'winnerId', match.away_team_id)}
                            disabled={isLocked || isFinished}
                            className={`flex-1 text-center rounded-xl p-2 transition-all ${
                              pred?.winnerId === match.away_team_id
                                ? 'bg-green-50 ring-2 ring-green-500'
                                : isFinished && match.winner_id === match.away_team_id
                                ? 'bg-green-50 ring-2 ring-green-500'
                                : 'hover:bg-gray-50'
                            } ${isLocked || isFinished ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <div className="text-2xl">{match.away_team?.flag}</div>
                            <div className="text-xs font-semibold text-gray-700 mt-1 leading-tight">{match.away_team?.name}</div>
                            {isFinished && match.winner_id === match.away_team_id && (
                              <div className="text-xs text-green-600 font-bold mt-0.5">✓ Passou</div>
                            )}
                          </button>
                        </div>

                        {/* Penalties toggle */}
                        {!isFinished && !isLocked && (
                          <div className="mt-3 flex justify-center">
                            <button
                              onClick={() => updatePred(match.id, 'penalties', !pred?.penalties)}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                                pred?.penalties
                                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 font-semibold'
                                  : 'border-gray-200 text-gray-500 hover:border-yellow-300'
                              }`}
                            >
                              🟡 {pred?.penalties ? 'Vai a pênaltis! (+2)' : 'Vai a pênaltis?'}
                            </button>
                          </div>
                        )}

                        {/* Penalties result */}
                        {isFinished && match.went_to_penalties && (
                          <div className="mt-2 text-center text-xs text-yellow-600 bg-yellow-50 rounded-lg py-1.5">
                            🟡 Foi a pênaltis! {match.winner?.name} avançou
                          </div>
                        )}

                        {/* Save button */}
                        {!isFinished && !isLocked && (
                          <div className="mt-3">
                            {hasPredInDB && (
                              <p className="text-center text-xs text-orange-500 mb-1.5">
                                🔄 Você já tem um palpite salvo para este jogo
                              </p>
                            )}
                            <button
                              onClick={() => handleSaveClick(match)}
                              disabled={isSaving || isSaved}
                              className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-95 ${
                                isSaved
                                  ? 'bg-green-100 text-green-700'
                                  : hasPredInDB
                                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {isSaved ? '✅ Salvo!' : isSaving ? '⏳...' : hasPredInDB ? '🔄 Atualizar palpite' : '💾 Salvar palpite'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal de confirmação — DENTRO do return, fora das divs de conteúdo */}
      <UpdateConfirmModal
        isOpen={confirmMatch !== null}
        match={confirmMatch}
        onConfirm={() => confirmMatch && doSave(confirmMatch)}
        onCancel={() => setConfirmMatch(null)}
      />
    </>
  )
}
