import type { MacroValues } from '../../types/nutrition'
import { toSpaceKey } from './normalize'

export interface CookingModifierSpec {
  id: 'lean' | 'rich'
  label: string
  fatMultiplier: number
  minFatDelta: number
  phrases: string[]
}

const COOKING_MODIFIERS: CookingModifierSpec[] = [
  {
    id: 'lean',
    label: 'کم‌روغن / رژیمی',
    fatMultiplier: 0.7,
    minFatDelta: -0.5,
    phrases: [
      'بدون روغن',
      'بدون کره',
      'کم روغن',
      'کم چرب',
      'با ایرفرایر',
      'در ایرفرایر',
      'ایرفرایر',
      'هواپز',
      'رژیمی',
      'بخارپز',
    ],
  },
  {
    id: 'rich',
    label: 'پرچرب / با کره',
    fatMultiplier: 1.35,
    minFatDelta: 3.0,
    phrases: ['با کره', 'کره ای', 'پر روغن', 'پرروغن', 'پرچرب', 'پر چرب', 'چرب و چیلی'],
  },
]

export interface ExtractedCookingModifier {
  strippedQuery: string
  modifier: CookingModifierSpec | null
}

/**
 * Extracts trailing or inline Persian cooking preparation modifiers from a food query.
 * Used as a fallback/refinement when the raw query is not already a distinct catalog item
 * (so built-ins like "شیر کم‌چرب" or "ماست پرچرب" still match their exact catalog entries).
 */
export function extractCookingModifier(foodQuery: string): ExtractedCookingModifier {
  const norm = toSpaceKey(foodQuery)
  if (!norm) return { strippedQuery: foodQuery, modifier: null }

  for (const spec of COOKING_MODIFIERS) {
    for (const phrase of spec.phrases) {
      const normPhrase = toSpaceKey(phrase)
      const escaped = normPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`)
      if (re.test(norm)) {
        const stripped = norm.replace(re, ' ').replace(/\s+/g, ' ').trim()
        if (stripped.length >= 2) {
          return { strippedQuery: stripped, modifier: spec }
        }
      }
    }
  }

  return { strippedQuery: foodQuery, modifier: null }
}

/** Adjusts per-100g fat and kcal transparently according to a cooking modifier. */
export function applyCookingModifierToPer100g(
  base: MacroValues,
  modifier: CookingModifierSpec,
): MacroValues {
  let nextFat = base.fat
  if (modifier.id === 'lean') {
    if (base.fat < 1.5) return base
    nextFat = Math.max(0.5, Math.round(base.fat * modifier.fatMultiplier * 10) / 10)
  } else {
    const scaled = base.fat * modifier.fatMultiplier
    const withFloor = Math.max(scaled, base.fat + modifier.minFatDelta)
    nextFat = Math.round(withFloor * 10) / 10
  }

  const deltaFat = nextFat - base.fat
  const nextKcal = Math.max(5, Math.round((base.kcal + deltaFat * 9) * 10) / 10)

  return {
    ...base,
    kcal: nextKcal,
    fat: nextFat,
  }
}
