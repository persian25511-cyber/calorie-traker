import { describe, expect, it } from 'vitest'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import { sanitizeImportedEntry, sanitizeImportedFood } from '../store/sanitizers'
import { DEFAULT_USER_GOALS, MICRONUTRIENT_SPECS } from '../types/nutrition'
import {
  computeMacroEnergySplit,
  computeMicronutrientSummary,
  resolveEntryMicronutrients,
  scaleMicronutrients,
  sumMicronutrients,
} from './micronutrients'
import { parsePersianFoodInput } from './persianFoodParser'

describe('Macronutrient Energy Split & 10-Micronutrient Engine', () => {
  it('populates realistic micronutrients across all 322 built-in foods', () => {
    expect(DEFAULT_IRANIAN_FOODS.length).toBeGreaterThanOrEqual(320)
    for (const food of DEFAULT_IRANIAN_FOODS) {
      expect(food.per100g.micronutrients).toBeDefined()
      for (const spec of MICRONUTRIENT_SPECS) {
        const val = food.per100g.micronutrients?.[spec.key]
        expect(typeof val).toBe('number')
        expect(val).toBeGreaterThanOrEqual(0)
      }
    }

    const ghormeh = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'ghormeh-sabzi')!
    expect(ghormeh.per100g.micronutrients!.ironMg).toBeGreaterThan(2)

    const yogurt = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'yogurt')!
    expect(yogurt.per100g.micronutrients!.calciumMg).toBeGreaterThan(100)

    const orange = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'orange')!
    expect(orange.per100g.micronutrients!.vitaminCMg).toBeGreaterThan(45)

    const salmon = DEFAULT_IRANIAN_FOODS.find((f) => f.id === 'salmon-grilled')!
    expect(salmon.per100g.micronutrients!.vitaminDMcg).toBeGreaterThan(10)
  })

  it('scales, sums, and resolves micronutrients for both new and legacy logged entries', () => {
    expect(scaleMicronutrients(undefined, 150).ironMg).toBe(0)
    expect(scaleMicronutrients({ ironMg: 3 }, 0).ironMg).toBe(0)

    const parsed = parsePersianFoodInput(
      'دو کفگیر قورمه‌سبزی و یک کف دست سنگک و یک پرتقال',
      DEFAULT_IRANIAN_FOODS,
    )
    expect(parsed.items).toHaveLength(3)
    const combined = sumMicronutrients(parsed.items.map((i) => i.micronutrients))
    expect(combined.ironMg).toBeGreaterThan(7)
    expect(combined.vitaminCMg).toBeGreaterThan(50)

    const foodById = new Map(DEFAULT_IRANIAN_FOODS.map((f) => [f.id, f]))

    // Legacy entry WITHOUT stored micronutrients falls back seamlessly to catalog
    const legacyResolved = resolveEntryMicronutrients(
      {
        id: 'legacy-1',
        dateKey: '2026-11-24',
        timestamp: 1,
        mealType: 'lunch',
        foodId: 'adasi',
        foodName: 'عدسی',
        quantity: 1,
        unit: 'کاسه',
        totalGrams: 250,
        kcal: 290,
        protein: 18,
        carbs: 42,
        fat: 5,
      },
      foodById,
    )
    expect(legacyResolved.ironMg).toBeGreaterThan(7)
    expect(legacyResolved.potassiumMg).toBeGreaterThan(800)
  })

  it('computes % DV, sodium upper-limit alerts, and top contributing foods accurately', () => {
    const foodById = new Map(DEFAULT_IRANIAN_FOODS.map((f) => [f.id, f]))

    const empty = computeMicronutrientSummary([], foodById)
    expect(empty.hasAnyIntake).toBe(false)
    expect(empty.overallBalancePct).toBe(0)

    const summary = computeMicronutrientSummary(
      [
        {
          id: '1',
          dateKey: '2026-11-24',
          timestamp: 1,
          mealType: 'lunch',
          foodId: 'ghormeh-sabzi',
          foodName: 'خورش قورمه‌سبزی',
          quantity: 2,
          unit: 'کفگیر',
          totalGrams: 240,
          kcal: 360,
          protein: 22,
          carbs: 19,
          fat: 22,
        },
        {
          id: '2',
          dateKey: '2026-11-24',
          timestamp: 2,
          mealType: 'breakfast',
          foodId: 'white-cheese',
          foodName: 'پنیر سفید ایرانی',
          quantity: 3,
          unit: 'قوطی کبریت',
          totalGrams: 90,
          kcal: 215,
          protein: 14,
          carbs: 2,
          fat: 17,
        },
        {
          id: '3',
          dateKey: '2026-11-24',
          timestamp: 3,
          mealType: 'snack',
          foodId: 'cheese-puffs',
          foodName: 'پفک نمکی',
          quantity: 2,
          unit: 'بسته',
          totalGrams: 180,
          kcal: 930,
          protein: 11,
          carbs: 110,
          fat: 50,
        },
      ],
      foodById,
      1,
    )

    expect(summary.hasAnyIntake).toBe(true)
    expect(summary.overallBalancePct).toBeGreaterThan(15)

    const ironRow = summary.items.find((i) => i.spec.key === 'ironMg')!
    expect(ironRow.topContributors[0]?.foodName).toBe('خورش قورمه‌سبزی')

    const sodiumRow = summary.items.find((i) => i.spec.key === 'sodiumMg')!
    expect(sodiumRow.amount).toBeGreaterThan(2300)
    expect(sodiumRow.status).toBe('over_limit')
  })

  it('computes Atwater caloric macro energy split and sanitizes custom micronutrients', () => {
    const zeroSplit = computeMacroEnergySplit(
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      DEFAULT_USER_GOALS,
    )
    expect(zeroSplit.hasMacroEnergy).toBe(false)

    const split = computeMacroEnergySplit(
      { kcal: 2000, protein: 125, carbs: 225, fat: 66.7 },
      DEFAULT_USER_GOALS,
    )
    expect(split.hasMacroEnergy).toBe(true)
    expect(split.proteinPct + split.carbsPct + split.fatPct).toBe(100)
    expect(split.goalProteinPct + split.goalCarbsPct + split.goalFatPct).toBe(100)

    const cleanFood = sanitizeImportedFood({
      id: 'f1',
      name: 'تست غنی‌شده',
      aliases: [],
      category: 'breakfast_dairy',
      per100g: {
        kcal: 120,
        protein: 8,
        carbs: 10,
        fat: 5,
        micronutrients: { ironMg: 4.5, calciumMg: 240, vitaminDMcg: 3.2 },
      },
      defaultUnit: 'لیوان',
      units: [{ name: 'لیوان', grams: 240 }],
    })
    expect(cleanFood?.per100g.micronutrients?.calciumMg).toBe(240)

    const cleanEntry = sanitizeImportedEntry({
      id: 'e1',
      dateKey: '2026-11-24',
      timestamp: 10,
      mealType: 'breakfast',
      foodId: 'f1',
      foodName: 'تست غنی‌شده',
      quantity: 1,
      unit: 'لیوان',
      totalGrams: 240,
      kcal: 288,
      protein: 19,
      carbs: 24,
      fat: 12,
      micronutrients: { calciumMg: 576, vitaminDMcg: 7.7 },
    })
    expect(cleanEntry?.micronutrients?.calciumMg).toBe(576)
  })
})
