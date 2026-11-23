import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import {
  DEFAULT_USER_GOALS,
  type AppBackupData,
  type FoodItem,
  type LoggedFoodEntry,
  type MealTemplate,
  type MealType,
  type ParsedFoodItem,
  type ThemeMode,
  type UserGoals,
  type WeightEntry,
} from '../types/nutrition'
import { buildEntriesCsv } from '../utils/csvExport'
import { calculateFoodMacros } from '../utils/persianFoodParser'
import { shiftDateKey } from '../utils/persianFormat'
import {
  STORAGE_KEYS,
  STORAGE_SCHEMA_VERSION,
  readStorageJson,
  requestPersistentStorage,
  runStorageMigrations,
  writeStorageJson,
} from '../utils/storageMigration'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

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

function normalizeGoals(raw: Partial<UserGoals> | null): UserGoals {
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_GOALS
  return {
    dailyKcal:
      typeof raw.dailyKcal === 'number' && raw.dailyKcal >= 800
        ? Math.round(raw.dailyKcal)
        : DEFAULT_USER_GOALS.dailyKcal,
    proteinGrams:
      typeof raw.proteinGrams === 'number' && raw.proteinGrams >= 20
        ? Math.round(raw.proteinGrams)
        : DEFAULT_USER_GOALS.proteinGrams,
    carbsGrams:
      typeof raw.carbsGrams === 'number' && raw.carbsGrams >= 20
        ? Math.round(raw.carbsGrams)
        : DEFAULT_USER_GOALS.carbsGrams,
    fatGrams:
      typeof raw.fatGrams === 'number' && raw.fatGrams >= 15
        ? Math.round(raw.fatGrams)
        : DEFAULT_USER_GOALS.fatGrams,
    waterGoalGlasses:
      typeof raw.waterGoalGlasses === 'number' && raw.waterGoalGlasses >= 4
        ? Math.round(raw.waterGoalGlasses)
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

// Run deterministic v1 -> v2 schema migration before initial state hydration
runStorageMigrations()

export function useNutritionStore() {
  const [foods, setFoods] = useState<FoodItem[]>(() =>
    mergeDefaultCatalog(readStorageJson<FoodItem[] | null>(STORAGE_KEYS.foods, null)),
  )
  const [entries, setEntries] = useState<LoggedFoodEntry[]>(() => {
    const raw = readStorageJson<LoggedFoodEntry[] | null>(STORAGE_KEYS.entries, null)
    return Array.isArray(raw) ? raw : []
  })
  const [goals, setGoals] = useState<UserGoals>(() =>
    normalizeGoals(readStorageJson<Partial<UserGoals> | null>(STORAGE_KEYS.goals, null)),
  )
  const [waterByDate, setWaterByDate] = useState<Record<string, number>>(() => {
    const raw = readStorageJson<Record<string, number> | null>(STORAGE_KEYS.water, null)
    return raw && typeof raw === 'object' ? raw : {}
  })
  const [weights, setWeights] = useState<WeightEntry[]>(() => {
    const raw = readStorageJson<WeightEntry[] | null>(STORAGE_KEYS.weights, null)
    return Array.isArray(raw) ? raw : []
  })
  const [templates, setTemplates] = useState<MealTemplate[]>(() => {
    const raw = readStorageJson<MealTemplate[] | null>(STORAGE_KEYS.templates, null)
    return Array.isArray(raw) ? raw : []
  })
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const raw = readStorageJson<ThemeMode | null>(STORAGE_KEYS.theme, null)
    return raw === 'light' ? 'light' : 'dark'
  })
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => {
    const raw = readStorageJson<number | null>(STORAGE_KEYS.lastBackupAt, null)
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  })

  const [storageError, setStorageError] = useState<string | null>(null)
  const [persistenceState, setPersistenceState] = useState<
    'checking' | 'persisted' | 'not_persisted' | 'unsupported'
  >('checking')

  const entriesRef = useRef<LoggedFoodEntry[]>(entries)
  const foodsRef = useRef<FoodItem[]>(foods)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    foodsRef.current = foods
  }, [foods])

  // Request durable browser storage via StorageManager API
  useEffect(() => {
    let active = true
    requestPersistentStorage().then((status) => {
      if (active) setPersistenceState(status)
    })
    return () => {
      active = false
    }
  }, [])

  // Apply light/dark root theme class cleanly
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#0C0C0D' : '#F6F7F9')
    }
  }, [theme])

  const persistWithFeedback = useCallback(<T,>(key: string, value: T) => {
    const res = writeStorageJson(key, value)
    if (!res.ok) {
      const msg = res.error ?? 'خطا در ذخیره‌سازی محلی'
      queueMicrotask(() => setStorageError(msg))
    }
  }, [])

  useEffect(() => {
    persistWithFeedback(STORAGE_KEYS.foods, foods)
  }, [foods, persistWithFeedback])

  useEffect(() => {
    persistWithFeedback(STORAGE_KEYS.entries, entries)
  }, [entries, persistWithFeedback])

  useEffect(() => {
    persistWithFeedback(STORAGE_KEYS.goals, goals)
  }, [goals, persistWithFeedback])

  useEffect(() => {
    persistWithFeedback(STORAGE_KEYS.water, waterByDate)
  }, [waterByDate, persistWithFeedback])

  useEffect(() => {
    persistWithFeedback(STORAGE_KEYS.weights, weights)
  }, [weights, persistWithFeedback])

  useEffect(() => {
    persistWithFeedback(STORAGE_KEYS.templates, templates)
  }, [templates, persistWithFeedback])

  useEffect(() => {
    persistWithFeedback(STORAGE_KEYS.theme, theme)
  }, [theme, persistWithFeedback])

  useEffect(() => {
    if (lastBackupAt !== null) {
      persistWithFeedback(STORAGE_KEYS.lastBackupAt, lastBackupAt)
    }
  }, [lastBackupAt, persistWithFeedback])

  // Real-time Cross-Tab Synchronization via window 'storage' event
  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (!event.key || !event.newValue) return
      try {
        switch (event.key) {
          case STORAGE_KEYS.foods: {
            const next = JSON.parse(event.newValue) as FoodItem[]
            if (Array.isArray(next)) setFoods(mergeDefaultCatalog(next))
            break
          }
          case STORAGE_KEYS.entries: {
            const next = JSON.parse(event.newValue) as LoggedFoodEntry[]
            if (Array.isArray(next)) setEntries(next)
            break
          }
          case STORAGE_KEYS.goals: {
            setGoals(normalizeGoals(JSON.parse(event.newValue) as Partial<UserGoals>))
            break
          }
          case STORAGE_KEYS.water: {
            const next = JSON.parse(event.newValue) as Record<string, number>
            if (next && typeof next === 'object') setWaterByDate(next)
            break
          }
          case STORAGE_KEYS.weights: {
            const next = JSON.parse(event.newValue) as WeightEntry[]
            if (Array.isArray(next)) setWeights(next)
            break
          }
          case STORAGE_KEYS.templates: {
            const next = JSON.parse(event.newValue) as MealTemplate[]
            if (Array.isArray(next)) setTemplates(next)
            break
          }
          case STORAGE_KEYS.theme: {
            const next = JSON.parse(event.newValue) as ThemeMode
            if (next === 'dark' || next === 'light') setTheme(next)
            break
          }
          case STORAGE_KEYS.lastBackupAt: {
            const next = JSON.parse(event.newValue) as number
            if (typeof next === 'number') setLastBackupAt(next)
            break
          }
          default:
            break
        }
      } catch {
        // Ignore malformed external tab value
      }
    }

    window.addEventListener('storage', handleStorageSync)
    return () => window.removeEventListener('storage', handleStorageSync)
  }, [])

  const [mountNow] = useState(() => Date.now())

  // Weekly backup reminder condition (triggers if user has >= 5 entries and > 7 days since last backup)
  const shouldRemindBackup = useMemo(() => {
    if (entries.length < 5) return false
    if (lastBackupAt === null) {
      const distinctDays = new Set(entries.map((e) => e.dateKey)).size
      return distinctDays >= 2 || entries.length >= 10
    }
    return mountNow - lastBackupAt >= SEVEN_DAYS_MS
  }, [entries, lastBackupAt, mountNow])

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

  /** Supports inline editing of quantity, unit (recalculating via food catalog), and meal category. */
  const updateEntry = useCallback(
    (entryId: string, patch: { quantity?: number; unit?: string; mealType?: MealType }) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry
          const nextMealType = patch.mealType ?? entry.mealType
          const nextUnit = patch.unit ?? entry.unit

          // Unit change: recalculate precisely from matching FoodItem in catalog
          if (patch.unit !== undefined && patch.unit !== entry.unit) {
            const matchedFood = foodsRef.current.find((f) => f.id === entry.foodId)
            if (matchedFood) {
              const targetUnitObj =
                matchedFood.units.find((u) => u.name === nextUnit) ??
                (nextUnit === 'گرم' ? { name: 'گرم', grams: 1 } : null)
              if (targetUnitObj) {
                const wasWeight = entry.unit === 'گرم' || entry.unit === 'میلی‌لیتر'
                const isNextWeight =
                  targetUnitObj.name === 'گرم' || targetUnitObj.name === 'میلی‌لیتر'
                let nextQty = patch.quantity ?? entry.quantity
                if (patch.quantity === undefined) {
                  if (!wasWeight && isNextWeight) {
                    nextQty = Math.max(10, Math.round(entry.totalGrams))
                  } else if (wasWeight && !isNextWeight) {
                    nextQty = Math.max(
                      0.5,
                      Math.round((entry.totalGrams / targetUnitObj.grams) * 2) / 2,
                    )
                  }
                }
                const calc = calculateFoodMacros(matchedFood, nextQty, targetUnitObj.grams)
                return {
                  ...entry,
                  mealType: nextMealType,
                  unit: targetUnitObj.name,
                  quantity: nextQty,
                  ...calc,
                }
              }
            }
          }

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

  const upsertWeight = useCallback((dateKey: string, weightKg: number) => {
    const cleanWeight = Math.round(Math.max(25, Math.min(300, weightKg)) * 10) / 10
    setWeights((prev) => {
      const filtered = prev.filter((w) => w.dateKey !== dateKey)
      return [...filtered, { dateKey, weightKg: cleanWeight, updatedAt: Date.now() }].sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey),
      )
    })
  }, [])

  const deleteWeight = useCallback((dateKey: string) => {
    setWeights((prev) => prev.filter((w) => w.dateKey !== dateKey))
  }, [])

  const saveMealTemplate = useCallback(
    (name: string, mealType: MealType, groupEntries: LoggedFoodEntry[]): MealTemplate => {
      const created: MealTemplate = {
        id: generateId('tpl'),
        name: name.trim(),
        mealType,
        createdAt: Date.now(),
        items: groupEntries.map((e) => ({
          foodId: e.foodId,
          foodName: e.foodName,
          quantity: e.quantity,
          unit: e.unit,
          totalGrams: e.totalGrams,
          kcal: e.kcal,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
        })),
      }
      setTemplates((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const deleteMealTemplate = useCallback((templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId))
  }, [])

  const applyMealTemplate = useCallback(
    (template: MealTemplate, targetDateKey: string, overrideMealType?: MealType) => {
      const now = Date.now()
      const mealType = overrideMealType ?? template.mealType
      const created: LoggedFoodEntry[] = template.items.map((item, idx) => ({
        ...item,
        id: generateId(`tpl-log-${idx}`),
        dateKey: targetDateKey,
        timestamp: now + idx,
        mealType,
      }))
      setEntries((prev) => [...created, ...prev])
      return created
    },
    [],
  )

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
    setGoals(normalizeGoals(nextGoals))
  }, [])

  const clearAllEntries = useCallback(() => {
    setEntries([])
    setWaterByDate({})
    setWeights([])
  }, [])

  const exportBackupJson = useCallback((): string => {
    const payload: AppBackupData = {
      version: STORAGE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      goals,
      foods,
      entries,
      waterByDate,
      weights,
      templates,
    }
    setLastBackupAt(Date.now())
    return JSON.stringify(payload, null, 2)
  }, [entries, foods, goals, templates, waterByDate, weights])

  const exportEntriesCsv = useCallback((): string => {
    return buildEntriesCsv(entries)
  }, [entries])

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

        if (Array.isArray(parsed.weights)) {
          const cleanWeights = parsed.weights.filter(
            (w) =>
              w &&
              typeof w.dateKey === 'string' &&
              typeof w.weightKg === 'number' &&
              w.weightKg >= 25 &&
              w.weightKg <= 300,
          )
          setWeights(cleanWeights)
        }

        if (Array.isArray(parsed.templates)) {
          const cleanTemplates = parsed.templates.filter(
            (t) => t && typeof t.id === 'string' && typeof t.name === 'string' && Array.isArray(t.items),
          )
          setTemplates(cleanTemplates)
        }

        if (parsed.goals && typeof parsed.goals.dailyKcal === 'number') {
          setGoals(normalizeGoals(parsed.goals))
        }

        setLastBackupAt(Date.now())

        return {
          ok: true,
          stats: { foods: validFoods.length, entries: validEntries.length },
        }
      } catch {
        return { ok: false, error: 'خطا در خواندن فایل JSON. لطفاً یک فایل پشتیبان سالم انتخاب کنید.' }
      }
    },
    [],
  )

  return {
    foods,
    entries,
    goals,
    waterByDate,
    weights,
    templates,
    theme,
    lastBackupAt,
    storageError,
    persistenceState,
    shouldRemindBackup,
    setTheme,
    dismissStorageError: () => setStorageError(null),
    logParsedItems,
    deleteEntry,
    restoreEntry,
    updateEntry,
    repeatEntries,
    adjustWater,
    upsertWeight,
    deleteWeight,
    saveMealTemplate,
    deleteMealTemplate,
    applyMealTemplate,
    addFood,
    updateFood,
    deleteFood,
    resetDefaultFoods,
    updateGoals,
    clearAllEntries,
    exportBackupJson,
    exportEntriesCsv,
    importBackupJson,
  }
}
