import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  type LoggedFoodEntry,
  type MacroValues,
  type UserGoals,
} from '../types/nutrition'
import { formatFaNumber, formatQuantityFa } from './persianFormat'

interface DailyReportParams {
  appName: string
  jalaliDateLabel: string
  consumed: MacroValues
  goals: UserGoals
  waterGlasses: number
  entries: LoggedFoodEntry[]
}

export interface WeeklyReportParams {
  appName: string
  periodLabel: string
  activeDaysCount: number
  avgKcal: number
  goalKcal: number
  withinGoalDays: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  days: Array<{ label: string; kcal: number }>
}

/** Formats a crisp Persian daily nutrition summary ready for copying/sharing. */
export function buildPersianDailyReport({
  appName,
  jalaliDateLabel,
  consumed,
  goals,
  waterGlasses,
  entries,
}: DailyReportParams): string {
  const remaining = goals.dailyKcal - consumed.kcal
  const balanceLine =
    remaining >= 0
      ? `باقی‌مانده تا هدف: ${formatFaNumber(remaining)} کالری`
      : `بالاتر از محدوده هدف: ${formatFaNumber(Math.abs(remaining))} کالری`

  const lines: string[] = [
    `گزارش روزانه ${appName} — ${jalaliDateLabel}`,
    `────────────────────`,
    `کالری تقریبی: ${formatFaNumber(consumed.kcal)} از ${formatFaNumber(goals.dailyKcal)} کالری`,
    balanceLine,
    `پروتئین: ${formatFaNumber(consumed.protein, 1)} / ${formatFaNumber(goals.proteinGrams)} گرم`,
    `کربوهیدرات: ${formatFaNumber(consumed.carbs, 1)} / ${formatFaNumber(goals.carbsGrams)} گرم`,
    `چربی: ${formatFaNumber(consumed.fat, 1)} / ${formatFaNumber(goals.fatGrams)} گرم`,
    `آب مصرفی: ${formatFaNumber(waterGlasses)} از ${formatFaNumber(goals.waterGoalGlasses)} لیوان`,
  ]

  if (entries.length > 0) {
    lines.push('', 'وعده‌های ثبت‌شده:')
    for (const mealType of MEAL_TYPE_ORDER) {
      const group = entries.filter((e) => e.mealType === mealType)
      if (group.length === 0) continue
      const groupKcal = group.reduce((s, e) => s + e.kcal, 0)
      lines.push(`• ${MEAL_TYPE_LABELS[mealType]} (${formatFaNumber(groupKcal)} کالری):`)
      for (const item of group) {
        lines.push(
          `  - ${item.foodName}: ${formatQuantityFa(item.quantity)} ${item.unit} (${formatFaNumber(item.kcal)} کالری)`,
        )
      }
    }
  }

  return lines.join('\n')
}

/** Formats a clean, non-pressuring 7-day Persian weekly nutrition summary. */
export function buildPersianWeeklyReport(params: WeeklyReportParams): string {
  const lines: string[] = [
    `گزارش هفتگی ${params.appName} (${params.periodLabel})`,
    `────────────────────`,
    `میانگین روزانه: ~${formatFaNumber(params.avgKcal)} کالری (هدف: ${formatFaNumber(params.goalKcal)})`,
    `روزهای دارای ثبت: ${formatFaNumber(params.activeDaysCount)} از ۷ روز (${formatFaNumber(params.withinGoalDays)} روز در محدوده هدف)`,
    `میانگین درشت‌مغذی‌ها: پروتئین ${formatFaNumber(params.avgProtein, 1)}گ · کربوهیدرات ${formatFaNumber(params.avgCarbs, 1)}گ · چربی ${formatFaNumber(params.avgFat, 1)}گ`,
    '',
    'جزئیات روزهای هفته:',
    ...params.days.map(
      (d) =>
        `• ${d.label}: ${d.kcal > 0 ? `~${formatFaNumber(d.kcal)} کالری` : 'بدون ثبت'}`,
    ),
  ]
  return lines.join('\n')
}
