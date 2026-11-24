import type { FoodItem, ParseResult, ParsedFoodItem } from '../../types/nutrition'
import { getCatalogIndex, matchFoodInDatabase, VAV_PLACEHOLDER } from './catalogIndex'
import { normalizePersian, toCompactKey } from './normalize'
import {
  BUILTIN_UNITS,
  COMPOUND_FRAC_QTY_REGEX,
  COMPOUND_HUNDREDS_REGEX,
  COMPOUND_HUNDREDS_SMALL_REGEX,
  COMPOUND_TENS_ONES_REGEX,
  matchQuantityAtStart,
  matchUnitAtStart,
  type UnitPattern,
} from './unitsAndQuantities'

/**
 * Splits a multi-item Persian meal string into individual item segments,
 * handling و, +, commas, semicolons, newlines, while preserving compound
 * quantities ("یک و نیم", "صد و پنجاه", "بیست و پنج") and dish names containing "و".
 */
export function splitMealSegments(rawInput: string, foods: FoodItem[]): string[] {
  const lines = rawInput
    .split(/\r?\n/)
    .map((line) => normalizePersian(line))
    .filter(Boolean)
  if (lines.length === 0) return []

  const { vavDishes } = getCatalogIndex(foods)
  const segments: string[] = []

  for (const line of lines) {
    // 1. Protect descending Persian compound numbers ("صد و بیست و پنج", "صد و پنجاه", "بیست و پنج")
    let protectedText = line
      .replace(COMPOUND_HUNDREDS_REGEX, (_m, p1, h, t, o) =>
        o
          ? `${p1}${h} ${VAV_PLACEHOLDER} ${t} ${VAV_PLACEHOLDER} ${o}`
          : `${p1}${h} ${VAV_PLACEHOLDER} ${t}`,
      )
      .replace(COMPOUND_HUNDREDS_SMALL_REGEX, `$1$2 ${VAV_PLACEHOLDER} $3`)
      .replace(COMPOUND_TENS_ONES_REGEX, `$1$2 ${VAV_PLACEHOLDER} $3`)

    // 2. Protect compound fractional quantities ("یک و نیم", "دو و ربع")
    protectedText = protectedText.replace(
      COMPOUND_FRAC_QTY_REGEX,
      `$1$2 ${VAV_PLACEHOLDER} $3`,
    )

    // 3. Protect known dish names/aliases containing " و "
    if (protectedText.includes(' و ')) {
      for (const rule of vavDishes) {
        if (protectedText.includes(rule.dish)) {
          protectedText = protectedText.replace(rule.regex, rule.replacement)
        }
      }
    }

    // 4. Split on delimiters & standalone " و "
    const rawParts = protectedText
      .split(/(?:[+,،;؛]|\s+(?:به\s+همراه|همراه\s+با)\s+|\s+و\s+)/)
      .map((part) => part.replaceAll(VAV_PLACEHOLDER, 'و').trim())
      .filter(Boolean)

    segments.push(...rawParts)
  }

  return segments
}

export function resolveFoodUnit(
  food: FoodItem,
  requestedUnit: string | null,
): { unit: string; gramsPerUnit: number } {
  const safeUnits = Array.isArray(food.units) ? food.units : []
  const defaultUnitObj =
    safeUnits.find((u) => toCompactKey(u.name) === toCompactKey(food.defaultUnit)) ??
    safeUnits[0] ?? { name: 'گرم', grams: 1 }

  if (!requestedUnit) {
    return { unit: defaultUnitObj.name, gramsPerUnit: defaultUnitObj.grams }
  }

  const reqCompact = toCompactKey(requestedUnit)

  for (const u of safeUnits) {
    if (toCompactKey(u.name) === reqCompact) {
      return { unit: u.name, gramsPerUnit: u.grams }
    }
    if (u.aliases?.some((a) => toCompactKey(a) === reqCompact)) {
      return { unit: u.name, gramsPerUnit: u.grams }
    }
  }

  if (reqCompact === 'کیلوگرم' || reqCompact === 'کیلو' || reqCompact === 'kg') {
    return { unit: 'کیلوگرم', gramsPerUnit: 1000 }
  }
  if (reqCompact === 'گرم') {
    return { unit: 'گرم', gramsPerUnit: 1 }
  }
  if (reqCompact === 'میلیلیتر') {
    return { unit: 'میلی‌لیتر', gramsPerUnit: 1 }
  }

  if (reqCompact === 'عدد') {
    return { unit: defaultUnitObj.name, gramsPerUnit: defaultUnitObj.grams }
  }

  const builtin = BUILTIN_UNITS.find((b) => toCompactKey(b.canonical) === reqCompact)
  if (builtin) {
    return { unit: builtin.canonical, gramsPerUnit: builtin.fallbackGrams }
  }

  return { unit: defaultUnitObj.name, gramsPerUnit: defaultUnitObj.grams }
}

