import {
  EMPTY_MICRONUTRIENTS,
  MICRONUTRIENT_SPECS,
  type FoodItem,
  type LoggedFoodEntry,
  type MacroValues,
  type MicronutrientKey,
  type MicronutrientSpec,
  type MicronutrientValues,
  type UserGoals,
} from '../types/nutrition'

export const MICRONUTRIENT_KEYS: readonly MicronutrientKey[] = MICRONUTRIENT_SPECS.map((s) => s.key)

function round1(val: number): number {
  return Math.round(val * 10) / 10
}

/** Scales per-100g micronutrient values to `totalGrams`. */
export function scaleMicronutrients(
  per100gMicro: Partial<MicronutrientValues> | undefined,
  totalGrams: number,
): MicronutrientValues {
  if (!per100gMicro || totalGrams <= 0) {
    return { ...EMPTY_MICRONUTRIENTS }
  }
  const factor = totalGrams / 100
  return {
    ironMg: round1((per100gMicro.ironMg ?? 0) * factor),
    calciumMg: Math.round((per100gMicro.calciumMg ?? 0) * factor),
    potassiumMg: Math.round((per100gMicro.potassiumMg ?? 0) * factor),
    magnesiumMg: Math.round((per100gMicro.magnesiumMg ?? 0) * factor),
    zincMg: round1((per100gMicro.zincMg ?? 0) * factor),
    sodiumMg: Math.round((per100gMicro.sodiumMg ?? 0) * factor),
    vitaminCMg: Math.round((per100gMicro.vitaminCMg ?? 0) * factor),
    vitaminDMcg: round1((per100gMicro.vitaminDMcg ?? 0) * factor),
    vitaminB12Mcg: round1((per100gMicro.vitaminB12Mcg ?? 0) * factor),
    vitaminAMcg: Math.round((per100gMicro.vitaminAMcg ?? 0) * factor),
  }
}

export function sumMicronutrients(
  items: ReadonlyArray<Partial<MicronutrientValues> | undefined>,
): MicronutrientValues {
  const acc: MicronutrientValues = { ...EMPTY_MICRONUTRIENTS }
  for (const item of items) {
    if (!item) continue
    for (const key of MICRONUTRIENT_KEYS) {
      const v = item[key]
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        acc[key] += v
      }
    }
  }
  return {
    ironMg: round1(acc.ironMg),
    calciumMg: Math.round(acc.calciumMg),
    potassiumMg: Math.round(acc.potassiumMg),
    magnesiumMg: Math.round(acc.magnesiumMg),
    zincMg: round1(acc.zincMg),
    sodiumMg: Math.round(acc.sodiumMg),
    vitaminCMg: Math.round(acc.vitaminCMg),
    vitaminDMcg: round1(acc.vitaminDMcg),
    vitaminB12Mcg: round1(acc.vitaminB12Mcg),
    vitaminAMcg: Math.round(acc.vitaminAMcg),
  }
}

/**
 * Resolves micronutrients for any `LoggedFoodEntry`, seamlessly falling back to the catalog's
 * `per100g.micronutrients × totalGrams` for older entries logged before v1.3.0.
 */
export function resolveEntryMicronutrients(
  entry: LoggedFoodEntry,
  foodById: ReadonlyMap<string, FoodItem>,
): MicronutrientValues {
  if (entry.micronutrients && Object.keys(entry.micronutrients).length > 0) {
    return sumMicronutrients([entry.micronutrients])
  }
  const per100gMicro =
    entry.per100g?.micronutrients ?? foodById.get(entry.foodId)?.per100g.micronutrients
  return scaleMicronutrients(per100gMicro, entry.totalGrams)
}

export type MicronutrientStatus = 'good' | 'moderate' | 'low' | 'within_limit' | 'near_limit' | 'over_limit'

export interface MicronutrientContributor {
  foodName: string
  amount: number
}

export interface EvaluatedMicronutrientItem {
  spec: MicronutrientSpec
  /** Daily consumed (or daily period average) amount */
  amount: number
  /** Percentage of adult reference value (can exceed 100%) */
  pctOfRef: number
  /** Clamped 0..100 for progress bars and radar polygon */
  clampedPct: number
  status: MicronutrientStatus
  statusLabel: string
  topContributors: MicronutrientContributor[]
}

export interface MicronutrientSummaryResult {
  hasAnyIntake: boolean
  values: MicronutrientValues
  items: EvaluatedMicronutrientItem[]
  /** Average % coverage across beneficial vitamins & minerals (excluding sodium limit) */
  overallBalancePct: number
}

/**
 * Aggregates micronutrients across `entries` (dividing by `divisorDays` for multi-day averages)
 * and ranks top contributing foods for every single vitamin & mineral.
 */
