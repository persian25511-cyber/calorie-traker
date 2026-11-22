import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import {
  DEFAULT_USER_GOALS,
  type AppBackupData,
  type FoodItem,
  type LoggedFoodEntry,
  type MealType,
  type ParsedFoodItem,
  type UserGoals,
} from '../types/nutrition'
import { shiftDateKey } from '../utils/persianFormat'

const STORAGE_KEYS = {
  foods: 'kalorishomar_v1_foods',
  entries: 'kalorishomar_v1_entries',
  goals: 'kalorishomar_v1_goals',
  water: 'kalorishomar_v1_water',
  catalogCount: 'kalorishomar_v1_catalog_count',
} as const

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Merges newly added built-in foods from newer app releases into existing users'
 * stored food catalog without overwriting user edits or custom dishes.
 */
export function mergeDefaultCatalog(stored: FoodItem[] | null): FoodItem[] {
  if (!Array.isArray(stored) || stored.length === 0) {
    return DEFAULT_IRANIAN_FOODS
  }
  const existingIds = new Set(stored.map((f) => f.id))
  const newlyReleased = DEFAULT_IRANIAN_FOODS.filter((f) => !existingIds.has(f.id))
  if (newlyReleased.length === 0) return stored
  return [...stored, ...newlyReleased]
}

function loadInitialFoods(): FoodItem[] {
  const stored = safeReadJson<FoodItem[] | null>(STORAGE_KEYS.foods, null)
  return mergeDefaultCatalog(stored)
}

function loadInitialEntries(): LoggedFoodEntry[] {
  const stored = safeReadJson<LoggedFoodEntry[] | null>(STORAGE_KEYS.entries, null)
  if (!Array.isArray(stored)) return []
  return stored
}

function loadInitialWater(): Record<string, number> {
  const stored = safeReadJson<Record<string, number> | null>(STORAGE_KEYS.water, null)
  if (!stored || typeof stored !== 'object') return {}
  return stored
}

function loadInitialGoals(): UserGoals {
  const stored = safeReadJson<Partial<UserGoals> | null>(STORAGE_KEYS.goals, null)
  if (!stored || typeof stored !== 'object') return DEFAULT_USER_GOALS
  return {
    dailyKcal:
      typeof stored.dailyKcal === 'number' && stored.dailyKcal >= 800
        ? Math.round(stored.dailyKcal)
        : DEFAULT_USER_GOALS.dailyKcal,
    proteinGrams:
      typeof stored.proteinGrams === 'number' && stored.proteinGrams >= 20
        ? Math.round(stored.proteinGrams)
        : DEFAULT_USER_GOALS.proteinGrams,
    carbsGrams:
      typeof stored.carbsGrams === 'number' && stored.carbsGrams >= 20
        ? Math.round(stored.carbsGrams)
        : DEFAULT_USER_GOALS.carbsGrams,
    fatGrams:
      typeof stored.fatGrams === 'number' && stored.fatGrams >= 15
        ? Math.round(stored.fatGrams)
        : DEFAULT_USER_GOALS.fatGrams,
    waterGoalGlasses:
      typeof stored.waterGoalGlasses === 'number' && stored.waterGoalGlasses >= 4
        ? Math.round(stored.waterGoalGlasses)
        : DEFAULT_USER_GOALS.waterGoalGlasses,
  }
}

/** Calculates current consecutive days with at least one logged meal ending today or yesterday. */
export function computeLoggingStreak(entries: LoggedFoodEntry[], todayKey: string): number {
  if (entries.length === 0) return 0
  const loggedDays = new Set(entries.map((e) => e.dateKey))

  let cursor = loggedDays.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1)
  if (!loggedDays.has(cursor)) return 0

  let streak = 0
  while (loggedDays.has(cursor)) {
    streak++
    cursor = shiftDateKey(cursor, -1)
  }
  return streak
}

