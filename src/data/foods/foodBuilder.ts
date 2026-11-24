import type { FoodCategory, FoodItem, FoodUnit } from '../../types/nutrition'
import { DEFAULT_APPROXIMATE_SOURCE, VERIFIED_FOOD_SOURCES } from './verifiedRegistry'

export const NUTRITION_DATA_SOURCES = {
  shortNotice:
    'ارزش‌های غذایی برآورد تقریبی هستند (۶۷ قلم پرمصرف با جدول ترکیبات ایران و USDA تطبیق شده‌اند؛ طبخ خانگی متغیر است).',
  detailedSources: [
    'جدول ترکیبات مواد غذایی ایران (انستیتو تحقیقات تغذیه‌ای و صنایع غذایی کشور — NNFTRI)',
    'پایگاه رسمی USDA FoodData Central (SR Legacy & Foundation Foods برای اقلام پایه، لبنیات، میوه‌ها و مغزها)',
    'برچسب ارزش غذایی و استاندارد ملی فرآورده‌های رایج بازار ایران (برای اقلام بسته‌بندی‌شده؛ همگی به‌عنوان برآورد تقریبی نمایش داده می‌شوند)',
  ],
} as const

type UnitTuple = readonly [name: string, grams: number, aliases?: string[]]

export interface FoodSourceMeta {
  source?: string
  verified?: boolean
}

/** Compact, strictly typed helper to construct normalized Iranian FoodItem records with source & verification metadata. */
export function mkFood(
  id: string,
  name: string,
  category: FoodCategory,
  per100g: readonly [kcal: number, protein: number, carbs: number, fat: number],
  units: readonly UnitTuple[],
  aliases: string[] = [],
  meta?: FoodSourceMeta,
): FoodItem {
  const mappedUnits: FoodUnit[] = units.map(([uName, grams, uAliases]) =>
    uAliases ? { name: uName, grams, aliases: uAliases } : { name: uName, grams },
  )
  if (!mappedUnits.some((u) => u.name === 'گرم')) {
    mappedUnits.push({ name: 'گرم', grams: 1 })
  }

  const registrySource = VERIFIED_FOOD_SOURCES[id]
  const verified = meta?.verified ?? Boolean(registrySource)
  const source = meta?.source ?? registrySource ?? DEFAULT_APPROXIMATE_SOURCE

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
    source,
    verified,
  }
}
