import {
  DEFAULT_USER_GOALS,
  MEAL_TYPE_ORDER,
  type FoodCategory,
  type FoodItem,
  type FoodOverrideRecord,
  type FoodUnit,
  type LoggedFoodEntry,
  type MacroValues,
  type MealTemplate,
  type MealTemplateItem,
  type MealType,
  type UserGoals,
  type WeightEntry,
} from '../types/nutrition'

const VALID_CATEGORIES = new Set<FoodCategory>([
  'stews_mains',
  'rice_breads',
  'breakfast_dairy',
  'drinks_snacks',
])

export const VALID_MEAL_TYPES = new Set<MealType>(MEAL_TYPE_ORDER)
export const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function isFiniteNonNegative(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0
}

function sanitizeOptionalPer100g(raw: unknown): MacroValues | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const m = raw as Partial<MacroValues>
  if (!isFiniteNonNegative(m.kcal) || m.kcal <= 0) return undefined
  return {
    kcal: m.kcal,
    protein: isFiniteNonNegative(m.protein) ? m.protein : 0,
    carbs: isFiniteNonNegative(m.carbs) ? m.carbs : 0,
    fat: isFiniteNonNegative(m.fat) ? m.fat : 0,
  }
}

/** Sanitizes an untrusted FoodItem object (from JSON backup or storage) so invalid fields never crash UI or parser. */
export function sanitizeImportedFood(raw: unknown): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Partial<FoodItem>
  if (typeof f.id !== 'string' || !f.id.trim()) return null
  if (typeof f.name !== 'string' || !f.name.trim()) return null
  if (!f.per100g || typeof f.per100g !== 'object') return null

  const { kcal, protein, carbs, fat } = f.per100g
  if (!isFiniteNonNegative(kcal) || kcal <= 0) return null

  if (!Array.isArray(f.units) || f.units.length === 0) return null
  const cleanUnits: FoodUnit[] = f.units
    .filter(
      (u): u is FoodUnit =>
        Boolean(u) &&
        typeof u.name === 'string' &&
        u.name.trim().length > 0 &&
        typeof u.grams === 'number' &&
        Number.isFinite(u.grams) &&
        u.grams > 0,
    )
    .map((u) => ({
      name: u.name.trim(),
      grams: u.grams,
      ...(Array.isArray(u.aliases)
        ? {
            aliases: u.aliases.filter(
              (a): a is string => typeof a === 'string' && a.trim().length > 0,
            ),
          }
        : {}),
    }))

  if (cleanUnits.length === 0) return null
  if (!cleanUnits.some((u) => u.name === 'گرم')) {
    cleanUnits.push({ name: 'گرم', grams: 1 })
  }

  const cleanAliases = Array.isArray(f.aliases)
    ? f.aliases.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    : []

  const category: FoodCategory =
    typeof f.category === 'string' && VALID_CATEGORIES.has(f.category as FoodCategory)
      ? (f.category as FoodCategory)
      : 'stews_mains'

  const defaultUnit =
    typeof f.defaultUnit === 'string' && cleanUnits.some((u) => u.name === f.defaultUnit)
      ? f.defaultUnit
      : cleanUnits[0].name

  return {
    id: f.id.trim(),
    name: f.name.trim(),
    aliases: cleanAliases,
    category,
    per100g: {
      kcal,
      protein: isFiniteNonNegative(protein) ? protein : 0,
      carbs: isFiniteNonNegative(carbs) ? carbs : 0,
      fat: isFiniteNonNegative(fat) ? fat : 0,
    },
    defaultUnit,
    units: cleanUnits,
    ...(typeof f.source === 'string' && f.source.trim() ? { source: f.source.trim() } : {}),
    ...(typeof f.verified === 'boolean' ? { verified: f.verified } : {}),
    ...(f.isCustom ? { isCustom: true } : {}),
    ...(f.isRecipe ? { isRecipe: true } : {}),
  }
}

export function sanitizeFoodList(raw: unknown): FoodItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: FoodItem[] = []
  for (const item of raw) {
    const clean = sanitizeImportedFood(item)
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id)
      result.push(clean)
    }
  }
  return result
}

