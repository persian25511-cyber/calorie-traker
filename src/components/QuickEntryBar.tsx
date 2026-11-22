import { Check, Minus, Plus, Sparkles, UtensilsCrossed, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { QUICK_MEAL_SUGGESTIONS } from '../data/iranianFoods'
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  type FoodItem,
  type LoggedFoodEntry,
  type MealType,
  type ParsedFoodItem,
} from '../types/nutrition'
import { calculateFoodMacros, parsePersianFoodInput } from '../utils/persianFoodParser'
import { formatFaNumber, formatQuantityFa } from '../utils/persianFormat'

interface QuickEntryBarProps {
  foods: FoodItem[]
  recentEntries: LoggedFoodEntry[]
  totalLoggedCount: number
  inputText: string
  onInputTextChange: (next: string) => void
  mealType: MealType
  onMealTypeChange: (mealType: MealType) => void
  onSubmitItems: (items: ParsedFoodItem[], mealType: MealType, sourceText: string) => void
  onRequestAddCustomFood: (prefillName: string) => void
}

interface ChipOverride {
  quantity: number
  unit?: string
  gramsPerUnit?: number
  removed?: boolean
}

const EMPTY_OVERRIDES: Record<string, ChipOverride> = {}
const WELCOME_DISMISSED_KEY = 'kalorishomar_v1_welcome_dismissed'

