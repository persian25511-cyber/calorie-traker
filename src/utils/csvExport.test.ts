import { describe, expect, it } from 'vitest'
import type { LoggedFoodEntry } from '../types/nutrition'
import { buildEntriesCsv } from './csvExport'

describe('CSV Export & Formula Safety', () => {
  it('generates UTF-8 BOM Persian CSV and neutralizes spreadsheet formula injection', () => {
    const sampleEntries: LoggedFoodEntry[] = [
      {
        id: 'e1',
        dateKey: '2026-11-22',
        timestamp: 1795350000000,
        mealType: 'lunch',
        foodId: 'ghormeh-sabzi',
        foodName: 'قورمه‌سبزی',
        quantity: 2,
        unit: 'کفگیر',
        totalGrams: 240,
        kcal: 348,
        protein: 20.4,
        carbs: 14.9,
        fat: 23,
      },
      {
        id: 'e2',
        dateKey: '2026-11-22',
        timestamp: 1795350001000,
        mealType: 'snack',
        foodId: 'custom-evil',
        foodName: '=SUM(A1:A2)',
        quantity: 1,
        unit: 'عدد',
        totalGrams: 50,
        kcal: 100,
        protein: 5,
        carbs: 10,
        fat: 4,
      },
    ]

    const csv = buildEntriesCsv(sampleEntries)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('تاریخ جلالی')
    expect(csv).toContain('قورمه‌سبزی')
    expect(csv).toContain('ناهار')
    expect(csv).toContain("'=SUM(A1:A2)")
    expect(csv).not.toContain(',=SUM(A1:A2)')
  })
})
