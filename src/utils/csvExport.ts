import { MEAL_TYPE_LABELS, type LoggedFoodEntry } from '../types/nutrition'
import { dateFromKey, formatJalaliDate } from './persianFormat'

function escapeCsvCell(value: string | number): string {
  let str = String(value)
  // Neutralize spreadsheet formula injection characters (=, +, -, @)
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generates an Excel-compatible UTF-8 BOM CSV file of all logged meal entries
 * with Jalali dates, Persian meal labels, household units, and macros.
 */
export function buildEntriesCsv(entries: LoggedFoodEntry[]): string {
  const headers = [
    'تاریخ جلالی',
    'تاریخ میلادی',
    'وعده',
    'نام غذا',
    'مقدار',
    'واحد',
    'وزن (گرم)',
    'کالری',
    'پروتئین (گرم)',
    'کربوهیدرات (گرم)',
    'چربی (گرم)',
  ]

  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)
  const rows = sorted.map((e) => [
    formatJalaliDate(dateFromKey(e.dateKey), 'full'),
    e.dateKey,
    MEAL_TYPE_LABELS[e.mealType],
    e.foodName,
    e.quantity,
    e.unit,
    e.totalGrams,
    e.kcal,
    e.protein,
    e.carbs,
    e.fat,
  ])

  const csvBody = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n')

  // UTF-8 BOM ensures Excel opens Persian text cleanly without encoding artifacts
  return `\uFEFF${csvBody}`
}
