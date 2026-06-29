export interface Profile {
  id: string
  username: string
  avatar_emoji: string
  is_admin: boolean
  onboarding_done: boolean
  created_at: string
}

export interface Team {
  id: number
  name: string
  flag: string
  eliminated: boolean
}

export interface Match {
  id: number
  phase: '16avos' | 'oitavas' | 'quartas' | 'semi' | 'final'
  match_label: string
  home_team_id: number | null
  away_team_id: number | null
  scheduled_at: string
  location: string
  home_score: number | null
  away_score: number | null
  went_to_penalties: boolean
  winner_id: number | null
  is_finished: boolean
  is_locked: boolean
  display_order: number
  home_team?: Team
  away_team?: Team
  winner?: Team
}

export interface Prediction {
  id: number
  user_id: string
  match_id: number
  predicted_home_score: number | null
  predicted_away_score: number | null
  predicted_winner_id: number | null
  predicted_penalties: boolean
  is_updated: boolean
  points_earned: number
  breakdown: string | null
  created_at: string
  updated_at: string
}

export interface LeaderboardEntry {
  id: string
  username: string
  avatar_emoji: string
  total_points: number
  correct_count: number
  total_predictions: number
}

export const PHASE_LABELS: Record<string, string> = {
  '16avos': '16avos de Final',
  'oitavas': 'Oitavas de Final',
  'quartas': 'Quartas de Final',
  'semi': 'Semifinais',
  'final': 'Grande Final 🏆',
}

export const PHASE_MULTIPLIERS: Record<string, number> = {
  '16avos': 1,
  'oitavas': 1.5,
  'quartas': 2,
  'semi': 3,
  'final': 4,
}

export const AVATAR_OPTIONS = [
  '⚽', '🏆', '🎯', '🔥', '⭐', '🦁', '🐆', '🦅',
  '🦊', '🐻', '🐯', '🦝', '🎪', '🚀', '💫', '🌟',
]
