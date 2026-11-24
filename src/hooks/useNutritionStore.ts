import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_IRANIAN_FOODS } from '../data/iranianFoods'
import {
  DEFAULT_USER_GOALS,
  MEAL_TYPE_ORDER,
  type AppBackupData,
  type FoodCategory,
  type FoodItem,
  type FoodUnit,
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
const VALID_CATEGORIES = new Set<FoodCategory>([
  'stews_mains',
  'rice_breads',
  'breakfast_dairy',
  'drinks_snacks',
])
const VALID_MEAL_TYPES = new Set<MealType>(MEAL_TYPE_ORDER)
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isFiniteNonNegative(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0
}

/** Sanitizes an untrusted FoodItem object (from JSON backup or storage) so invalid fields never crash the UI or parser. */
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
        ? { aliases: u.aliases.filter((a): a is string => typeof a === 'string' && a.trim().length > 0) }
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
    ...(f.isCustom ? { isCustom: true } : {}),
    ...(f.isRecipe ? { isRecipe: true } : {}),
  }
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
    totalGrams: isFiniteNonNegative(e.totalGrams) ? e.totalGrams : 100,
    kcal: Math.round(e.kcal),
    protein: isFiniteNonNegative(e.protein) ? e.protein : 0,
    carbs: isFiniteNonNegative(e.carbs) ? e.carbs : 0,
    fat: isFiniteNonNegative(e.fat) ? e.fat : 0,
    ...(typeof e.sourceText === 'string' ? { sourceText: e.sourceText } : {}),
  }
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
  const [initialCatalogUpgraded] = useState<{ foods: FoodItem[]; needsWrite: boolean }>(() => {
    const raw = readStorageJson<FoodItem[] | null>(STORAGE_KEYS.foods, null)
    const sanitized = Array.isArray(raw)
      ? raw.map(sanitizeImportedFood).filter((f): f is FoodItem => f !== null)
      : null
    const merged = mergeDefaultCatalog(sanitized)
    const needsWrite = sanitized !== null && merged.length !== sanitized.length
    return { foods: merged, needsWrite }
  })

  const [foods, setFoods] = useState<FoodItem[]>(initialCatalogUpgraded.foods)
  const [entries, setEntries] = useState<LoggedFoodEntry[]>(() => {
    const raw = readStorageJson<unknown[] | null>(STORAGE_KEYS.entries, null)
    return Array.isArray(raw)
      ? raw.map(sanitizeImportedEntry).filter((e): e is LoggedFoodEntry => e !== null)
      : []
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
  const hydratedKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    foodsRef.current = foods
  }, [foods])

  useEffect(() => {
    let active = true
    requestPersistentStorage().then((status) => {
      if (active) setPersistenceState(status)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#0C0C0D' : '#F4F5F7')
    }
  }, [theme])

  const persistOnChange = useCallback(<T,>(key: string, value: T, forceInitial = false) => {
    if (!hydratedKeysRef.current.has(key)) {
      hydratedKeysRef.current.add(key)
      // Skip redundant ~100KB JSON re-serialization on initial mount if key already exists & wasn't upgraded
      if (!forceInitial && typeof window !== 'undefined' && window.localStorage.getItem(key) !== null) {
        return
      }
    }
    const res = writeStorageJson(key, value)
    if (!res.ok) {
      const msg = res.error ?? 'خطا در ذخیره‌سازی محلی'
      queueMicrotask(() => setStorageError(msg))
    }
  }, [])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.foods, foods, initialCatalogUpgraded.needsWrite)
  }, [foods, initialCatalogUpgraded.needsWrite, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.entries, entries)
  }, [entries, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.goals, goals)
  }, [goals, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.water, waterByDate)
  }, [waterByDate, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.weights, weights)
  }, [weights, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.templates, templates)
  }, [templates, persistOnChange])

  useEffect(() => {
    persistOnChange(STORAGE_KEYS.theme, theme)
  }, [theme, persistOnChange])

  useEffect(() => {
    if (lastBackupAt !== null) {
      persistOnChange(STORAGE_KEYS.lastBackupAt, lastBackupAt)
    }
  }, [lastBackupAt, persistOnChange])

  // Real-time Cross-Tab Synchronization via window 'storage' event
  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (!event.key || !event.newValue) return
      try {
        switch (event.key) {
          case STORAGE_KEYS.foods: {
            const next = JSON.parse(event.newValue) as unknown[]
            if (Array.isArray(next)) {
              const clean = next.map(sanitizeImportedFood).filter((f): f is FoodItem => f !== null)
              setFoods(mergeDefaultCatalog(clean))
            }
            break
          }
          case STORAGE_KEYS.entries: {
            const next = JSON.parse(event.newValue) as unknown[]
            if (Array.isArray(next)) {
              setEntries(
                next.map(sanitizeImportedEntry).filter((e): e is LoggedFoodEntry => e !== null),
              )
            }
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

  const updateEntry = useCallback(
    (entryId: string, patch: { quantity?: number; unit?: string; mealType?: MealType }) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry
          const nextMealType = patch.mealType ?? entry.mealType
          const nextUnit = patch.unit ?? entry.unit

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

        const seenFoodIds = new Set<string>()
        const validFoods: FoodItem[] = []
        for (const item of parsed.foods) {
          const clean = sanitizeImportedFood(item)
          if (clean && !seenFoodIds.has(clean.id)) {
            seenFoodIds.add(clean.id)
            validFoods.push(clean)
          }
        }

        const seenEntryIds = new Set<string>()
        const validEntries: LoggedFoodEntry[] = []
        for (const entry of parsed.entries) {
          const clean = sanitizeImportedEntry(entry)
          if (clean && !seenEntryIds.has(clean.id)) {
            seenEntryIds.add(clean.id)
            validEntries.push(clean)
          }
        }

        if (validFoods.length === 0) {
          return { ok: false, error: 'هیچ غذای معتبری در فایل پشتیبان یافت نشد.' }
        }

        setFoods(mergeDefaultCatalog(validFoods))
        setEntries(validEntries)

        if (parsed.waterByDate && typeof parsed.waterByDate === 'object') {
          const cleanWater: Record<string, number> = {}
          for (const [k, v] of Object.entries(parsed.waterByDate)) {
            if (DATE_KEY_REGEX.test(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
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
              DATE_KEY_REGEX.test(w.dateKey) &&
              typeof w.weightKg === 'number' &&
              Number.isFinite(w.weightKg) &&
              w.weightKg >= 25 &&
              w.weightKg <= 300,
          )
          setWeights(cleanWeights)
        }

        if (Array.isArray(parsed.templates)) {
          const cleanTemplates = parsed.templates.filter(
            (t) =>
              t &&
              typeof t.id === 'string' &&
              typeof t.name === 'string' &&
              VALID_MEAL_TYPES.has(t.mealType) &&
              Array.isArray(t.items),
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
