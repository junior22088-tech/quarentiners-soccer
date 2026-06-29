import { PHASE_MULTIPLIERS } from '@/types'

export function calculatePoints(params: {
  predictedHomeScore: number
  predictedAwayScore: number
  predictedWinnerId: number
  predictedPenalties: boolean
  isUpdated: boolean
  actualHomeScore: number
  actualAwayScore: number
  actualWinnerId: number
  wentToPenalties: boolean
  phase: string
}) {
  const mul = PHASE_MULTIPLIERS[params.phase] ?? 1
  const orig = !params.isUpdated
  let base = 0
  let bonus = 0
  let breakdown = ''

  const exactScore =
    params.predictedHomeScore === params.actualHomeScore &&
    params.predictedAwayScore === params.actualAwayScore

  const correctWinner = params.predictedWinnerId === params.actualWinnerId

  const predDiff = params.predictedHomeScore - params.predictedAwayScore
  const actualDiff = params.actualHomeScore - params.actualAwayScore
  const correctDiff = correctWinner && predDiff === actualDiff

  if (exactScore) {
    base = orig ? 10 : 6
    breakdown = orig ? '🎯 Placar exato (original)' : '🎯 Placar exato (atualizado)'
  } else if (correctDiff) {
    base = orig ? 7 : 4
    breakdown = orig ? '⚖️ Diferença certa (original)' : '⚖️ Diferença certa (atualizado)'
  } else if (correctWinner) {
    base = orig ? 4 : 2
    breakdown = orig ? '✅ Classificado certo (original)' : '✅ Classificado certo (atualizado)'
  } else {
    breakdown = '❌ Errou'
  }

  if (params.predictedPenalties && params.wentToPenalties) {
    bonus = 2
    breakdown += ' + 🟡 Pênaltis'
  }

  return {
    base,
    bonus,
    multiplier: mul,
    total: +(( base + bonus) * mul).toFixed(2),
    breakdown,
  }
}

export function getPhaseBadgeColor(phase: string) {
  const map: Record<string, string> = {
    '16avos': 'bg-blue-100 text-blue-700',
    'oitavas': 'bg-purple-100 text-purple-700',
    'quartas': 'bg-orange-100 text-orange-700',
    'semi': 'bg-red-100 text-red-700',
    'final': 'bg-yellow-100 text-yellow-700',
  }
  return map[phase] ?? 'bg-gray-100 text-gray-700'
}

export function formatMatchDate(isoDate: string) {
  const d = new Date(isoDate)
  return d.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export function isMatchPast(isoDate: string) {
  return new Date(isoDate) < new Date()
}
