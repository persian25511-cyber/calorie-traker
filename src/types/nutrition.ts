import { APP_CONFIG } from '../config/env'

export type FoodCategory =
  | 'stews_mains'
  | 'rice_breads'
  | 'breakfast_dairy'
  | 'drinks_snacks'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MealScheduleMode = 'standard' | 'ramadan'

export type AppTab = 'home' | 'trends' | 'foods' | 'settings'

export type ThemeMode = 'dark' | 'light'

export interface MacroValues {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface FoodUnit {
  /** Canonical Persian household unit label, e.g. 'کفگیر', 'کف دست', 'لیوان' */
  name: string
  /** Gram weight of 1 unit */
  grams: number
  /** Optional unit aliases specific to this food */
  aliases?: string[]
}

export interface RecipeIngredientRecord {
  foodId: string
  quantity: number
  unit: string
}

export interface FoodItem {
  id: string
  name: string
  aliases: string[]
  category: FoodCategory
  per100g: MacroValues
  defaultUnit: string
  units: FoodUnit[]
  /** Optional EAN-13 / Iranian 626 supermarket barcode */
  barcode?: string
  /** Authoritative reference citation (e.g. USDA NDB # / NNFTRI Iranian table) */
  source?: string
  /** True when cross-validated against a laboratory reference table; values remain approximate for home cooking */
  verified?: boolean
  isCustom?: boolean
  isRecipe?: boolean
  /** Saved recipe ingredients & cooking yield % so composite recipes remain editable */
  recipeIngredients?: RecipeIngredientRecord[]
  cookingYieldPct?: number
  /** Runtime flag set when a built-in catalog item has an active user override */
  isOverridden?: boolean
}

export interface FoodOverrideRecord {
  food: FoodItem
  baseCatalogVersion: string
  updatedAt: number
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
  fiber?: number
  rawSegment: string
  confidence: number
  /** Applied cooking preparation modifier (e.g. 'کم‌روغن', 'پرچرب') */
  modifierLabel?: string
  /** True when user typed a generic term (e.g. "برنج", "نان", "ماست") or fuzzy low-confidence match */
  isAmbiguous?: boolean
  /** Alternative candidate foods for quick 1-tap disambiguation */
  alternatives?: FoodItem[]
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
  fiber?: number
  modifierLabel?: string
  /** Optional per-100g macro snapshot so quantity edits recompute accurately even if custom food is deleted */
  per100g?: MacroValues
  sourceText?: string
}

export interface WeightEntry {
  dateKey: string // Local YYYY-MM-DD
  weightKg: number
  updatedAt: number
}

export interface MealTemplateItem {
  foodId: string
  foodName: string
  quantity: number
  unit: string
  totalGrams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface MealTemplate {
  id: string
  name: string
  mealType: MealType
  items: MealTemplateItem[]
  createdAt: number
}

export interface UserGoals {
  dailyKcal: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  waterGoalGlasses: number
  scheduleMode?: MealScheduleMode
}

export interface AppBackupData {
  version: number
  exportedAt: string
  catalogVersion?: string
  goals: UserGoals
  foods: FoodItem[]
  customFoods?: FoodItem[]
  foodOverrides?: Record<string, FoodOverrideRecord>
  entries: LoggedFoodEntry[]
  waterByDate?: Record<string, number>
  weights?: WeightEntry[]
  templates?: MealTemplate[]
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'صبحانه',
  lunch: 'ناهار',
  dinner: 'شام',
  snack: 'میان‌وعده',
}

export const RAMADAN_MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'سحری',
  lunch: 'افطاری',
  dinner: 'شام',
  snack: 'میان‌وعده شبانه',
}

export function getMealTypeLabels(
  mode: MealScheduleMode = 'standard',
): Record<MealType, string> {
  return mode === 'ramadan' ? RAMADAN_MEAL_TYPE_LABELS : MEAL_TYPE_LABELS
}

/** Suggested share of daily kcal per meal slot for gentle budgeting hints. */
export const MEAL_BUDGET_RATIOS: Record<MealScheduleMode, Record<MealType, number>> = {
  standard: {
    breakfast: 0.25,
    lunch: 0.38,
    dinner: 0.27,
    snack: 0.1,
  },
  ramadan: {
    breakfast: 0.35, // سحری
    lunch: 0.35, // افطاری
    dinner: 0.2, // شام سبک
    snack: 0.1, // میان‌وعده شبانه
  },
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
  fiberGrams: 28,
  waterGoalGlasses: APP_CONFIG.defaultWaterGoal,
  scheduleMode: 'standard',
}