export function sanitizeFoodOverrides(raw: unknown): Record<string, FoodOverrideRecord> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, FoodOverrideRecord> = {}
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!id.trim() || !entry || typeof entry !== 'object') continue
    const rec = entry as Partial<FoodOverrideRecord>
    const cleanFood = sanitizeImportedFood(rec.food ?? entry)
    if (!cleanFood) continue
    result[id.trim()] = {
      food: { ...cleanFood, id: id.trim(), isCustom: false, isOverridden: true },
      baseCatalogVersion:
        typeof rec.baseCatalogVersion === 'string' && rec.baseCatalogVersion.trim()
          ? rec.baseCatalogVersion.trim()
          : 'legacy',
      updatedAt:
        typeof rec.updatedAt === 'number' && Number.isFinite(rec.updatedAt) && rec.updatedAt > 0
          ? rec.updatedAt
          : Date.now(),
    }
  }
  return result
}

/** Sanitizes an untrusted LoggedFoodEntry object so invalid mealType/NaN values never crash TodayMealsList. */
export function sanitizeImportedEntry(raw: unknown): LoggedFoodEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Partial<LoggedFoodEntry>
  if (typeof e.id !== 'string' || !e.id.trim()) return null
  if (typeof e.dateKey !== 'string' || !DATE_KEY_REGEX.test(e.dateKey)) return null
  if (typeof e.foodName !== 'string' || !e.foodName.trim()) return null
  if (!isFiniteNonNegative(e.kcal)) return null

  const mealType: MealType =
    typeof e.mealType === 'string' && VALID_MEAL_TYPES.has(e.mealType as MealType)
      ? (e.mealType as MealType)
      : 'snack'

  const quantity =
    typeof e.quantity === 'number' && Number.isFinite(e.quantity) && e.quantity > 0
      ? e.quantity
      : 1

  const per100g = sanitizeOptionalPer100g(e.per100g)

  return {
    id: e.id.trim(),
    dateKey: e.dateKey,
    timestamp:
      typeof e.timestamp === 'number' && Number.isFinite(e.timestamp) && e.timestamp > 0
        ? e.timestamp
        : Date.now(),
    mealType,
    foodId: typeof e.foodId === 'string' && e.foodId.trim() ? e.foodId.trim() : 'custom',
    foodName: e.foodName.trim(),
    quantity,
    unit: typeof e.unit === 'string' && e.unit.trim() ? e.unit.trim() : 'پرس',
    totalGrams:
      typeof e.totalGrams === 'number' && Number.isFinite(e.totalGrams) && e.totalGrams > 0
        ? e.totalGrams
        : 100,
    kcal: Math.round(e.kcal),
    protein: isFiniteNonNegative(e.protein) ? e.protein : 0,
    carbs: isFiniteNonNegative(e.carbs) ? e.carbs : 0,
    fat: isFiniteNonNegative(e.fat) ? e.fat : 0,
    ...(per100g ? { per100g } : {}),
    ...(typeof e.sourceText === 'string' ? { sourceText: e.sourceText } : {}),
  }
}

export function sanitizeEntryList(raw: unknown): LoggedFoodEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: LoggedFoodEntry[] = []
  for (const item of raw) {
    const clean = sanitizeImportedEntry(item)
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id)
      out.push(clean)
    }
  }
  return out
}

/** Sanitizes water intake map (YYYY-MM-DD -> clamped integer 0..30). */
export function sanitizeWaterMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const clean: Record<string, number> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (DATE_KEY_REGEX.test(key) && typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      const clamped = Math.min(30, Math.round(val))
      if (clamped > 0) {
        clean[key] = clamped
      }
    }
  }
  return clean
}

/** Sanitizes a single WeightEntry record (25..300 kg, valid YYYY-MM-DD). */
export function sanitizeWeightEntry(raw: unknown): WeightEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const w = raw as Partial<WeightEntry>
  if (typeof w.dateKey !== 'string' || !DATE_KEY_REGEX.test(w.dateKey)) return null
  if (
    typeof w.weightKg !== 'number' ||
    !Number.isFinite(w.weightKg) ||
    w.weightKg < 25 ||
    w.weightKg > 300
  ) {
    return null
  }
  return {
    dateKey: w.dateKey,
    weightKg: Math.round(w.weightKg * 10) / 10,
    updatedAt:
      typeof w.updatedAt === 'number' && Number.isFinite(w.updatedAt) && w.updatedAt > 0
        ? w.updatedAt
        : Date.now(),
  }
}