export function calculateFoodMacros(
  food: FoodItem,
  quantity: number,
  gramsPerUnit: number,
): { totalGrams: number; kcal: number; protein: number; carbs: number; fat: number } {
  const safeQty = Math.max(0.05, quantity)
  const totalGrams = Math.round(safeQty * gramsPerUnit * 10) / 10
  const factor = totalGrams / 100

  return {
    totalGrams,
    kcal: Math.round(food.per100g.kcal * factor),
    protein: Math.round(food.per100g.protein * factor * 10) / 10,
    carbs: Math.round(food.per100g.carbs * factor * 10) / 10,
    fat: Math.round(food.per100g.fat * factor * 10) / 10,
  }
}

interface ExtractedSegmentParts {
  quantity: number
  unit: string | null
  foodQuery: string
}

function extractSegmentParts(segment: string, unitPatterns: UnitPattern[]): ExtractedSegmentParts {
  const tokens = segment.split(' ').filter(Boolean)
  if (tokens.length === 0) {
    return { quantity: 1, unit: null, foodQuery: '' }
  }

  const leadingQty = matchQuantityAtStart(tokens)
  if (leadingQty) {
    let idx = leadingQty.consumedTokens
    let unit: string | null = leadingQty.impliedUnit ?? null

    const unitMatch = matchUnitAtStart(tokens.slice(idx), unitPatterns)
    if (unitMatch) {
      unit = unitMatch.canonical
      idx += unitMatch.consumedTokens
    }

    const foodQuery = tokens.slice(idx).join(' ').trim()
    if (foodQuery) {
      return { quantity: leadingQty.quantity, unit, foodQuery }
    }
  }

  const leadingUnit = matchUnitAtStart(tokens, unitPatterns)
  if (leadingUnit) {
    const foodQuery = tokens.slice(leadingUnit.consumedTokens).join(' ').trim()
    if (foodQuery) {
      return { quantity: 1, unit: leadingUnit.canonical, foodQuery }
    }
  }

  for (let splitIdx = 1; splitIdx < tokens.length; splitIdx++) {
    const tail = tokens.slice(splitIdx)
    const tailQty = matchQuantityAtStart(tail)
    if (!tailQty) continue

    const afterQty = tail.slice(tailQty.consumedTokens)
    if (afterQty.length === 0) {
      const foodQuery = tokens.slice(0, splitIdx).join(' ').trim()
      return {
        quantity: tailQty.quantity,
        unit: tailQty.impliedUnit ?? null,
        foodQuery,
      }
    }

    const tailUnit = matchUnitAtStart(afterQty, unitPatterns)
    if (tailUnit && tailUnit.consumedTokens === afterQty.length) {
      const foodQuery = tokens.slice(0, splitIdx).join(' ').trim()
      return {
        quantity: tailQty.quantity,
        unit: tailUnit.canonical,
        foodQuery,
      }
    }
  }

  return { quantity: 1, unit: null, foodQuery: segment }
}

/**
 * Strips leading quantity & unit from an unmatched segment so 1-click
 * "افزودن به بانک غذا" prefills a clean food name (e.g. "دو کاسه غذای خاص" -> "غذای خاص").
 */
export function extractCleanFoodName(rawSegment: string, foods: FoodItem[]): string {
  const norm = normalizePersian(rawSegment)
  if (!norm) return rawSegment.trim()
  const { unitPatterns } = getCatalogIndex(foods)
  const { foodQuery } = extractSegmentParts(norm, unitPatterns)
  return foodQuery || rawSegment.trim()
}

/**
 * Main offline, deterministic Persian Natural Language Food Parser.
 */
export function parsePersianFoodInput(input: string, foods: FoodItem[]): ParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { items: [], unmatchedSegments: [] }
  }

  const { unitPatterns } = getCatalogIndex(foods)
  const segments = splitMealSegments(trimmed, foods)
  const items: ParsedFoodItem[] = []
  const unmatchedSegments: string[] = []

  segments.forEach((segment, index) => {
    const { quantity, unit: requestedUnit, foodQuery } = extractSegmentParts(segment, unitPatterns)
    if (!foodQuery) {
      unmatchedSegments.push(segment)
      return
    }

    const match = matchFoodInDatabase(foodQuery, foods)
    if (!match) {
      unmatchedSegments.push(segment)
      return
    }

    const resolved = resolveFoodUnit(match.food, requestedUnit)
    const macros = calculateFoodMacros(match.food, quantity, resolved.gramsPerUnit)

    items.push({
      id: `${match.food.id}-${index}-${quantity}-${resolved.unit}`,
      food: match.food,
      quantity,
      unit: resolved.unit,
      gramsPerUnit: resolved.gramsPerUnit,
      totalGrams: macros.totalGrams,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      rawSegment: segment,
      confidence: match.confidence,
      isAmbiguous: match.isAmbiguous,
      alternatives: match.alternatives,
    })
  })

  return { items, unmatchedSegments }
}
