import type { FoodCategory, FoodItem, FoodUnit } from '../../types/nutrition'

export const NUTRITION_DATA_SOURCES = {
  shortNotice: 'ارزش‌های غذایی تقریبی هستند (منبع: جدول ترکیبات مواد غذایی ایران و پایگاه USDA).',
  detailedSources: [
    'جدول ترکیبات مواد غذایی ایران (انستیتو تحقیقات تغذیه‌ای و صنایع غذایی کشور)',
    'پایگاه رسمی USDA FoodData Central (برای مواد خام، میوه‌ها، لبنیات و مغزها)',
    'برچسب ارزش غذایی محصولات رایج بازار ایران (برای اقلام بسته‌بندی‌شده)',
  ],
} as const

type UnitTuple = readonly [name: string, grams: number, aliases?: string[]]

/** Compact, strictly typed helper to construct normalized Iranian FoodItem records. */
export function mkFood(
  id: string,
  name: string,
  category: FoodCategory,
  per100g: readonly [kcal: number, protein: number, carbs: number, fat: number],
  units: readonly UnitTuple[],
  aliases: string[] = [],
): FoodItem {
  const mappedUnits: FoodUnit[] = units.map(([uName, grams, uAliases]) =>
    uAliases ? { name: uName, grams, aliases: uAliases } : { name: uName, grams },
  )
  if (!mappedUnits.some((u) => u.name === 'گرم')) {
    mappedUnits.push({ name: 'گرم', grams: 1 })
  }

  return {
    id,
    name,
    aliases,
    category,
    per100g: {
      kcal: per100g[0],
      protein: per100g[1],
      carbs: per100g[2],
      fat: per100g[3],
    },
    defaultUnit: mappedUnits[0].name,
    units: mappedUnits,
  }
}
