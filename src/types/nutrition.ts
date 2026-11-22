import { APP_CONFIG } from '../config/env'

export type FoodCategory =
  | 'stews_mains'
  | 'rice_breads'
  | 'breakfast_dairy'
  | 'drinks_snacks'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type AppTab = 'home' | 'trends' | 'foods' | 'settings'

export interface MacroValues {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface FoodUnit {
  /** Canonical Persian household unit label, e.g. 'کفگیر', 'کف دست', 'لیوان' */
  name: string
  /** Gram weight of 1 unit */
  grams: number
  /** Optional unit aliases specific to this food */
  aliases?: string[]
}

export interface FoodItem {
  id: string
  name: string
  aliases: string[]
  category: FoodCategory
  per100g: MacroValues
  defaultUnit: string
  units: FoodUnit[]
  isCustom?: boolean
}

export interface ParsedFoodItem {
  id: string
  food: FoodItem
  quantity: number
  unit: string
  gramsPerUnit: number
  totalGrams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  rawSegment: string
  confidence: number
}

export interface ParseResult {
  items: ParsedFoodItem[]
  unmatchedSegments: string[]
}

export interface LoggedFoodEntry {
  id: string
  dateKey: string // Local YYYY-MM-DD
  timestamp: number
  mealType: MealType
  foodId: string
  foodName: string
  quantity: number
  unit: string
  totalGrams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  sourceText?: string
}

export interface UserGoals {
  dailyKcal: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  waterGoalGlasses: number
}

export interface AppBackupData {
  version: number
  exportedAt: string
  goals: UserGoals
  foods: FoodItem[]
  entries: LoggedFoodEntry[]
  waterByDate?: Record<string, number>
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'صبحانه',
  lunch: 'ناهار',
  dinner: 'شام',
  snack: 'میان‌وعده',
}

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  stews_mains: 'خورش و غذای اصلی',
  rice_breads: 'برنج و نان',
  breakfast_dairy: 'صبحانه و لبنیات',
  drinks_snacks: 'نوشیدنی، میوه و میان‌وعده',
}

export const DEFAULT_USER_GOALS: UserGoals = {
  dailyKcal: APP_CONFIG.defaultDailyKcal,
  proteinGrams: 120,
  carbsGrams: 230,
  fatGrams: 65,
  waterGoalGlasses: APP_CONFIG.defaultWaterGoal,
}
