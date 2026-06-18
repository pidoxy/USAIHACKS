export interface Task {
  id: string
  title: string
  dueDate: string
  hoursEstimated: number
  stressLevel: 'low' | 'medium' | 'high'
  completedHours?: number
}

export interface EntropyState {
  Sc: number     // Chrono-Kinetic Entropy (0–10k)
  Rp: number     // Path Resilience (0–100%)
  eta: number    // Efficiency η(t) (0–1)
  deficitDebt: number // hours
}

export function calcCKEntropy(tasks: Task[], hoursOfSleep: number): number {
  const stressWeights: Record<Task['stressLevel'], number> = { low: 0.5, medium: 1.0, high: 1.8 }
  const totalLoad = tasks.reduce((acc, t) => acc + t.hoursEstimated * stressWeights[t.stressLevel], 0)
  const sleepPenalty = Math.max(0, (8 - hoursOfSleep) * 0.3)
  return Math.round(totalLoad * (1 + sleepPenalty) * 100)
}

export function calcEfficiencyDecay(hoursWorked: number, hoursOfSleep: number): number {
  // η(t) = e^(-λt) where λ depends on sleep quality
  const lambda = 0.03 + Math.max(0, (8 - hoursOfSleep) * 0.012)
  return Math.max(0.1, Math.exp(-lambda * hoursWorked))
}

export function calcPathResilience(Sc: number, maxSc = 10000): number {
  return Math.max(0, Math.round((1 - Sc / maxSc) * 100))
}

export function calcDeficitDebt(tasks: Task[]): number {
  const overdue = tasks.filter(t => new Date(t.dueDate) < new Date())
  return parseFloat(overdue.reduce((acc, t) => acc + (t.hoursEstimated - (t.completedHours ?? 0)), 0).toFixed(1))
}

export function computeEntropyState(tasks: Task[], hoursOfSleep = 7): EntropyState {
  const Sc  = calcCKEntropy(tasks, hoursOfSleep)
  const Rp  = calcPathResilience(Sc)
  const eta = calcEfficiencyDecay(tasks.reduce((a, t) => a + t.hoursEstimated, 0), hoursOfSleep)
  const deficitDebt = calcDeficitDebt(tasks)
  return { Sc, Rp, eta: parseFloat(eta.toFixed(2)), deficitDebt }
}