/** Sanitizes, deduplicates by dateKey (keeping latest updatedAt), and sorts WeightEntry[] ascending. */
export function sanitizeWeightList(raw: unknown): WeightEntry[] {
  if (!Array.isArray(raw)) return []
  const byDate = new Map<string, WeightEntry>()
  for (const item of raw) {
    const clean = sanitizeWeightEntry(item)
    if (!clean) continue
    const prev = byDate.get(clean.dateKey)
    if (!prev || clean.updatedAt >= prev.updatedAt) {
      byDate.set(clean.dateKey, clean)
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

export function sanitizeTemplateItem(raw: unknown): MealTemplateItem | null {
  if (!raw || typeof raw !== 'object') return null
  const it = raw as Partial<MealTemplateItem>
  if (typeof it.foodName !== 'string' || !it.foodName.trim()) return null
  if (!isFiniteNonNegative(it.kcal)) return null

  const quantity =
    typeof it.quantity === 'number' && Number.isFinite(it.quantity) && it.quantity > 0
      ? it.quantity
      : 1

  return {
    foodId: typeof it.foodId === 'string' && it.foodId.trim() ? it.foodId.trim() : 'custom',
    foodName: it.foodName.trim(),
    quantity,
    unit: typeof it.unit === 'string' && it.unit.trim() ? it.unit.trim() : 'پرس',
    totalGrams:
      typeof it.totalGrams === 'number' && Number.isFinite(it.totalGrams) && it.totalGrams > 0
        ? it.totalGrams
        : 100,
    kcal: Math.round(it.kcal),
    protein: isFiniteNonNegative(it.protein) ? it.protein : 0,
    carbs: isFiniteNonNegative(it.carbs) ? it.carbs : 0,
    fat: isFiniteNonNegative(it.fat) ? it.fat : 0,
  }
}

export function sanitizeTemplate(raw: unknown): MealTemplate | null {
  if (!raw || typeof raw !== 'object') return null
  const t = raw as Partial<MealTemplate>
  if (typeof t.id !== 'string' || !t.id.trim()) return null
  if (typeof t.name !== 'string' || !t.name.trim()) return null
  if (!Array.isArray(t.items) || t.items.length === 0) return null

  const cleanItems = t.items
    .map(sanitizeTemplateItem)
    .filter((it): it is MealTemplateItem => it !== null)
  if (cleanItems.length === 0) return null

  const mealType: MealType =
    typeof t.mealType === 'string' && VALID_MEAL_TYPES.has(t.mealType as MealType)
      ? (t.mealType as MealType)
      : 'snack'

  return {
    id: t.id.trim(),
    name: t.name.trim(),
    mealType,
    items: cleanItems,
    createdAt:
      typeof t.createdAt === 'number' && Number.isFinite(t.createdAt) && t.createdAt > 0
        ? t.createdAt
        : Date.now(),
  }
}

export function sanitizeTemplateList(raw: unknown): MealTemplate[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: MealTemplate[] = []
  for (const item of raw) {
    const clean = sanitizeTemplate(item)
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id)
      out.push(clean)
    }
  }
  return out
}

export function normalizeGoals(raw: Partial<UserGoals> | null | undefined): UserGoals {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_GOALS
  return {
    dailyKcal:
      typeof raw.dailyKcal === 'number' && Number.isFinite(raw.dailyKcal) && raw.dailyKcal >= 800
        ? Math.min(8000, Math.round(raw.dailyKcal))
        : DEFAULT_USER_GOALS.dailyKcal,
    proteinGrams:
      typeof raw.proteinGrams === 'number' &&
      Number.isFinite(raw.proteinGrams) &&
      raw.proteinGrams >= 20
        ? Math.min(500, Math.round(raw.proteinGrams))
        : DEFAULT_USER_GOALS.proteinGrams,
    carbsGrams:
      typeof raw.carbsGrams === 'number' && Number.isFinite(raw.carbsGrams) && raw.carbsGrams >= 20
        ? Math.min(1000, Math.round(raw.carbsGrams))
        : DEFAULT_USER_GOALS.carbsGrams,
    fatGrams:
      typeof raw.fatGrams === 'number' && Number.isFinite(raw.fatGrams) && raw.fatGrams >= 15
        ? Math.min(350, Math.round(raw.fatGrams))
        : DEFAULT_USER_GOALS.fatGrams,
    waterGoalGlasses:
      typeof raw.waterGoalGlasses === 'number' &&
      Number.isFinite(raw.waterGoalGlasses) &&
      raw.waterGoalGlasses >= 4
        ? Math.min(25, Math.round(raw.waterGoalGlasses))
        : DEFAULT_USER_GOALS.waterGoalGlasses,
  }
}