export function QuickEntryBar({
  foods,
  recentEntries,
  totalLoggedCount,
  inputText,
  onInputTextChange,
  mealType,
  onMealTypeChange,
  onSubmitItems,
  onRequestAddCustomFood,
}: QuickEntryBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [overridesByInput, setOverridesByInput] = useState<{
    text: string
    map: Record<string, ChipOverride>
  }>({ text: '', map: {} })
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(WELCOME_DISMISSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const activeOverrides =
    overridesByInput.text === inputText ? overridesByInput.map : EMPTY_OVERRIDES

  const parseResult = useMemo(
    () => parsePersianFoodInput(inputText, foods),
    [inputText, foods],
  )

  const previewItems = useMemo<ParsedFoodItem[]>(() => {
    const result: ParsedFoodItem[] = []
    for (const item of parseResult.items) {
      const override = activeOverrides[item.id]
      if (override?.removed) continue

      const qty = override ? override.quantity : item.quantity
      const unit = override?.unit ?? item.unit
      const gramsPerUnit = override?.gramsPerUnit ?? item.gramsPerUnit

      if (qty !== item.quantity || unit !== item.unit || gramsPerUnit !== item.gramsPerUnit) {
        const recalculated = calculateFoodMacros(item.food, qty, gramsPerUnit)
        result.push({
          ...item,
          quantity: qty,
          unit,
          gramsPerUnit,
          ...recalculated,
        })
      } else {
        result.push(item)
      }
    }
    return result
  }, [parseResult.items, activeOverrides])

  const totalPreview = useMemo(() => {
    return previewItems.reduce(
      (acc, item) => ({
        kcal: acc.kcal + item.kcal,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [previewItems])

  // Merge user's recent logged combos with curated Iranian combos
  const suggestionPills = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []

    for (const entry of recentEntries) {
      const text = entry.sourceText?.trim()
      if (text && !seen.has(text)) {
        seen.add(text)
        list.push(text)
        if (list.length >= 3) break
      }
    }

    for (const sample of QUICK_MEAL_SUGGESTIONS) {
      if (!seen.has(sample)) {
        seen.add(sample)
        list.push(sample)
      }
      if (list.length >= 6) break
    }
    return list
  }, [recentEntries])

  const handleAdjustQuantity = (item: ParsedFoodItem, direction: 1 | -1) => {
    const isWeightUnit = item.unit === 'گرم' || item.unit === 'میلی‌لیتر'
    const step = isWeightUnit ? 25 : 0.5
    const minQty = isWeightUnit ? 10 : 0.25
    const nextQty = Math.max(minQty, Math.round((item.quantity + direction * step) * 100) / 100)

    setOverridesByInput((prev) => {
      const base = prev.text === inputText ? prev.map : {}
      return {
        text: inputText,
        map: {
          ...base,
          [item.id]: {
            ...base[item.id],
            quantity: nextQty,
            unit: item.unit,
            gramsPerUnit: item.gramsPerUnit,
          },
        },
      }
    })
  }

  const handleChangeUnit = (item: ParsedFoodItem, nextUnitName: string) => {
    const targetUnit =
      item.food.units.find((u) => u.name === nextUnitName) ??
      (nextUnitName === 'گرم' ? { name: 'گرم', grams: 1 } : null)
    if (!targetUnit) return

    const wasWeight = item.unit === 'گرم' || item.unit === 'میلی‌لیتر'
    const isNextWeight = targetUnit.name === 'گرم' || targetUnit.name === 'میلی‌لیتر'

    let nextQty = item.quantity
    if (!wasWeight && isNextWeight) {
      nextQty = Math.max(10, Math.round(item.totalGrams))
    } else if (wasWeight && !isNextWeight) {
      nextQty = Math.max(0.5, Math.round((item.totalGrams / targetUnit.grams) * 2) / 2)
    }

    setOverridesByInput((prev) => {
      const base = prev.text === inputText ? prev.map : {}
      return {
        text: inputText,
        map: {
          ...base,
          [item.id]: {
            ...base[item.id],
            quantity: nextQty,
            unit: targetUnit.name,
            gramsPerUnit: targetUnit.grams,
          },
        },
      }
    })
  }

  const handleRemoveChip = (item: ParsedFoodItem) => {
    setOverridesByInput((prev) => {
      const base = prev.text === inputText ? prev.map : {}
      return {
        text: inputText,
        map: {
          ...base,
          [item.id]: { quantity: item.quantity, removed: true },
        },
      }
    })
  }

  const handleSubmit = () => {
    if (previewItems.length === 0) return
    onSubmitItems(previewItems, mealType, inputText.trim())
    onInputTextChange('')
    setOverridesByInput({ text: '', map: {} })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handlePickSuggestion = (text: string) => {
    onInputTextChange(text)
    setOverridesByInput({ text: '', map: {} })
    textareaRef.current?.focus()
  }

  const handleDismissWelcome = () => {
    setWelcomeDismissed(true)
    try {
      window.localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    } catch {
      // Ignore storage error
    }
  }

  const showFirstTimeTip =
    totalLoggedCount === 0 && inputText.trim().length === 0 && !welcomeDismissed

  return (
    <section
      aria-label="ثبت سریع وعده غذایی"
      className="card-surface rounded-2xl p-4 sm:p-5 transition-colors"
    >
      {/* Header row + Meal Type selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 leading-tight">ثبت سریع غذا</h2>
            <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
              به زبان روزمره بنویسید؛ محاسبه آنی انجام می‌شود
            </p>
          </div>
        </div>

        {/* Meal Type Selector */}
        <div
          role="radiogroup"
          aria-label="انتخاب وعده غذایی"
          className="inline-flex items-center rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A]"
        >
          {MEAL_TYPE_ORDER.map((type) => {
            const active = mealType === type
            return (
              <button
                key={type}
                type="button"
                id={`meal-type-${type}`}
                role="radio"
                aria-checked={active}
                onClick={() => onMealTypeChange(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-emerald-500 text-[#071A12] font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {MEAL_TYPE_LABELS[type]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Natural Language Input */}
      <div className="relative">
        <label htmlFor="quick-food-input" className="sr-only">
          شرح وعده غذایی به فارسی
        </label>
        <textarea
          ref={textareaRef}
          id="quick-food-input"
          rows={2}
          value={inputText}
          onChange={(e) => onInputTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="مثلاً: دو کفگیر قورمه‌سبزی و یک کف دست سنگک و نصف لیوان دوغ"
          className="w-full resize-none rounded-xl bg-[#0C0C0D] border border-[#2A2A30] focus:border-emerald-500/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 px-3.5 py-3 pl-9 text-sm sm:text-[15px] text-zinc-100 placeholder:text-zinc-500 leading-relaxed transition-all"
        />
        {inputText.length > 0 && (
          <button
            type="button"
            id="clear-quick-input-btn"
            onClick={() => {
              onInputTextChange('')
              setOverridesByInput({ text: '', map: {} })
              textareaRef.current?.focus()
            }}
            aria-label="پاک کردن متن"
            className="absolute left-2.5 top-3 w-6 h-6 rounded-lg bg-[#1E1E22] hover:bg-[#2A2A30] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Non-blocking first-time onboarding tip */}
      {showFirstTimeTip && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3 py-2 text-xs">
          <button
            type="button"
            onClick={() =>
              handlePickSuggestion('دو کفگیر قورمه‌سبزی و یک کف دست سنگک و نصف لیوان دوغ')
            }
            className="text-right text-zinc-300 hover:text-emerald-300 transition-colors leading-relaxed"
          >
            <span className="text-emerald-400 font-semibold">شروع سریع:</span> همین الان این جمله را
            امتحان کنید ← «دو کفگیر قورمه‌سبزی و یک کف دست سنگک»
          </button>
          <button
            type="button"
            onClick={handleDismissWelcome}
            aria-label="بستن راهنمای شروع سریع"
            className="w-6 h-6 rounded-lg hover:bg-emerald-500/15 text-zinc-400 hover:text-zinc-200 flex items-center justify-center shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Preview Chips */}
      {previewItems.length > 0 && (
        <div className="mt-3.5 space-y-2.5 animate-fade-up" data-testid="live-preview-chips">
          <div className="flex flex-wrap gap-2">
            {previewItems.map((item) => {
              const unitOptions = item.food.units.some((u) => u.name === item.unit)
                ? item.food.units
                : [{ name: item.unit, grams: item.gramsPerUnit }, ...item.food.units]

              return (
                <div
                  key={item.id}
                  data-testid="parsed-food-chip"
                  className="card-elevated rounded-xl px-3 py-2 flex items-center gap-2.5 w-full sm:w-auto max-w-full"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                        {item.food.name}
                      </span>
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-300 tabular-nums-fa">
                        {formatFaNumber(item.kcal)} کالری
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-zinc-400 mt-1 tabular-nums-fa">
                      <span className="text-zinc-200 font-semibold">
                        {formatQuantityFa(item.quantity)}
                      </span>
                      <select
                        aria-label={`واحد ${item.food.name}`}
                        data-testid="chip-unit-select"
                        value={item.unit}
                        onChange={(e) => handleChangeUnit(item, e.target.value)}
                        className="rounded-md bg-[#27272E] border border-[#35353F] text-zinc-200 text-[11px] px-1.5 py-0.5 focus:outline-none focus:border-emerald-500/70"
                      >
                        {unitOptions.map((u) => (
                          <option key={u.name} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-zinc-600">•</span>
                      <span>{formatFaNumber(item.totalGrams)} گرم</span>
                      <span className="text-zinc-600 hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-sky-400/90">
                        پ {formatFaNumber(item.protein, 1)}
                      </span>
                      <span className="hidden sm:inline text-amber-400/90">
                        ک {formatFaNumber(item.carbs, 1)}
                      </span>
                      <span className="hidden sm:inline text-rose-400/90">
                        چ {formatFaNumber(item.fat, 1)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity +/- and Remove Controls */}
                  <div className="flex items-center gap-1 shrink-0 mr-auto">
                    <button
                      type="button"
                      aria-label={`افزایش مقدار ${item.food.name}`}
                      onClick={() => handleAdjustQuantity(item, 1)}
                      className="w-7 h-7 rounded-lg bg-[#27272D] hover:bg-[#32323A] text-zinc-200 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`کاهش مقدار ${item.food.name}`}
                      onClick={() => handleAdjustQuantity(item, -1)}
                      className="w-7 h-7 rounded-lg bg-[#27272D] hover:bg-[#32323A] text-zinc-200 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`حذف ${item.food.name}`}
                      onClick={() => handleRemoveChip(item)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary & Submit Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#26262A]">
            <div className="flex items-center gap-3 text-xs tabular-nums-fa">
              <span className="text-zinc-400">
                جمع ({formatFaNumber(previewItems.length)} مورد):
              </span>
              <span className="font-bold text-emerald-400 text-sm">
                {formatFaNumber(totalPreview.kcal)} کالری
              </span>
              <span className="hidden sm:inline text-zinc-500">
                پ {formatFaNumber(totalPreview.protein, 1)}گ · ک{' '}
                {formatFaNumber(totalPreview.carbs, 1)}گ · چ{' '}
                {formatFaNumber(totalPreview.fat, 1)}گ
              </span>
            </div>

            <button
              type="button"
              id="submit-meal-btn"
              onClick={handleSubmit}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-[#051B11] font-bold text-sm px-5 py-2.5 transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>ثبت وعده</span>
            </button>
          </div>
        </div>
      )}

      {/* Unmatched segments gentle hint */}
      {parseResult.unmatchedSegments.length > 0 && inputText.trim().length >= 2 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span>تشخیص داده نشد:</span>
          {parseResult.unmatchedSegments.map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => onRequestAddCustomFood(seg)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#27272D] border border-[#2E2E35] px-2.5 py-1 text-zinc-300 transition-colors"
            >
              <span>«{seg}»</span>
              <span className="text-emerald-400 font-medium">+ افزودن به بانک غذا</span>
            </button>
          ))}
        </div>
      )}

      {/* Quick-Tap Suggestion Pills */}
      {inputText.trim().length === 0 && (
        <div className="mt-3 pt-3 border-t border-[#222226]">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>پیشنهادهای سریع با یک لمس:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {suggestionPills.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => handlePickSuggestion(pill)}
                className="shrink-0 rounded-full bg-[#1E1E22] hover:bg-[#27272D] border border-[#2B2B31] px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