export function useNutritionStore() {
  const [foods, setFoods] = useState<FoodItem[]>(loadInitialFoods)
  const [entries, setEntries] = useState<LoggedFoodEntry[]>(loadInitialEntries)
  const [goals, setGoals] = useState<UserGoals>(loadInitialGoals)
  const [waterByDate, setWaterByDate] = useState<Record<string, number>>(loadInitialWater)

  const entriesRef = useRef<LoggedFoodEntry[]>(entries)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    safeWriteJson(STORAGE_KEYS.foods, foods)
    safeWriteJson(STORAGE_KEYS.catalogCount, DEFAULT_IRANIAN_FOODS.length)
  }, [foods])

  useEffect(() => {
    safeWriteJson(STORAGE_KEYS.entries, entries)
  }, [entries])

  useEffect(() => {
    safeWriteJson(STORAGE_KEYS.goals, goals)
  }, [goals])

  useEffect(() => {
    safeWriteJson(STORAGE_KEYS.water, waterByDate)
  }, [waterByDate])

  const logParsedItems = useCallback(
    (
      parsedItems: ParsedFoodItem[],
      mealType: MealType,
      dateKey: string,
      sourceText?: string,
    ): LoggedFoodEntry[] => {
      const now = Date.now()
      const newEntries: LoggedFoodEntry[] = parsedItems.map((item, idx) => ({
        id: generateId(`log-${idx}`),
        dateKey,
        timestamp: now + idx,
        mealType,
        foodId: item.food.id,
        foodName: item.food.name,
        quantity: item.quantity,
        unit: item.unit,
        totalGrams: item.totalGrams,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        sourceText,
      }))

      setEntries((prev) => [...newEntries, ...prev])
      return newEntries
    },
    [],
  )

  const deleteEntry = useCallback((entryId: string): LoggedFoodEntry | null => {
    const found = entriesRef.current.find((e) => e.id === entryId) ?? null
    if (found) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
    }
    return found
  }, [])

  const restoreEntry = useCallback((entry: LoggedFoodEntry) => {
    setEntries((prev) => {
      if (prev.some((e) => e.id === entry.id)) return prev
      return [entry, ...prev]
    })
  }, [])

  const updateEntry = useCallback(
    (entryId: string, patch: { quantity?: number; mealType?: MealType }) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry
          const nextMealType = patch.mealType ?? entry.mealType
          if (patch.quantity === undefined || patch.quantity === entry.quantity) {
            return { ...entry, mealType: nextMealType }
          }
          const safeQty = Math.max(0.1, Math.round(patch.quantity * 100) / 100)
          const ratio = entry.quantity > 0 ? safeQty / entry.quantity : 1
          return {
            ...entry,
            mealType: nextMealType,
            quantity: safeQty,
            totalGrams: Math.round(entry.totalGrams * ratio * 10) / 10,
            kcal: Math.round(entry.kcal * ratio),
            protein: Math.round(entry.protein * ratio * 10) / 10,
            carbs: Math.round(entry.carbs * ratio * 10) / 10,
            fat: Math.round(entry.fat * ratio * 10) / 10,
          }
        }),
      )
    },
    [],
  )

  const repeatEntries = useCallback(
    (itemsToRepeat: LoggedFoodEntry[], targetMealType: MealType, targetDateKey: string) => {
      const now = Date.now()
      const cloned: LoggedFoodEntry[] = itemsToRepeat.map((item, idx) => ({
        ...item,
        id: generateId(`rep-${idx}`),
        dateKey: targetDateKey,
        mealType: targetMealType,
        timestamp: now + idx,
      }))
      setEntries((prev) => [...cloned, ...prev])
      return cloned
    },
    [],
  )

  const adjustWater = useCallback((dateKey: string, delta: number) => {
    setWaterByDate((prev) => {
      const current = prev[dateKey] ?? 0
      const next = Math.max(0, Math.min(30, current + delta))
      return { ...prev, [dateKey]: next }
    })
  }, [])

  const addFood = useCallback((foodInput: Omit<FoodItem, 'id'>): FoodItem => {
    const hasGramUnit = foodInput.units.some((u) => u.name.trim() === 'گرم')
    const normalizedUnits = hasGramUnit
      ? foodInput.units
      : [...foodInput.units, { name: 'گرم', grams: 1 }]

    const created: FoodItem = {
      ...foodInput,
      id: generateId('food'),
      units: normalizedUnits,
      isCustom: true,
    }
    setFoods((prev) => [created, ...prev])
    return created
  }, [])

  const updateFood = useCallback((updated: FoodItem) => {
    const hasGramUnit = updated.units.some((u) => u.name.trim() === 'گرم')
    const normalized: FoodItem = {
      ...updated,
      units: hasGramUnit ? updated.units : [...updated.units, { name: 'گرم', grams: 1 }],
    }
    setFoods((prev) => prev.map((f) => (f.id === normalized.id ? normalized : f)))
  }, [])

  const deleteFood = useCallback((foodId: string) => {
    setFoods((prev) => prev.filter((f) => f.id !== foodId))
  }, [])

  const resetDefaultFoods = useCallback(() => {
    setFoods((prev) => {
      const customOnly = prev.filter((f) => f.isCustom)
      return [...customOnly, ...DEFAULT_IRANIAN_FOODS]
    })
  }, [])

  const updateGoals = useCallback((nextGoals: UserGoals) => {
    setGoals({
      dailyKcal: Math.max(800, Math.min(8000, Math.round(nextGoals.dailyKcal))),
      proteinGrams: Math.max(20, Math.min(500, Math.round(nextGoals.proteinGrams))),
      carbsGrams: Math.max(20, Math.min(1000, Math.round(nextGoals.carbsGrams))),
      fatGrams: Math.max(15, Math.min(300, Math.round(nextGoals.fatGrams))),
      waterGoalGlasses: Math.max(
        4,
        Math.min(20, Math.round(nextGoals.waterGoalGlasses || DEFAULT_USER_GOALS.waterGoalGlasses)),
      ),
    })
  }, [])

  const clearAllEntries = useCallback(() => {
    setEntries([])
    setWaterByDate({})
  }, [])

  const exportBackupJson = useCallback((): string => {
    const payload: AppBackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      goals,
      foods,
      entries,
      waterByDate,
    }
    return JSON.stringify(payload, null, 2)
  }, [entries, foods, goals, waterByDate])

  const importBackupJson = useCallback(
    (
      rawJson: string,
    ): { ok: boolean; error?: string; stats?: { foods: number; entries: number } } => {
      try {
        const parsed = JSON.parse(rawJson) as Partial<AppBackupData>
        if (!parsed || typeof parsed !== 'object') {
          return { ok: false, error: 'فرمت فایل پشتیبان معتبر نیست.' }
        }
        if (!Array.isArray(parsed.foods) || !Array.isArray(parsed.entries)) {
          return {
            ok: false,
            error: 'فایل انتخاب‌شده شامل ساختار صحیح غذاها و وعده‌ها نیست.',
          }
        }

        const validFoods = parsed.foods.filter(
          (f) =>
            f &&
            typeof f.id === 'string' &&
            typeof f.name === 'string' &&
            f.per100g &&
            typeof f.per100g.kcal === 'number' &&
            Array.isArray(f.units) &&
            f.units.length > 0,
        )

        const validEntries = parsed.entries.filter(
          (e) =>
            e &&
            typeof e.id === 'string' &&
            typeof e.dateKey === 'string' &&
            typeof e.foodName === 'string' &&
            typeof e.kcal === 'number',
        )

        if (validFoods.length === 0) {
          return { ok: false, error: 'هیچ غذای معتبری در فایل پشتیبان یافت نشد.' }
        }

        setFoods(mergeDefaultCatalog(validFoods))
        setEntries(validEntries)

        if (parsed.waterByDate && typeof parsed.waterByDate === 'object') {
          const cleanWater: Record<string, number> = {}
          for (const [k, v] of Object.entries(parsed.waterByDate)) {
            if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
              cleanWater[k] = Math.min(30, Math.round(v))
            }
          }
          setWaterByDate(cleanWater)
        }

        if (parsed.goals && typeof parsed.goals.dailyKcal === 'number') {
          updateGoals({
            dailyKcal: parsed.goals.dailyKcal,
            proteinGrams: parsed.goals.proteinGrams ?? DEFAULT_USER_GOALS.proteinGrams,
            carbsGrams: parsed.goals.carbsGrams ?? DEFAULT_USER_GOALS.carbsGrams,
            fatGrams: parsed.goals.fatGrams ?? DEFAULT_USER_GOALS.fatGrams,
            waterGoalGlasses:
              parsed.goals.waterGoalGlasses ?? DEFAULT_USER_GOALS.waterGoalGlasses,
          })
        }

        return {
          ok: true,
          stats: { foods: validFoods.length, entries: validEntries.length },
        }
      } catch {
        return {
          ok: false,
          error: 'خطا در خواندن فایل JSON. لطفاً یک فایل پشتیبان سالم انتخاب کنید.',
        }
      }
    },
    [updateGoals],
  )

  return {
    foods,
    entries,
    goals,
    waterByDate,
    logParsedItems,
    deleteEntry,
    restoreEntry,
    updateEntry,
    repeatEntries,
    adjustWater,
    addFood,
    updateFood,
    deleteFood,
    resetDefaultFoods,
    updateGoals,
    clearAllEntries,
    exportBackupJson,
    importBackupJson,
  }
}
