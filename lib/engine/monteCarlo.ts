import type { Task } from './entropy'
import { computeEntropyState } from './entropy'

export interface Crisis {
  name: string
  durationHours: number
  intensityScore: number // 1–10
}

export interface SimulationResult {
  runId: number
  survived: boolean
  peakEntropy: number
  finalRp: number
}

export interface MonteCarloReport {
  survivalRate: number   // 0–100
  avgPeakEntropy: number
  worstCaseRp: number
  bestCaseRp: number
  runs: SimulationResult[]
}

function randomCrisis(): Crisis {
  const crises: Crisis[] = [
    { name: 'Unexpected illness',    durationHours: 48, intensityScore: 7 },
    { name: 'System outage',         durationHours: 12, intensityScore: 9 },
    { name: 'Family emergency',      durationHours: 24, intensityScore: 8 },
    { name: 'Exam rescheduled',      durationHours: 0,  intensityScore: 5 },
    { name: 'Internet outage',       durationHours: 6,  intensityScore: 4 },
    { name: 'Sleep deprivation',     durationHours: 0,  intensityScore: 6 },
  ]
  return crises[Math.floor(Math.random() * crises.length)]
}

export function runMonteCarlo(
  baseTasks: Task[],
  runs = 50,
  extraCrises: Crisis[] = [],
): MonteCarloReport {
  const results: SimulationResult[] = []

  for (let i = 0; i < runs; i++) {
    const injectedCrises = extraCrises.length ? extraCrises : [randomCrisis()]
    const extraLoad = injectedCrises.reduce((sum, c) => sum + (c.durationHours * c.intensityScore) / 10, 0)
    const augmentedTasks: Task[] = [
      ...baseTasks,
      ...injectedCrises.map((c, idx) => ({
        id: `crisis-${i}-${idx}`,
        title: c.name,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        hoursEstimated: c.durationHours || 2,
        stressLevel: c.intensityScore >= 7 ? 'high' : c.intensityScore >= 4 ? 'medium' : 'low',
      } as Task)),
    ]
    const sleepHours = Math.max(3, 7 - extraLoad * 0.1 + (Math.random() - 0.5) * 2)
    const state = computeEntropyState(augmentedTasks, sleepHours)
    results.push({
      runId: i,
      survived: state.Rp >= 30,
      peakEntropy: state.Sc,
      finalRp: state.Rp,
    })
  }

  const survived = results.filter(r => r.survived).length
  return {
    survivalRate:    Math.round((survived / runs) * 100),
    avgPeakEntropy:  Math.round(results.reduce((s, r) => s + r.peakEntropy, 0) / runs),
    worstCaseRp:     Math.min(...results.map(r => r.finalRp)),
    bestCaseRp:      Math.max(...results.map(r => r.finalRp)),
    runs: results,
  }
}
