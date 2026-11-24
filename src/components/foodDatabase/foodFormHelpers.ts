import type { FoodCategory, FoodItem } from '../../types/nutrition'
import { toAsciiDigits } from '../../utils/persianFormat'

export type CategoryFilter = 'all' | 'custom' | 'verified' | FoodCategory
export type MacroInputMode = 'perUnit' | 'per100g'
export type ModalMode = 'single' | 'recipe'

export interface UnitDraft {
  name: string
  grams: string
}

export interface RecipeIngredientDraft {
  foodId: string
  quantity: string
  unit: string
}

export interface FoodFormState {
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

export const CATEGORY_ORDER: FoodCategory[] = [
  'stews_mains',
  'rice_breads',
  'breakfast_dairy',
  'drinks_snacks',
]

export function parsePositiveNum(raw: string, fallback = 0): number {
  const cleaned = toAsciiDigits(raw).replace(/٫/g, '.').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function createEmptyForm(prefillName = ''): FoodFormState {
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

export function createFormFromFood(food: FoodItem): FoodFormState {
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
