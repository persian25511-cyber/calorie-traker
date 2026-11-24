import { ChefHat, Edit3, Info, Plus, Search, Trash2, Utensils, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NUTRITION_DATA_SOURCES } from '../data/iranianFoods'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  FOOD_CATEGORY_LABELS,
  type FoodCategory,
  type FoodItem,
  type FoodUnit,
} from '../types/nutrition'
import { calculateFoodMacros, matchesFoodSearch } from '../utils/persianFoodParser'
import { formatFaNumber, toAsciiDigits } from '../utils/persianFormat'

interface FoodDatabaseTabProps {
  foods: FoodItem[]
  prefillNewFoodName: string | null
  onConsumePrefillName: () => void
  onAddFood: (food: Omit<FoodItem, 'id'>) => void
  onUpdateFood: (food: FoodItem) => void
  onDeleteFood: (id: string) => void
  onQuickUseFood: (food: FoodItem) => void
}

type CategoryFilter = 'all' | 'custom' | FoodCategory
type MacroInputMode = 'perUnit' | 'per100g'
type ModalMode = 'single' | 'recipe'

interface UnitDraft {
  name: string
  grams: string
}

interface RecipeIngredientDraft {
  foodId: string
  quantity: string
  unit: string
}

interface FoodFormState {
  editingId: string | null
  isCustom: boolean
  name: string
  aliasesText: string
  category: FoodCategory
  inputMode: MacroInputMode
  kcal: string
  protein: string
  carbs: string
  fat: string
  defaultUnitIndex: number
  units: UnitDraft[]
}

const CATEGORY_ORDER: FoodCategory[] = [
  'stews_mains',
  'rice_breads',
  'breakfast_dairy',
  'drinks_snacks',
]