export function computeMicronutrientSummary(
  entries: readonly LoggedFoodEntry[],
  foodById: ReadonlyMap<string, FoodItem>,
  divisorDays = 1,
): MicronutrientSummaryResult {
  const safeDivisor = Math.max(1, divisorDays)
  const totals: MicronutrientValues = { ...EMPTY_MICRONUTRIENTS }
  const contribMaps: Record<MicronutrientKey, Map<string, number>> = {
    ironMg: new Map(),
    calciumMg: new Map(),
    potassiumMg: new Map(),
    magnesiumMg: new Map(),
    zincMg: new Map(),
    sodiumMg: new Map(),
    vitaminCMg: new Map(),
    vitaminDMcg: new Map(),
    vitaminB12Mcg: new Map(),
    vitaminAMcg: new Map(),
  }

  for (const entry of entries) {
    const resolved = resolveEntryMicronutrients(entry, foodById)
    for (const key of MICRONUTRIENT_KEYS) {
      const val = resolved[key]
      if (val > 0) {
        totals[key] += val
        const map = contribMaps[key]
        map.set(entry.foodName, (map.get(entry.foodName) ?? 0) + val)
      }
    }
  }

  const avgValues: MicronutrientValues = { ...EMPTY_MICRONUTRIENTS }
  let beneficialPctSum = 0
  let beneficialCount = 0

  const items: EvaluatedMicronutrientItem[] = MICRONUTRIENT_SPECS.map((spec) => {
    const rawAvg = totals[spec.key] / safeDivisor
    const amount = spec.decimals === 1 ? round1(rawAvg) : Math.round(rawAvg)
    avgValues[spec.key] = amount

    const pctOfRef = spec.dailyRef > 0 ? Math.round((rawAvg / spec.dailyRef) * 100) : 0
    const clampedPct = Math.min(100, Math.max(0, pctOfRef))

    let status: MicronutrientStatus
    let statusLabel: string

    if (spec.isUpperLimit) {
      if (pctOfRef > 100) {
        status = 'over_limit'
        statusLabel = 'بالاتر از سقف پیشنهادی'
      } else if (pctOfRef >= 80) {
        status = 'near_limit'
        statusLabel = 'نزدیک به سقف روزانه'
      } else {
        status = 'within_limit'
        statusLabel = 'در محدوده متعادل'
      }
    } else {
      beneficialPctSum += clampedPct
      beneficialCount += 1
      if (pctOfRef >= 75) {
        status = 'good'
        statusLabel = 'تأمین خوب'
      } else if (pctOfRef >= 35) {
        status = 'moderate'
        statusLabel = 'متوسط'
      } else {
        status = 'low'
        statusLabel = 'کمتر از مرجع'
      }
    }

    const topContributors: MicronutrientContributor[] = Array.from(contribMaps[spec.key].entries())
      .map(([foodName, sumAmount]) => ({
        foodName,
        amount: spec.decimals === 1 ? round1(sumAmount / safeDivisor) : Math.round(sumAmount / safeDivisor),
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)

    return {
      spec,
      amount,
      pctOfRef,
      clampedPct,
      status,
      statusLabel,
      topContributors,
    }
  })

  return {
    hasAnyIntake: entries.length > 0,
    values: avgValues,
    items,
    overallBalancePct: beneficialCount > 0 ? Math.round(beneficialPctSum / beneficialCount) : 0,
  }
}

export interface MacroEnergySplit {
  hasMacroEnergy: boolean
  totalMacroKcal: number
  proteinKcal: number
  carbsKcal: number
  fatKcal: number
  proteinPct: number
  carbsPct: number
  fatPct: number
  goalProteinPct: number
  goalCarbsPct: number
  goalFatPct: number
}

/**
 * Computes exact Atwater energy distribution (4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat)
 * and compares actual caloric share (%) against the user's configured macro goals.
 */
export function computeMacroEnergySplit(consumed: MacroValues, goals: UserGoals): MacroEnergySplit {
  const proteinKcal = Math.round(Math.max(0, consumed.protein) * 4)
  const carbsKcal = Math.round(Math.max(0, consumed.carbs) * 4)
  const fatKcal = Math.round(Math.max(0, consumed.fat) * 9)
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal

  const proteinPct = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0
  const carbsPct = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0
  const fatPct = totalMacroKcal > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0

  const gProtKcal = Math.max(0, goals.proteinGrams) * 4
  const gCarbKcal = Math.max(0, goals.carbsGrams) * 4
  const gFatKcal = Math.max(0, goals.fatGrams) * 9
  const gSum = gProtKcal + gCarbKcal + gFatKcal || 1

  const goalProteinPct = Math.round((gProtKcal / gSum) * 100)
  const goalCarbsPct = Math.round((gCarbKcal / gSum) * 100)
  const goalFatPct = Math.max(0, 100 - goalProteinPct - goalCarbsPct)

  return {
    hasMacroEnergy: totalMacroKcal > 0,
    totalMacroKcal,
    proteinKcal,
    carbsKcal,
    fatKcal,
    proteinPct,
    carbsPct,
    fatPct,
    goalProteinPct,
    goalCarbsPct,
    goalFatPct,
  }
}
