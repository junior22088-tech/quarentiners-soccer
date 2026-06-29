'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase'
import { formatMatchDate } from '@/lib/scoring'
import type { Match, Team, Profile } from '@/types'

type MatchWithTeams = Match & { home_team: Team | null; away_team: Team | null; winner: Team | null }

type ResultForm = {
  homeScore: string
  awayScore: string
  penalties: boolean
  winnerId: number | null
}

export default function AdminPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [forms, setForms] = useState<Record<number, ResultForm>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('16avos')
  const [stats, setStats] = useState({ total: 0, finished: 0, predictions: 0, users: 0 })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof?.is_admin) { router.push('/bracket'); return }
      setProfile(prof)

      const [{ data: mts }, { count: predCount }, { count: userCount }] = await Promise.all([
        supabase.from('matches')
          .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), winner:teams!matches_winner_id_fkey(*)')
          .order('display_order'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ])

      const m = (mts as MatchWithTeams[]) || []
      setMatches(m)
      setStats({
        total: m.length,
        finished: m.filter(x => x.is_finished).length,
        predictions: predCount || 0,
        users: userCount || 0,
      })

      // Init forms
      const f: Record<number, ResultForm> = {}
      for (const match of m) {
        f[match.id] = {
          homeScore: match.home_score?.toString() ?? '',
          awayScore: match.away_score?.toString() ?? '',
          penalties: match.went_to_penalties ?? false,
          winnerId: match.winner_id ?? null,
        }
      }
      setForms(f)
      setLoading(false)
    }
    load()
  }, [])

  const updateForm = (matchId: number, field: string, value: unknown) => {
    setForms(f => {
      const prev = f[matchId]
      const updated = { ...prev, [field]: value }
      // Auto-set winner from scores
      if (field === 'homeScore' || field === 'awayScore') {
        const hs = field === 'homeScore' ? String(value) : prev.homeScore
        const as_ = field === 'awayScore' ? String(value) : prev.awayScore
        const hNum = parseInt(hs), aNum = parseInt(as_)
        const m = matches.find(x => x.id === matchId)
        if (!isNaN(hNum) && !isNaN(aNum) && m) {
          if (hNum > aNum) updated.winnerId = m.home_team_id
          else if (aNum > hNum) updated.winnerId = m.away_team_id
        }
      }
      return { ...f, [matchId]: updated }
    })
  }

  const saveResult = async (match: MatchWithTeams) => {
    const form = forms[match.id]
    const hScore = parseInt(form.homeScore)
    const aScore = parseInt(form.awayScore)

    if (isNaN(hScore) || isNaN(aScore)) {
      alert('Preencha o placar!'); return
    }
    if (!form.winnerId) {
      alert('Selecione o time que passou!'); return
    }

    setSaving(s => ({ ...s, [match.id]: true }))

    // 1. Update match
    const { error } = await supabase.from('matches').update({
      home_score: hScore,
      away_score: aScore,
      went_to_penalties: form.penalties,
      winner_id: form.winnerId,
      is_finished: true,
      is_locked: true,
    }).eq('id', match.id)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setSaving(s => ({ ...s, [match.id]: false }))
      return
    }

    // 2. Calculate points for all predictions on this match
    await supabase.rpc('calculate_match_points', { p_match_id: match.id })

    // 3. Refresh matches
    const { data: updated } = await supabase.from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), winner:teams!matches_winner_id_fkey(*)')
      .eq('id', match.id)
      .single()

    if (updated) {
      setMatches(m => m.map(x => x.id === match.id ? (updated as MatchWithTeams) : x))
      setStats(s => ({ ...s, finished: s.finished + (match.is_finished ? 0 : 1) }))
    }

    setSaved(s => ({ ...s, [match.id]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [match.id]: false })), 3000)
    setSaving(s => ({ ...s, [match.id]: false }))
  }

  const toggleLock = async (match: MatchWithTeams) => {
    await supabase.from('matches').update({ is_locked: !match.is_locked }).eq('id', match.id)
    setMatches(m => m.map(x => x.id === match.id ? { ...x, is_locked: !x.is_locked } : x))
  }

  const phaseMatches = matches.filter(m => m.phase === activePhase)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-5xl animate-bounce">🔧</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <Navbar />

      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold">🔧 Painel do Admin</h1>
          <p className="text-slate-300 text-sm mt-0.5">Olá, {profile?.username}! Insira os resultados aqui.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Jogos', value: stats.total, emoji: '⚽' },
            { label: 'Encerrados', value: stats.finished, emoji: '🔒' },
            { label: 'Palpites', value: stats.predictions, emoji: '🎯' },
            { label: 'Usuários', value: stats.users, emoji: '👥' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <div className="text-lg">{s.emoji}</div>
              <div className="text-xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Phase tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {(['16avos','oitavas','quartas','semi','final'] as const).map(phase => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activePhase === phase
                  ? 'bg-slate-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-slate-400'
              }`}
            >
              {phase === 'final' ? '🏆 Final' : phase}
            </button>
          ))}
        </div>

        {/* Match list */}
        <div className="space-y-3">
          {phaseMatches.map(match => {
            const form = forms[match.id] || { homeScore: '', awayScore: '', penalties: false, winnerId: null }
            const isSaving = saving[match.id]
            const justSaved = saved[match.id]
            const noTeams = !match.home_team || !match.away_team

            return (
              <div key={match.id} className={`bg-white rounded-2xl border p-4 ${match.is_finished ? 'border-green-100 bg-green-50/30' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 text-sm">{match.match_label}</span>
                    {match.location && <span className="text-xs text-gray-400">{match.location}</span>}
                    <span className="text-xs text-gray-400">{formatMatchDate(match.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.is_finished && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✅ Encerrado
                      </span>
                    )}
                    <button
                      onClick={() => toggleLock(match)}
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                        match.is_locked
                          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {match.is_locked ? '🔒 Trancado' : '🔓 Aberto'}
                    </button>
                  </div>
                </div>

                {noTeams ? (
                  <div className="text-center py-3 text-gray-400 text-sm">🔮 Times ainda não definidos</div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 text-center">
                        <div className="text-2xl">{match.home_team?.flag}</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1">{match.home_team?.name}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" max="20"
                          value={form.homeScore}
                          onChange={e => updateForm(match.id, 'homeScore', e.target.value)}
                          disabled={match.is_finished}
                          className={`score-input ${match.is_finished ? 'bg-gray-50 text-gray-500' : ''}`}
                          placeholder="0"
                        />
                        <span className="text-gray-300">×</span>
                        <input
                          type="number" min="0" max="20"
                          value={form.awayScore}
                          onChange={e => updateForm(match.id, 'awayScore', e.target.value)}
                          disabled={match.is_finished}
                          className={`score-input ${match.is_finished ? 'bg-gray-50 text-gray-500' : ''}`}
                          placeholder="0"
                        />
                      </div>

                      <div className="flex-1 text-center">
                        <div className="text-2xl">{match.away_team?.flag}</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1">{match.away_team?.name}</div>
                      </div>
                    </div>

                    {/* Winner selector + penalties */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Classificado:</label>
                        <select
                          value={form.winnerId ?? ''}
                          onChange={e => updateForm(match.id, 'winnerId', parseInt(e.target.value) || null)}
                          disabled={match.is_finished}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50"
                        >
                          <option value="">-- Selecionar --</option>
                          <option value={match.home_team?.id}>{match.home_team?.flag} {match.home_team?.name}</option>
                          <option value={match.away_team?.id}>{match.away_team?.flag} {match.away_team?.name}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Pênaltis?</label>
                        <button
                          onClick={() => !match.is_finished && updateForm(match.id, 'penalties', !form.penalties)}
                          disabled={match.is_finished}
                          className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                            form.penalties
                              ? 'bg-yellow-50 border-yellow-300 text-yellow-700 font-semibold'
                              : 'border-gray-200 text-gray-500'
                          }`}
                        >
                          🟡 {form.penalties ? 'Sim' : 'Não'}
                        </button>
                      </div>
                    </div>

                    {!match.is_finished && (
                      <button
                        onClick={() => saveResult(match)}
                        disabled={isSaving || justSaved}
                        className={`w-full font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 ${
                          justSaved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                        }`}
                      >
                        {justSaved ? '✅ Resultado salvo e pontos calculados!' : isSaving ? '⏳ Salvando...' : '💾 Salvar resultado e calcular pontos'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