function parsePositiveNum(raw: string, fallback = 0): number {
  const cleaned = toAsciiDigits(raw).replace(/٫/g, '.').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function createEmptyForm(prefillName = ''): FoodFormState {
  return {
    editingId: null,
    isCustom: true,
    name: prefillName,
    aliasesText: '',
    category: 'stews_mains',
    inputMode: 'perUnit',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
    defaultUnitIndex: 0,
    units: [{ name: 'کفگیر', grams: '120' }],
  }
}

function createFormFromFood(food: FoodItem): FoodFormState {
  const nonGramUnits = food.units.filter((u) => u.name !== 'گرم')
  const editableUnits =
    nonGramUnits.length > 0
      ? nonGramUnits.map((u) => ({ name: u.name, grams: String(u.grams) }))
      : [{ name: 'پرس', grams: '100' }]

  const defIdx = Math.max(
    0,
    editableUnits.findIndex((u) => u.name === food.defaultUnit),
  )

  return {
    editingId: food.id,
    isCustom: Boolean(food.isCustom),
    name: food.name,
    aliasesText: food.aliases.join('، '),
    category: food.category,
    inputMode: 'per100g',
    kcal: String(food.per100g.kcal),
    protein: String(food.per100g.protein),
    carbs: String(food.per100g.carbs),
    fat: String(food.per100g.fat),
    defaultUnitIndex: defIdx,
    units: editableUnits,
  }
}

export function FoodDatabaseTab({
  foods,
  prefillNewFoodName,
  onConsumePrefillName,
  onAddFood,
  onUpdateFood,
  onDeleteFood,
  onQuickUseFood,
}: FoodDatabaseTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [visibleLimit, setVisibleLimit] = useState(60)
  const [prevPrefill, setPrevPrefill] = useState(prefillNewFoodName)
  const [formOpen, setFormOpen] = useState(() => Boolean(prefillNewFoodName))
  const [modalMode, setModalMode] = useState<ModalMode>('single')
  const [formState, setFormState] = useState<FoodFormState>(() =>
    createEmptyForm(prefillNewFoodName ?? ''),
  )
  const [formError, setFormError] = useState<string | null>(null)

  if (prevPrefill !== prefillNewFoodName) {
    setPrevPrefill(prefillNewFoodName)
    if (prefillNewFoodName) {
      setModalMode('single')
      setFormState(createEmptyForm(prefillNewFoodName))
      setFormError(null)
      setFormOpen(true)
    }
  }

  const selectCategory = (next: CategoryFilter) => {
    setCategoryFilter(next)
    setVisibleLimit(60)
  }

  // Multi-ingredient Recipe Builder state
  const [recipeName, setRecipeName] = useState('')
  const [recipeUnitName, setRecipeUnitName] = useState('پرس')
  const [recipeServings, setRecipeServings] = useState('2')
  const [recipeCategory, setRecipeCategory] = useState<FoodCategory>('stews_mains')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientDraft[]>([])

  const modalContainerRef = useRef<HTMLDivElement | null>(null)
  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setFormError(null)
    if (prefillNewFoodName) {
      onConsumePrefillName()
    }
  }, [onConsumePrefillName, prefillNewFoodName])

  useFocusTrap(modalContainerRef, formOpen, closeForm)

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      if (categoryFilter === 'custom' && !food.isCustom) return false
      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'custom' &&
        food.category !== categoryFilter
      ) {
        return false
      }
      return matchesFoodSearch(food, searchQuery)
    })
  }, [foods, categoryFilter, searchQuery])

  const displayedFoods = useMemo(
    () => (searchQuery.trim() ? filteredFoods : filteredFoods.slice(0, visibleLimit)),
    [filteredFoods, searchQuery, visibleLimit],
  )

  const customCount = useMemo(() => foods.filter((f) => f.isCustom).length, [foods])

  const recipeCandidateFoods = useMemo(() => {
    if (!recipeSearch.trim()) return foods.slice(0, 8)
    return foods.filter((f) => matchesFoodSearch(f, recipeSearch)).slice(0, 8)
  }, [foods, recipeSearch])

  const recipeTotals = useMemo(() => {
    let totalGrams = 0
    let kcal = 0
    let protein = 0
    let carbs = 0
    let fat = 0

    for (const ing of recipeIngredients) {
      const f = foodById.get(ing.foodId)
      if (!f) continue
      const u = f.units.find((unit) => unit.name === ing.unit) ?? f.units[0]
      const qty = parsePositiveNum(ing.quantity, 1)
      const calc = calculateFoodMacros(f, qty, u.grams)
      totalGrams += calc.totalGrams
      kcal += calc.kcal
      protein += calc.protein
      carbs += calc.carbs
      fat += calc.fat
    }

    const servings = Math.max(1, parsePositiveNum(recipeServings, 1))
    const gramsPerServing = Math.max(10, Math.round(totalGrams / servings))
    return {
      totalGrams: Math.round(totalGrams),
      kcal: Math.round(kcal),
      perServingKcal: Math.round(kcal / servings),
      gramsPerServing,
      per100g:
        totalGrams > 0
          ? {
              kcal: Math.round((kcal / totalGrams) * 1000) / 10,
              protein: Math.round((protein / totalGrams) * 1000) / 10,
              carbs: Math.round((carbs / totalGrams) * 1000) / 10,
              fat: Math.round((fat / totalGrams) * 1000) / 10,
            }
          : { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    }
  }, [foodById, recipeIngredients, recipeServings])

  const openNewFoodForm = (mode: ModalMode = 'single') => {
    setModalMode(mode)
    setFormState(createEmptyForm())
    setRecipeName('')
    setRecipeUnitName('پرس')
    setRecipeServings('2')
    setRecipeSearch('')
    setRecipeIngredients([])
    setFormError(null)
    setFormOpen(true)
  }

  const openEditFoodForm = (food: FoodItem) => {
    setModalMode('single')
    setFormState(createFormFromFood(food))
    setFormError(null)
    setFormOpen(true)
  }

  const handleUnitChange = (index: number, field: keyof UnitDraft, value: string) => {
    setFormState((prev) => ({
      ...prev,
      units: prev.units.map((u, i) => (i === index ? { ...u, [field]: value } : u)),
    }))
  }

  const handleAddUnitRow = () => {
    setFormState((prev) => ({
      ...prev,
      units: [...prev.units, { name: '', grams: '100' }],
    }))
  }

  const handleRemoveUnitRow = (index: number) => {
    setFormState((prev) => {
      if (prev.units.length <= 1) return prev
      const nextUnits = prev.units.filter((_, i) => i !== index)
      const nextDefault = Math.min(prev.defaultUnitIndex, nextUnits.length - 1)
      return {
        ...prev,
        units: nextUnits,
        defaultUnitIndex: nextDefault,
      }
    })
  }

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = formState.name.trim()
    if (!cleanName) {
      setFormError('لطفاً نام غذا را وارد کنید.')
      return
    }

    const parsedUnits: FoodUnit[] = formState.units
      .map((u) => ({
        name: u.name.trim(),
        grams: parsePositiveNum(u.grams, 0),
      }))
      .filter((u) => u.name.length > 0 && u.grams > 0)

    if (parsedUnits.length === 0) {
      setFormError('حداقل یک واحد خانگی با وزن معتبر (بر حسب گرم) وارد کنید.')
      return
    }

    const defaultUnitObj =
      parsedUnits[Math.min(formState.defaultUnitIndex, parsedUnits.length - 1)] ?? parsedUnits[0]

    const rawKcal = parsePositiveNum(formState.kcal, -1)
    if (rawKcal <= 0) {
      setFormError('لطفاً مقدار کالری معتبر (بزرگ‌تر از صفر) وارد کنید.')
      return
    }

    const rawProtein = parsePositiveNum(formState.protein, 0)
    const rawCarbs = parsePositiveNum(formState.carbs, 0)
    const rawFat = parsePositiveNum(formState.fat, 0)

    const factor = formState.inputMode === 'perUnit' ? 100 / defaultUnitObj.grams : 1
    const per100g = {
      kcal: Math.round(rawKcal * factor * 10) / 10,
      protein: Math.round(rawProtein * factor * 10) / 10,
      carbs: Math.round(rawCarbs * factor * 10) / 10,
      fat: Math.round(rawFat * factor * 10) / 10,
    }

    const aliases = formState.aliasesText
      .split(/[،,]/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && a !== cleanName)

    const payload: Omit<FoodItem, 'id'> = {
      name: cleanName,
      aliases,
      category: formState.category,
      per100g,
      defaultUnit: defaultUnitObj.name,
      units: [...parsedUnits, { name: 'گرم', grams: 1 }],
      isCustom: formState.isCustom,
    }

    if (formState.editingId) {
      onUpdateFood({ ...payload, id: formState.editingId })
    } else {
      onAddFood(payload)
    }

    closeForm()
  }

  const handleSubmitRecipe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeName.trim()) {
      setFormError('لطفاً نام دستور پخت را وارد کنید.')
      return
    }
    if (recipeIngredients.length < 2 || recipeTotals.totalGrams <= 0) {
      setFormError('حداقل ۲ ماده غذایی برای ساخت دستور پخت ترکیبی انتخاب کنید.')
      return
    }
    const cleanUnit = recipeUnitName.trim() || 'پرس'
    onAddFood({
      name: recipeName.trim(),
      aliases: [],
      category: recipeCategory,
      per100g: recipeTotals.per100g,
      defaultUnit: cleanUnit,
      units: [
        { name: cleanUnit, grams: recipeTotals.gramsPerServing },
        { name: 'گرم', grams: 1 },
      ],
      isCustom: true,
      isRecipe: true,
    })
    closeForm()
  }

  const activeDefaultUnitLabel =
    formState.units[formState.defaultUnitIndex]?.name.trim() || 'واحد پیش‌فرض'

  return (
    <div className="space-y-4 animate-fade-up" data-testid="food-database-tab">
      {/* Top Toolbar: Search + Add Food / Recipe Buttons */}
      <div className="card-surface rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-100">بانک غذاهای ایرانی</h2>
            <p className="text-xs text-zinc-400 mt-0.5 tabular-nums-fa">
              {formatFaNumber(foods.length)} غذا آماده محاسبه — قابل ویرایش، افزودن غذای شخصی و
              دستور پخت ترکیبی
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="add-recipe-btn"
              onClick={() => openNewFoodForm('recipe')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#282830] border border-[#2E2E36] text-zinc-200 font-semibold text-xs px-3 py-2.5 transition-colors"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>دستور پخت</span>
            </button>
            <button
              type="button"
              id="add-custom-food-btn"
              onClick={() => openNewFoodForm('single')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs sm:text-sm px-3.5 py-2.5 transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>افزودن غذای جدید</span>
            </button>
          </div>
        </div>

        {/* Source & Approximation Transparency Notice */}
        <div className="flex items-start gap-2 rounded-xl bg-[#0C0C0D] border border-[#24242A] px-3 py-2 text-[11px] text-zinc-400">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <span>{NUTRITION_DATA_SOURCES.shortNotice}</span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            id="food-db-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی غذا یا واحد (مثلاً: باقالی‌قاتق، ساقه‌طلایی، پیتزا، کفگیر...)"
            className="w-full rounded-xl bg-[#0C0C0D] border border-[#2A2A30] focus:border-emerald-500/70 focus:outline-none pr-10 pl-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => selectCategory('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-zinc-100 text-[#0C0C0D] font-semibold'
                : 'bg-[#1E1E22] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            همه ({formatFaNumber(foods.length)})
          </button>

          {customCount > 0 && (
            <button
              type="button"
              onClick={() => selectCategory('custom')}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                categoryFilter === 'custom'
                  ? 'bg-emerald-500 text-[#051B11] font-semibold'
                  : 'bg-[#1E1E22] text-emerald-300 hover:bg-[#27272E]'
              }`}
            >
              غذاهای من ({formatFaNumber(customCount)})
            </button>
          )}

          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-zinc-100 text-[#0C0C0D] font-semibold'
                  : 'bg-[#1E1E22] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {FOOD_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Food List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-testid="food-db-list">
        {displayedFoods.map((food) => {
          const defaultUnitObj =
            food.units.find((u) => u.name === food.defaultUnit) ?? food.units[0]
          const perDefault = calculateFoodMacros(food, 1, defaultUnitObj.grams)

          return (
            <div
              key={food.id}
              data-testid="food-db-card"
              className="card-surface rounded-2xl p-3.5 flex flex-col justify-between gap-3 hover:border-[#34343B] transition-colors"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-zinc-100 truncate">{food.name}</h3>
                    {food.isRecipe && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300">
                        دستور پخت
                      </span>
                    )}
                    {food.isCustom && !food.isRecipe && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
                        شخصی
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 tabular-nums-fa">
                    هر ۱ {defaultUnitObj.name} (
                    {formatFaNumber(defaultUnitObj.grams, defaultUnitObj.grams < 10 ? 1 : 0)} گرم):{' '}
                    <span className="text-emerald-400 font-bold">
                      ~{formatFaNumber(perDefault.kcal)} کالری
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onQuickUseFood(food)}
                    title={`ثبت سریع ${food.name}`}
                    className="w-8 h-8 rounded-lg bg-emerald-500/12 hover:bg-emerald-500/25 text-emerald-400 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditFoodForm(food)}
                    aria-label={`ویرایش ${food.name}`}
                    className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-[#292930] text-zinc-300 flex items-center justify-center transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {food.isCustom && (
                    <button
                      type="button"
                      onClick={() => onDeleteFood(food.id)}
                      aria-label={`حذف ${food.name}`}
                      className="w-8 h-8 rounded-lg bg-[#1E1E22] hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#222227] text-[11px] tabular-nums-fa">
                <div className="flex items-center gap-2.5 text-zinc-400">
                  <span className="text-zinc-400">۱۰۰ گرم:</span>
                  <span className="text-zinc-200 font-medium">
                    {formatFaNumber(food.per100g.kcal)} ک
                  </span>
                  <span className="text-sky-400/90">
                    پ {formatFaNumber(food.per100g.protein, 1)}
                  </span>
                  <span className="text-amber-400/90">
                    ک {formatFaNumber(food.per100g.carbs, 1)}
                  </span>
                  <span className="text-rose-400/90">
                    چ {formatFaNumber(food.per100g.fat, 1)}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {food.units
                    .filter((u) => u.name !== 'گرم')
                    .slice(0, 3)
                    .map((u) => (
                      <span
                        key={u.name}
                        className="px-1.5 py-0.5 rounded-md bg-[#1E1E22] text-zinc-300 text-[10px]"
                      >
                        {u.name}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More Pagination for 300+ Catalog Smoothness */}
      {!searchQuery.trim() && filteredFoods.length > displayedFoods.length && (
        <div className="text-center pt-1">
          <button
            type="button"
            id="load-more-foods-btn"
            onClick={() => setVisibleLimit((n) => n + 80)}
            className="rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E36] px-5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors tabular-nums-fa"
          >
            نمایش غذاهای بیشتر ({formatFaNumber(filteredFoods.length - displayedFoods.length)} مورد
            باقی‌مانده)
          </button>
        </div>
      )}

      {filteredFoods.length === 0 && (
        <div className="card-surface rounded-2xl p-8 text-center">
          <Utensils className="w-7 h-7 text-zinc-400 mx-auto mb-2.5" />
          <p className="text-sm font-medium text-zinc-300">غذایی با این عبارت پیدا نشد</p>
          <button
            type="button"
            onClick={() => {
              setModalMode('single')
              setFormState(createEmptyForm(searchQuery.trim()))
              setFormError(null)
              setFormOpen(true)
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 text-[#051B11] font-bold text-xs px-4 py-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن «{searchQuery.trim() || 'غذای جدید'}» به بانک غذا</span>
          </button>
        </div>
      )}

      {/* Accessible Focus-Trapped Add/Edit Food & Recipe Builder Modal */}
      {formOpen &&
        createPortal(
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label={
              modalMode === 'recipe'
                ? 'ساخت دستور پخت ترکیبی'
                : formState.editingId
                  ? 'ویرایش غذا'
                  : 'افزودن غذای جدید'
            }
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          >
            <div
              ref={modalContainerRef}
              className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-[#161618] border border-[#2C2C32] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-fade-up"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-zinc-100">
                  {modalMode === 'recipe'
                    ? 'ساخت دستور پخت ترکیبی'
                    : formState.editingId
                      ? 'ویرایش اطلاعات غذا'
                      : 'افزودن غذای خانگی جدید'}
                </h3>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="بستن پنجره"
                  className="w-8 h-8 rounded-lg bg-[#222228] hover:bg-[#2D2D35] text-zinc-400 hover:text-zinc-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Switcher when creating new */}
              {!formState.editingId && (
                <div className="grid grid-cols-2 rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A] mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('single')
                      setFormError(null)
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      modalMode === 'single'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400'
                    }`}
                  >
                    غذای تکی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('recipe')
                      setFormError(null)
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      modalMode === 'recipe'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400'
                    }`}
                  >
                    دستور پخت ترکیبی
                  </button>
                </div>
              )}

              {modalMode === 'single' ? (
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="food-name-input" className="block text-xs text-zinc-300 mb-1.5">
                        نام غذا *
                      </label>
                      <input
                        id="food-name-input"
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                        placeholder="مثلاً: سوپ جو خانگی"
                        className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="food-category-select"
                        className="block text-xs text-zinc-300 mb-1.5"
                      >
                        دسته‌بندی
                      </label>
                      <select
                        id="food-category-select"
                        value={formState.category}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, category: e.target.value as FoodCategory }))
                        }
                        className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100"
                      >
                        {CATEGORY_ORDER.map((cat) => (
                          <option key={cat} value={cat}>
                            {FOOD_CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="food-aliases-input"
                      className="block text-xs text-zinc-300 mb-1.5"
                    >
                      نام‌های جایگزین (اختیاری، با ویرگول جدا کنید)
                    </label>
                    <input
                      id="food-aliases-input"
                      type="text"
                      value={formState.aliasesText}
                      onChange={(e) => setFormState((p) => ({ ...p, aliasesText: e.target.value }))}
                      placeholder="مثلاً: سوپ جو، سوپ سفید"
                      className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-300">
                        واحدهای خانگی و وزن هر واحد (گرم)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddUnitRow}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>واحد جدید</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formState.units.map((u, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="defaultUnit"
                            checked={formState.defaultUnitIndex === idx}
                            onChange={() => setFormState((p) => ({ ...p, defaultUnitIndex: idx }))}
                            title="واحد پیش‌فرض"
                            className="accent-emerald-500 shrink-0"
                          />
                          <input
                            type="text"
                            id={idx === 0 ? 'food-unit-name-0' : undefined}
                            value={u.name}
                            onChange={(e) => handleUnitChange(idx, 'name', e.target.value)}
                            placeholder="مثلاً: ملاقه، کفگیر، پیمانه"
                            className="flex-1 min-w-0 rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-xs sm:text-sm text-zinc-100"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            id={idx === 0 ? 'food-unit-grams-0' : undefined}
                            value={u.grams}
                            onChange={(e) => handleUnitChange(idx, 'grams', e.target.value)}
                            placeholder="گرم"
                            className="w-24 rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-xs sm:text-sm text-zinc-100 tabular-nums-fa"
                          />
                          {formState.units.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveUnitRow(idx)}
                              aria-label="حذف واحد"
                              className="w-8 h-8 rounded-lg hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 flex items-center justify-center shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-300">ارزش غذایی (تقریبی)</span>
                      <div className="inline-flex rounded-xl bg-[#0C0C0D] p-0.5 border border-[#26262A]">
                        <button
                          type="button"
                          onClick={() => setFormState((p) => ({ ...p, inputMode: 'perUnit' }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            formState.inputMode === 'perUnit'
                              ? 'bg-emerald-500 text-[#051B11] font-semibold'
                              : 'text-zinc-400'
                          }`}
                        >
                          در هر ۱ {activeDefaultUnitLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState((p) => ({ ...p, inputMode: 'per100g' }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            formState.inputMode === 'per100g'
                              ? 'bg-emerald-500 text-[#051B11] font-semibold'
                              : 'text-zinc-400'
                          }`}
                        >
                          در هر ۱۰۰ گرم
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label
                          htmlFor="food-kcal-input"
                          className="block text-[11px] text-emerald-400 mb-1"
                        >
                          کالری *
                        </label>
                        <input
                          id="food-kcal-input"
                          type="text"
                          inputMode="decimal"
                          required
                          value={formState.kcal}
                          onChange={(e) => setFormState((p) => ({ ...p, kcal: e.target.value }))}
                          placeholder="۱۸۰"
                          className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="food-protein-input"
                          className="block text-[11px] text-sky-400 mb-1"
                        >
                          پروتئین (گرم)
                        </label>
                        <input
                          id="food-protein-input"
                          type="text"
                          inputMode="decimal"
                          value={formState.protein}
                          onChange={(e) => setFormState((p) => ({ ...p, protein: e.target.value }))}
                          placeholder="۸"
                          className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-sky-400/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="food-carbs-input"
                          className="block text-[11px] text-amber-400 mb-1"
                        >
                          کربوهیدرات (گرم)
                        </label>
                        <input
                          id="food-carbs-input"
                          type="text"
                          inputMode="decimal"
                          value={formState.carbs}
                          onChange={(e) => setFormState((p) => ({ ...p, carbs: e.target.value }))}
                          placeholder="۲۰"
                          className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-amber-400/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="food-fat-input"
                          className="block text-[11px] text-rose-400 mb-1"
                        >
                          چربی (گرم)
                        </label>
                        <input
                          id="food-fat-input"
                          type="text"
                          inputMode="decimal"
                          value={formState.fat}
                          onChange={(e) => setFormState((p) => ({ ...p, fat: e.target.value }))}
                          placeholder="۵"
                          className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-rose-400/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                        />
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="submit"
                      id="save-food-submit-btn"
                      className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-sm py-2.5 transition-colors"
                    >
                      {formState.editingId ? 'ذخیره تغییرات' : 'ذخیره در بانک غذا'}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-xl bg-[#222228] hover:bg-[#2C2C34] text-zinc-300 text-sm font-medium px-4 py-2.5 transition-colors"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              ) : (
                /* Multi-Ingredient Recipe Builder Form */
                <form onSubmit={handleSubmitRecipe} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="recipe-name-input" className="block text-xs text-zinc-300 mb-1.5">
                        نام دستور پخت *
                      </label>
                      <input
                        id="recipe-name-input"
                        type="text"
                        required
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        placeholder="مثلاً: شیک پروتئین صبحانه"
                        className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="recipe-category-select"
                        className="block text-xs text-zinc-300 mb-1.5"
                      >
                        دسته‌بندی
                      </label>
                      <select
                        id="recipe-category-select"
                        value={recipeCategory}
                        onChange={(e) => setRecipeCategory(e.target.value as FoodCategory)}
                        className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-3 py-2 text-sm text-zinc-100"
                      >
                        {CATEGORY_ORDER.map((cat) => (
                          <option key={cat} value={cat}>
                            {FOOD_CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="recipe-unit-input" className="block text-xs text-zinc-300 mb-1.5">
                        نام واحد خروجی
                      </label>
                      <input
                        id="recipe-unit-input"
                        type="text"
                        value={recipeUnitName}
                        onChange={(e) => setRecipeUnitName(e.target.value)}
                        placeholder="پرس / لیوان / کاسه"
                        className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-3 py-2 text-sm text-zinc-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="recipe-servings-input"
                        className="block text-xs text-zinc-300 mb-1.5"
                      >
                        تعداد واحد خروجی
                      </label>
                      <input
                        id="recipe-servings-input"
                        type="text"
                        inputMode="numeric"
                        value={recipeServings}
                        onChange={(e) => setRecipeServings(e.target.value)}
                        className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                      />
                    </div>
                  </div>

                  {/* Ingredient Picker */}
                  <div className="space-y-2">
                    <label htmlFor="recipe-ingredient-search" className="block text-xs text-zinc-300">
                      جستجو و افزودن مواد اولیه
                    </label>
                    <input
                      id="recipe-ingredient-search"
                      type="text"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      placeholder="نام ماده غذایی را بنویسید (مثلاً: شیر، موز، جو دوسر...)"
                      className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] px-3 py-2 text-xs sm:text-sm text-zinc-100"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {recipeCandidateFoods.map((cand) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() =>
                            setRecipeIngredients((prev) => [
                              ...prev,
                              { foodId: cand.id, quantity: '1', unit: cand.defaultUnit },
                            ])
                          }
                          className="rounded-lg bg-[#1E1E22] hover:bg-emerald-500/15 border border-[#2E2E35] px-2.5 py-1 text-[11px] text-zinc-200 hover:text-emerald-300"
                        >
                          + {cand.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Ingredients */}
                  {recipeIngredients.length > 0 && (
                    <div className="space-y-2">
                      {recipeIngredients.map((ing, idx) => {
                        const f = foodById.get(ing.foodId)
                        if (!f) return null
                        return (
                          <div
                            key={`${ing.foodId}-${idx}`}
                            className="flex items-center gap-2 rounded-xl bg-[#1E1E22] p-2 text-xs"
                          >
                            <span className="flex-1 font-medium text-zinc-100 truncate">
                              {f.name}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={ing.quantity}
                              onChange={(e) =>
                                setRecipeIngredients((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, quantity: e.target.value } : item,
                                  ),
                                )
                              }
                              className="w-14 rounded-lg bg-[#0C0C0D] border border-[#2E2E35] px-2 py-1 text-center text-zinc-100 tabular-nums-fa"
                            />
                            <select
                              value={ing.unit}
                              onChange={(e) =>
                                setRecipeIngredients((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, unit: e.target.value } : item,
                                  ),
                                )
                              }
                              className="rounded-lg bg-[#0C0C0D] border border-[#2E2E35] px-2 py-1 text-zinc-200"
                            >
                              {f.units.map((u) => (
                                <option key={u.name} value={u.name}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              aria-label={`حذف ${f.name}`}
                              onClick={() =>
                                setRecipeIngredients((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-zinc-400 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Calculated Recipe Summary */}
                  {recipeTotals.totalGrams > 0 && (
                    <div className="card-elevated rounded-xl p-3 text-xs tabular-nums-fa flex items-center justify-between">
                      <span className="text-zinc-400">
                        هر ۱ {recipeUnitName || 'پرس'} (~{formatFaNumber(recipeTotals.gramsPerServing)}{' '}
                        گرم):
                      </span>
                      <span className="font-bold text-emerald-400">
                        ~{formatFaNumber(recipeTotals.perServingKcal)} کالری
                      </span>
                    </div>
                  )}

                  {formError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="submit"
                      id="save-recipe-submit-btn"
                      className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-sm py-2.5 transition-colors"
                    >
                      ذخیره دستور پخت در بانک غذا
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-xl bg-[#222228] hover:bg-[#2C2C34] text-zinc-300 text-sm font-medium px-4 py-2.5 transition-colors"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
