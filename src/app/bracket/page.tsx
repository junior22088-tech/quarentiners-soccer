'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase'
import { formatMatchDate, isMatchPast } from '@/lib/scoring'
import { PHASE_LABELS, PHASE_MULTIPLIERS, type Match, type Team, type Prediction, type Profile } from '@/types'

type MatchWithTeams = Match & {
  home_team: Team | null
  away_team: Team | null
  winner: Team | null
}

type PredictionMap = Record<number, {
  homeScore: string
  awayScore: string
  winnerId: number | null
  penalties: boolean
  isUpdated: boolean
  saved: boolean
}>

const PHASES = ['16avos', 'oitavas', 'quartas', 'semi', 'final'] as const

export default function BracketPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [preds, setPreds] = useState<PredictionMap>({})
  const [activePhase, setActivePhase] = useState<string>('16avos')
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(0)
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

    setProfile(prof)
    setMatches((mts as MatchWithTeams[]) || [])

    // Total points
    const pts = (prs || []).reduce((s: number, p: Prediction) => s + (p.points_earned || 0), 0)
    setTotalPoints(pts)

    // Build prediction map
    const map: PredictionMap = {}
    for (const p of (prs as Prediction[]) || []) {
      const m = (mts as MatchWithTeams[])?.find(x => x.id === p.match_id)
      const hasExisting = !!map[p.match_id]
      if (!hasExisting) {
        map[p.match_id] = {
          homeScore: p.predicted_home_score?.toString() ?? '',
          awayScore: p.predicted_away_score?.toString() ?? '',
          winnerId: p.predicted_winner_id,
          penalties: p.predicted_penalties ?? false,
          isUpdated: p.is_updated ?? false,
          saved: true,
        }
      }
    }
    // Init empty preds for unpredicted matches
    for (const m of (mts as MatchWithTeams[]) || []) {
      if (!map[m.id]) {
        map[m.id] = {
          homeScore: '',
          awayScore: '',
          winnerId: null,
          penalties: false,
          isUpdated: false,
          saved: false,
        }
      }
    }
    setPreds(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const updatePred = (matchId: number, field: string, value: unknown) => {
    setPreds(p => {
      const prev = p[matchId]
      const updated: PredictionMap[number] = { ...prev, [field]: value, saved: false }

      // If changing scores, auto-set winner based on score
      if (field === 'homeScore' || field === 'awayScore') {
        const hs = field === 'homeScore' ? String(value) : prev.homeScore
        const as_ = field === 'awayScore' ? String(value) : prev.awayScore
        const hNum = parseInt(hs)
        const aNum = parseInt(as_)
        if (!isNaN(hNum) && !isNaN(aNum)) {
          const m = matches.find(x => x.id === matchId)
          if (hNum > aNum) updated.winnerId = m?.home_team_id ?? null
          else if (aNum > hNum) updated.winnerId = m?.away_team_id ?? null
          // Equal: keep current winner (user sets manually or penalty winner)
        }
      }
      return { ...p, [matchId]: updated }
    })
  }

  const savePrediction = async (match: MatchWithTeams) => {
    const pred = preds[match.id]
    if (!pred) return

    const hScore = parseInt(pred.homeScore)
    const aScore = parseInt(pred.awayScore)

    if (isNaN(hScore) || isNaN(aScore)) {
      alert('Preencha o placar completo antes de salvar! ⚽')
      return
    }
    if (!pred.winnerId) {
      alert('Escolha quem vai passar (clique no nome do time)! 🏆')
      return
    }

    setSaving(s => ({ ...s, [match.id]: true }))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if already has a saved prediction
    const { data: existing } = await supabase
      .from('predictions')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('match_id', match.id)
      .single()

    const isUpdated = !!existing

    const payload = {
      user_id: user.id,
      match_id: match.id,
      predicted_home_score: hScore,
      predicted_away_score: aScore,
      predicted_winner_id: pred.winnerId,
      predicted_penalties: pred.penalties,
      is_updated: isUpdated,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('predictions').upsert(payload, {
      onConflict: 'user_id,match_id'
    })

    if (!error) {
      setPreds(p => ({ ...p, [match.id]: { ...p[match.id], isUpdated, saved: true } }))
      setSaved(s => ({ ...s, [match.id]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [match.id]: false })), 2000)
    }

    setSaving(s => ({ ...s, [match.id]: false }))
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
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-700 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
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
      </div>

      {/* Phase tabs */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {PHASES.map(phase => {
            const phaseMs = matches.filter(m => m.phase === phase)
            const locked = phaseMs.length > 0 && phaseMs.every(m => m.is_locked || m.home_team_id === null)
            return (
              <button
                key={phase}
                onClick={() => setActivePhase(phase)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activePhase === phase
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
                }`}
              >
                {phase === '16avos' ? '16avos' :
                 phase === 'oitavas' ? 'Oitavas' :
                 phase === 'quartas' ? 'Quartas' :
                 phase === 'semi' ? 'Semifinais' : '🏆 Final'}
                {locked && phase !== '16avos' && <span className="ml-1 opacity-60">🔒</span>}
              </button>
            )
          })}
        </div>

        {/* Multiplier banner */}
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-amber-600 text-lg">⚡</span>
          <span className="text-xs text-amber-700">
            <strong>Multiplicador {PHASE_LABELS[activePhase]}:</strong> ×{currentPhaseMultiplier}
            {currentPhaseMultiplier > 1 && ` — cada ponto vale mais!`}
          </span>
        </div>

        {/* Match list */}
        <div className="mt-4 space-y-3">
          {phaseMatches.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">⏳</div>
              <p>Os confrontos desta fase ainda não foram definidos.</p>
              <p className="text-sm mt-1">Aguarde os jogos anteriores terminarem!</p>
            </div>
          )}

          {phaseMatches.map(match => {
            const pred = preds[match.id] || { homeScore: '', awayScore: '', winnerId: null, penalties: false, isUpdated: false, saved: false }
            const isLocked = match.is_locked || isMatchPast(match.scheduled_at)
            const isFinished = match.is_finished
            const noTeams = !match.home_team || !match.away_team
            const isSaving = saving[match.id]
            const justSaved = saved[match.id]
            const hasHomePred = pred.homeScore !== ''
            const hasAwayPred = pred.awayScore !== ''
            const hasPred = pred.saved

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
                    {match.location && (
                      <span className="text-xs text-gray-400">· {match.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isFinished ? (
                      <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                        🔒 Encerrado
                      </span>
                    ) : isLocked ? (
                      <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                        <span className="live-dot inline-block w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                        Em andamento
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                        ✏️ Aberto
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatMatchDate(match.scheduled_at)}
                    </span>
                  </div>
                </div>

                {/* Match content */}
                <div className="p-4">
                  {noTeams ? (
                    <div className="text-center py-4 text-gray-400">
                      <span className="text-2xl">🔮</span>
                      <p className="text-sm mt-1">A ser definido...</p>
                    </div>
                  ) : (
                    <>
                      {/* Teams vs scores */}
                      <div className="flex items-center gap-3">
                        {/* Home team */}
                        <button
                          onClick={() => !isLocked && !isFinished && updatePred(match.id, 'winnerId', match.home_team_id)}
                          disabled={isLocked || isFinished}
                          className={`flex-1 text-center transition-all rounded-xl p-2 ${
                            pred.winnerId === match.home_team_id && !isFinished
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
                            <div className="flex items-center gap-1 text-gray-400">
                              <input value={pred.homeScore} readOnly className="score-input bg-gray-50 text-gray-400" />
                              <span className="text-gray-300 text-sm">×</span>
                              <input value={pred.awayScore} readOnly className="score-input bg-gray-50 text-gray-400" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={pred.homeScore}
                                onChange={e => updatePred(match.id, 'homeScore', e.target.value)}
                                className="score-input"
                                placeholder="0"
                              />
                              <span className="text-gray-300 text-sm">×</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={pred.awayScore}
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
                          className={`flex-1 text-center transition-all rounded-xl p-2 ${
                            pred.winnerId === match.away_team_id && !isFinished
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

                      {/* Penalties toggle (if not finished) */}
                      {!isFinished && !isLocked && (
                        <div className="mt-3 flex items-center justify-center gap-2">
                          <button
                            onClick={() => updatePred(match.id, 'penalties', !pred.penalties)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                              pred.penalties
                                ? 'bg-yellow-50 border-yellow-300 text-yellow-700 font-semibold'
                                : 'border-gray-200 text-gray-500 hover:border-yellow-300'
                            }`}
                          >
                            🟡 {pred.penalties ? 'Vai a pênaltis! (+2)' : 'Vai a pênaltis?'}
                          </button>
                        </div>
                      )}

                      {/* Finished: result details */}
                      {isFinished && match.went_to_penalties && (
                        <div className="mt-2 text-center text-xs text-yellow-600 bg-yellow-50 rounded-lg py-1.5">
                          🟡 Foi a pênaltis! {match.winner?.name} avançou
                        </div>
                      )}

                      {/* User's prediction result (if finished) */}
                      {isFinished && pred.saved && (
                        <div className={`mt-3 rounded-xl p-2.5 text-xs ${
                          (pred as PredictionMap[number] & { points_earned?: number }).points_earned ?? pred.homeScore
                            ? 'bg-green-50 border border-green-100'
                            : 'bg-red-50 border border-red-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">
                              Seu palpite: <strong>{pred.homeScore}×{pred.awayScore}</strong>
                              {pred.isUpdated && <span className="text-orange-500 ml-1">(atualizado)</span>}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Save button */}
                      {!isFinished && !isLocked && (
                        <div className="mt-3">
                          {pred.isUpdated && pred.saved && (
                            <div className="text-center text-xs text-orange-500 mb-1.5">
                              🔄 Atualizado — vale pontos reduzidos
                            </div>
                          )}
                          <button
                            onClick={() => savePrediction(match)}
                            disabled={isSaving || justSaved}
                            className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-95 ${
                              justSaved
                                ? 'bg-green-100 text-green-700'
                                : pred.isUpdated && hasPred
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {justSaved ? '✅ Salvo!' : isSaving ? '⏳...' : pred.saved ? '🔄 Atualizar palpite' : '💾 Salvar palpite'}
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

        {/* Points summary */}
        {activePhase === '16avos' && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Palpites salvos</p>
            <p className="text-2xl font-bold text-green-600">
              {Object.values(preds).filter(p => p.saved && matches.find(m => m.phase === '16avos' && preds[m.id] === p)).length}
              <span className="text-gray-400 text-lg font-normal">/{phaseMatches.length}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">jogos dos 16avos previstos</p>
          </div>
        )}
      </div>
    </div>
  )
}
