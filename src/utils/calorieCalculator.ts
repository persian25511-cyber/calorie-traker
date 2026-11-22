import type { UserGoals } from '../types/nutrition'

export type BiologicalSex = 'male' | 'female'

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export type WeightGoal = 'lose' | 'maintain' | 'gain'

export interface TdeeInput {
  sex: BiologicalSex
  ageYears: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: WeightGoal
}

export interface TdeeResult {
  bmr: number
  tdee: number
  recommendedGoals: UserGoals
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, { title: string; hint: string }> = {
  sedentary: { title: 'کم‌تحرک', hint: 'کار پشت‌میزی، بدون ورزش منظم' },
  light: { title: 'تحرک سبک', hint: '۱ تا ۳ روز پیاده‌روی یا ورزش در هفته' },
  moderate: { title: 'تحرک متوسط', hint: '۳ تا ۵ روز ورزش در هفته' },
  active: { title: 'پرتحرک', hint: '۶ تا ۷ روز تمرین منظم در هفته' },
  very_active: { title: 'خیلی پرتحرک', hint: 'فعالیت بدنی سنگین یا تمرین روزانه دو نوبت' },
}

export const WEIGHT_GOAL_LABELS: Record<WeightGoal, { title: string; deltaText: string }> = {
  lose: { title: 'کاهش وزن اصولی', deltaText: 'کسر کالری ملایم و حفظ عضله' },
  maintain: { title: 'تثبیت وزن', deltaText: 'متعادل با نیاز روزانه بدن' },
  gain: { title: 'افزایش وزن / عضله', deltaText: 'مازاد کالری کنترل‌شده' },
}

/**
 * Calculates BMR (Mifflin-St Jeor), TDEE, balanced macro targets,
 * and recommended daily water glasses (240ml per glass).
 */
export function calculateRecommendedGoals(input: TdeeInput): TdeeResult {
  const age = Math.max(14, Math.min(95, input.ageYears))
  const height = Math.max(120, Math.min(230, input.heightCm))
  const weight = Math.max(35, Math.min(220, input.weightKg))

  const sexOffset = input.sex === 'male' ? 5 : -161
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset)
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activity])

  let targetKcal = tdee
  if (input.goal === 'lose') {
    targetKcal = Math.round(tdee - Math.min(500, Math.max(300, tdee * 0.18)))
    const floor = input.sex === 'male' ? 1400 : 1200
    targetKcal = Math.max(floor, targetKcal)
  } else if (input.goal === 'gain') {
    targetKcal = Math.round(tdee + Math.min(400, Math.max(250, tdee * 0.12)))
  }

  // Round to nearest 10 kcal for clean user-facing numbers
  targetKcal = Math.round(targetKcal / 10) * 10

  // Balanced protein target based on body weight (1.5-1.8g/kg), capped safely
  const proteinPerKg = input.goal === 'lose' ? 1.8 : input.goal === 'gain' ? 1.7 : 1.5
  const rawProtein = Math.round(weight * proteinPerKg)
  const maxProtein = Math.round((targetKcal * 0.35) / 4)
  const proteinGrams = Math.max(55, Math.min(maxProtein, rawProtein))

  // Healthy dietary fat share (~27% of calories)
  const fatGrams = Math.max(35, Math.round((targetKcal * 0.27) / 9))

  // Remaining calories allocated to carbohydrates
  const remainingKcal = Math.max(200, targetKcal - proteinGrams * 4 - fatGrams * 9)
  const carbsGrams = Math.round(remainingKcal / 4)

  // ~32ml/kg divided by 240ml glass, clamped to 6-14 glasses
  const waterGoalGlasses = Math.max(6, Math.min(14, Math.round((weight * 32) / 240)))

  return {
    bmr,
    tdee,
    recommendedGoals: {
      dailyKcal: targetKcal,
      proteinGrams,
      carbsGrams,
      fatGrams,
      waterGoalGlasses,
    },
  }
}
