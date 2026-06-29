'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase'
import type { LeaderboardEntry, Profile } from '@/types'

const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function RankingPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: lb }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('leaderboard').select('*'),
      ])

      setProfile(prof)
      setEntries(lb || [])
      setLoading(false)
    }
    load()
  }, [])

  const myRank = entries.findIndex(e => e.id === profile?.id) + 1

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🏆</div>
          <p className="text-gray-500">Calculando ranking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-xs font-medium uppercase tracking-wide">Placar do bolão</p>
              <h1 className="text-xl font-bold mt-0.5">🏆 Ranking</h1>
            </div>
            {myRank > 0 && (
              <div className="text-right bg-white/15 rounded-2xl px-4 py-2">
                <p className="text-yellow-100 text-xs">Você está em</p>
                <p className="text-2xl font-extrabold">{medals[myRank] || `#${myRank}`}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4">
        {entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">😴</div>
            <p className="font-medium">Ninguém pontuou ainda</p>
            <p className="text-sm mt-1">O ranking aparece quando os jogos terminarem!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const rank = i + 1
              const isMe = entry.id === profile?.id
              return (
                <div
                  key={entry.id}
                  className={`bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 lb-row transition-colors ${
                    isMe ? 'border-green-300 bg-green-50' : 'border-gray-100'
                  }`}
                >
                  {/* Rank */}
                  <div className={`lb-rank w-9 text-center font-bold text-lg flex-shrink-0 ${rank > 3 ? 'text-gray-400' : ''}`}>
                    {medals[rank] || rank}
                  </div>

                  {/* Avatar */}
                  <div className="text-2xl flex-shrink-0">{entry.avatar_emoji}</div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold truncate ${isMe ? 'text-green-700' : 'text-gray-800'}`}>
                      {entry.username}
                      {isMe && <span className="text-xs ml-1 text-green-500">(você)</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {entry.correct_count} acertos · {entry.total_predictions} palpites
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xl font-extrabold ${rank === 1 ? 'text-yellow-500' : 'text-gray-800'}`}>
                      {entry.total_points}
                    </div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Fun note */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-4 text-center text-sm text-gray-500">
          <p>🔄 O ranking atualiza em tempo real conforme o admin insere os resultados</p>
        </div>
      </div>
    </div>
  )
}
