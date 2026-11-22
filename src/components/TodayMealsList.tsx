import { Check, Coffee, Edit3, Minus, Moon, Plus, RotateCcw, Sun, Sunset, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  type LoggedFoodEntry,
  type MealType,
} from '../types/nutrition'
import { formatFaNumber, formatQuantityFa, formatTimeFa } from '../utils/persianFormat'

interface TodayMealsListProps {
  dayEntries: LoggedFoodEntry[]
  previousDayEntries: LoggedFoodEntry[]
  previousDayLabel: string
  onDeleteEntry: (entryId: string) => void
  onUpdateEntry: (entryId: string, patch: { quantity?: number; mealType?: MealType }) => void
  onRepeatEntries: (entries: LoggedFoodEntry[], targetMealType: MealType) => void
}

const MEAL_ICONS: Record<MealType, typeof Sun> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Sunset,
}

export function TodayMealsList({
  dayEntries,
  previousDayEntries,
  previousDayLabel,
  onDeleteEntry,
  onUpdateEntry,
  onRepeatEntries,
}: TodayMealsListProps) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  const groupedToday = useMemo(() => {
    const map: Record<MealType, LoggedFoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
    for (const entry of dayEntries) {
      map[entry.mealType].push(entry)
    }
    return map
  }, [dayEntries])

  const repeatablePreviousMeals = useMemo(() => {
    const map: Record<MealType, LoggedFoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
    for (const entry of previousDayEntries) {
      map[entry.mealType].push(entry)
    }
    return MEAL_TYPE_ORDER.map((type) => ({
      mealType: type,
      items: map[type],
      totalKcal: map[type].reduce((sum, e) => sum + e.kcal, 0),
    })).filter((group) => group.items.length > 0)
  }, [previousDayEntries])

  const hasAnyToday = dayEntries.length > 0

  const handleStepEntryQty = (entry: LoggedFoodEntry, direction: 1 | -1) => {
    const isWeight = entry.unit === 'گرم' || entry.unit === 'میلی‌لیتر'
    const step = isWeight ? 25 : 0.5
    const min = isWeight ? 10 : 0.25
    const nextQty = Math.max(min, Math.round((entry.quantity + direction * step) * 100) / 100)
    onUpdateEntry(entry.id, { quantity: nextQty })
  }

  return (
    <section aria-label="وعده‌های ثبت‌شده" className="space-y-4">
      {/* Quick Repeat from Yesterday / Previous Day */}
      {repeatablePreviousMeals.length > 0 && (
        <div className="card-surface rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>تکرار سریع از {previousDayLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {repeatablePreviousMeals.map((group) => (
              <button
                key={group.mealType}
                type="button"
                onClick={() => onRepeatEntries(group.items, group.mealType)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#26262C] border border-[#2C2C33] px-3 py-2 text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-zinc-100">
                  تکرار {MEAL_TYPE_LABELS[group.mealType]}
                </span>
                <span className="text-zinc-400 tabular-nums-fa">
                  ({formatFaNumber(group.totalKcal)} کالری)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Grouped Meals */}
      {!hasAnyToday ? (
        <div className="card-surface rounded-2xl p-7 text-center">
          <div className="w-11 h-11 rounded-2xl bg-[#1E1E22] border border-[#2A2A30] flex items-center justify-center mx-auto mb-3 text-zinc-400">
            <Sun className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">هنوز وعده‌ای ثبت نشده است</h3>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            در کادر بالا غذای خود را به فارسی تایپ کنید یا یکی از پیشنهادهای سریع را لمس کنید تا در
            کمتر از ۱۰ ثانیه ثبت شود.
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="logged-meals-list">
          {MEAL_TYPE_ORDER.map((mealType) => {
            const items = groupedToday[mealType]
            if (items.length === 0) return null

            const Icon = MEAL_ICONS[mealType]
            const subtotalKcal = items.reduce((sum, item) => sum + item.kcal, 0)
            const subtotalProtein =
              Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10

            return (
              <div
                key={mealType}
                data-testid={`meal-group-${mealType}`}
                className="card-surface rounded-2xl overflow-hidden animate-fade-up"
              >
                {/* Meal Group Header */}
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#222227]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#1E1E22] flex items-center justify-center text-zinc-300">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100 leading-tight">
                        {MEAL_TYPE_LABELS[mealType]}
                      </h3>
                      <span className="text-[11px] text-zinc-500 tabular-nums-fa">
                        {formatFaNumber(items.length)} مورد · پروتئین{' '}
                        {formatFaNumber(subtotalProtein, 1)} گرم
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 tabular-nums-fa">
                      {formatFaNumber(subtotalKcal)} کالری
                    </span>
                    <button
                      type="button"
                      onClick={() => onRepeatEntries(items, mealType)}
                      title={`تکرار ${MEAL_TYPE_LABELS[mealType]}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#28282F] border border-[#2B2B32] px-2 py-1 text-[11px] text-zinc-300 hover:text-emerald-300 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>تکرار</span>
                    </button>
                  </div>
                </div>

                {/* Meal Items */}
                <ul className="divide-y divide-[#1F1F24]">
                  {items.map((entry) => {
                    const isEditing = editingEntryId === entry.id
                    return (
                      <li
                        key={entry.id}
                        data-testid="logged-meal-item"
                        className="px-4 py-3 hover:bg-[#1B1B1E] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-100 truncate">
                                {entry.foodName}
                              </span>
                              <span className="text-[11px] text-zinc-400 shrink-0 tabular-nums-fa">
                                {formatQuantityFa(entry.quantity)} {entry.unit}
                              </span>
                            </div>
                            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-zinc-500 mt-0.5 tabular-nums-fa">
                              <span>{formatFaNumber(entry.totalGrams)} گرم</span>
                              <span className="text-sky-400/80">
                                پ {formatFaNumber(entry.protein, 1)}گ
                              </span>
                              <span className="text-amber-400/80">
                                ک {formatFaNumber(entry.carbs, 1)}گ
                              </span>
                              <span className="text-rose-400/80">
                                چ {formatFaNumber(entry.fat, 1)}گ
                              </span>
                              <span className="text-zinc-600">{formatTimeFa(entry.timestamp)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-sm font-semibold text-zinc-200 tabular-nums-fa ml-1">
                              {formatFaNumber(entry.kcal)}
                              <span className="text-[10px] text-zinc-500 font-normal mr-1">
                                کالری
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingEntryId((curr) => (curr === entry.id ? null : entry.id))
                              }
                              aria-label={`ویرایش ${entry.foodName}`}
                              data-testid="edit-meal-item-btn"
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                isEditing
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#25252B]'
                              }`}
                            >
                              {isEditing ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Edit3 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) setEditingEntryId(null)
                                onDeleteEntry(entry.id)
                              }}
                              aria-label={`حذف ${entry.foodName}`}
                              data-testid="delete-meal-item-btn"
                              className="w-8 h-8 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/12 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Quick Edit Drawer */}
                        {isEditing && (
                          <div
                            data-testid="inline-entry-editor"
                            className="mt-2.5 pt-2.5 border-t border-[#26262C] flex flex-wrap items-center justify-between gap-2.5 animate-fade-up"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-zinc-400">مقدار:</span>
                              <button
                                type="button"
                                onClick={() => handleStepEntryQty(entry, 1)}
                                aria-label="افزایش مقدار"
                                className="w-7 h-7 rounded-lg bg-[#25252C] hover:bg-[#31313A] text-zinc-200 flex items-center justify-center"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-semibold text-zinc-100 px-1.5 tabular-nums-fa">
                                {formatQuantityFa(entry.quantity)} {entry.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStepEntryQty(entry, -1)}
                                aria-label="کاهش مقدار"
                                className="w-7 h-7 rounded-lg bg-[#25252C] hover:bg-[#31313A] text-zinc-200 flex items-center justify-center"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {MEAL_TYPE_ORDER.map((mt) => (
                                <button
                                  key={mt}
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, { mealType: mt })}
                                  className={`px-2 py-1 rounded-lg text-[11px] transition-colors ${
                                    entry.mealType === mt
                                      ? 'bg-emerald-500/18 text-emerald-300 font-semibold'
                                      : 'bg-[#222228] text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  {MEAL_TYPE_LABELS[mt]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
