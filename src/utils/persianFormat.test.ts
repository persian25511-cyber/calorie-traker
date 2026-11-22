import { describe, expect, it } from 'vitest'
import { computeLoggingStreak, mergeDefaultCatalog } from '../hooks/useNutritionStore'
import type { FoodItem, LoggedFoodEntry } from '../types/nutrition'
import {
  formatFaNumber,
  formatJalaliDate,
  formatQuantityFa,
  getLastNDays,
  shiftDateKey,
  toAsciiDigits,
  toPersianDigits,
} from './persianFormat'

describe('Persian Formatting & Jalali Date Utilities', () => {
  it('converts digits cleanly between Persian, Arabic-Indic, and ASCII', () => {
    expect(toPersianDigits('2026-11-22')).toBe('۲۰۲۶-۱۱-۲۲')
    expect(toAsciiDigits('۱۲۳٫۴ و ٥٦')).toBe('123٫4 و 56')
    expect(formatQuantityFa(2)).toBe('۲')
    expect(formatQuantityFa(1.5)).toBe('۱٫۵')
    expect(formatFaNumber(1575)).toContain('۵۷۵')
  })

  it('formats Jalali dates naturally in Persian reading order and generates 7-day slots', () => {
    const sample = new Date(2026, 10, 22, 12, 0, 0) // 1 Azar 1405
    const full = formatJalaliDate(sample, 'full')
    expect(full).toContain('آذر')
    expect(full).toContain('۱۴۰۵')

    const days = getLastNDays(7, sample)
    expect(days).toHaveLength(7)
    expect(days[6].isToday).toBe(true)
    expect(days[0].isToday).toBe(false)
    expect(shiftDateKey('2026-11-22', -1)).toBe('2026-11-21')
  })
})

describe('Store Migration & Streak Helpers', () => {
  it('merges newly added default foods without overwriting custom or edited foods', () => {
    const editedGhormeh: FoodItem = {
      id: 'ghormeh-sabzi',
      name: 'قورمه‌سبزی مامان‌پز',
      aliases: [],
      category: 'stews_mains',
      per100g: { kcal: 160, protein: 9, carbs: 6, fat: 11 },
      defaultUnit: 'کفگیر',
      units: [
        { name: 'کفگیر', grams: 130 },
        { name: 'گرم', grams: 1 },
      ],
    }
    const merged = mergeDefaultCatalog([editedGhormeh])
    expect(merged.length).toBeGreaterThanOrEqual(70)
    expect(merged.find((f) => f.id === 'ghormeh-sabzi')?.name).toBe('قورمه‌سبزی مامان‌پز')
    expect(merged.find((f) => f.id === 'tahchin-morgh')).toBeDefined()
  })

  it('computes consecutive daily logging streak accurately', () => {
    const mk = (dateKey: string): LoggedFoodEntry => ({
      id: dateKey,
      dateKey,
      timestamp: Date.now(),
      mealType: 'lunch',
      foodId: 'ghormeh-sabzi',
      foodName: 'قورمه‌سبزی',
      quantity: 1,
      unit: 'کفگیر',
      totalGrams: 120,
      kcal: 174,
      protein: 10,
      carbs: 7,
      fat: 11,
    })

    const entries = [mk('2026-11-22'), mk('2026-11-21'), mk('2026-11-20'), mk('2026-11-18')]
    expect(computeLoggingStreak(entries, '2026-11-22')).toBe(3)
    expect(computeLoggingStreak([], '2026-11-22')).toBe(0)
  })
})
