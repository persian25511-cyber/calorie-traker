import type { FoodItem, ParseResult, ParsedFoodItem } from '../types/nutrition'
import { toAsciiDigits } from './persianFormat'

/**
 * Normalizes Persian/Arabic characters, digits, ZWNJ, and whitespace
 * into a clean canonical form suitable for tokenization and matching.
 */
export function normalizePersian(input: string): string {
  return toAsciiDigits(input)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove diacritics & tatweel
    .replace(/ك/g, 'ک')
    .replace(/[يىئ]/g, 'ی')
    .replace(/ة/g, 'ه')
    .replace(/[أإ]/g, 'ا')
    .replace(/٫/g, '.')
    .replace(/\u200C/g, ' ') // ZWNJ -> space for consistent tokenization
    .replace(/(\d+(?:\.\d+)?)([^\d.\s/+،,;؛])/g, '$1 $2') // separate "150گرم" -> "150 گرم"
    .replace(/([^\d.\s/+،,;؛])(\d+(?:\.\d+)?)/g, '$1 $2') // separate "برنج150" -> "برنج 150"
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Creates a comparison key where spaces, ZWNJ, and Alef-Madda (آ vs ا)
 * are collapsed so "قورمهسبزی", "قورمه سبزی", and "قورمه‌سبزی" match identically.
 */
export function toCompactKey(input: string): string {
  return normalizePersian(input)
    .replace(/آ/g, 'ا')
    .replace(/[\s\u200C\-_]+/g, '')
}

/**
 * Creates a space-separated comparison key with Alef-Madda normalized (آ -> ا).
 */
export function toSpaceKey(input: string): string {
  return normalizePersian(input).replace(/آ/g, 'ا').replace(/\s+/g, ' ').trim()
}

interface UnitDefinition {
  canonical: string
  synonyms: string[]
  fallbackGrams: number
}

const BUILTIN_UNITS: UnitDefinition[] = [
  {
    canonical: 'قاشق غذاخوری',
    synonyms: [
      'قاشق غذاخوری',
      'قاشق غذا خوری',
      'قاشق سوپخوری',
      'قاشق سوپ خوری',
      'قاشق بزرگ',
      'قاشق پر',
      'قاشق',
      'ق غ',
      'tbsp',
    ],
    fallbackGrams: 20,
  },
  {
    canonical: 'قاشق چای‌خوری',
    synonyms: [
      'قاشق چایخوری',
      'قاشق چای خوری',
      'قاشق مرباخوری',
      'قاشق مربا خوری',
      'قاشق کوچک',
      'قاشق کوچیک',
      'ق چ',
      'tsp',
    ],
    fallbackGrams: 6,
  },
  {
    canonical: 'کف دست',
    synonyms: ['کف دست', 'کفدست'],
    fallbackGrams: 30,
  },
  {
    canonical: 'قوطی کبریت',
    synonyms: ['قوطی کبریت', 'اندازه قوطی کبریت'],
    fallbackGrams: 30,
  },
  {
    canonical: 'کفگیر',
    synonyms: ['کفگیر', 'کف گیر'],
    fallbackGrams: 110,
  },
  {
    canonical: 'ملاقه',
    synonyms: ['ملاقه'],
    fallbackGrams: 140,
  },
  {
    canonical: 'اسکوپ',
    synonyms: ['اسکوپ', 'پیمانه پروتئین'],
    fallbackGrams: 50,
  },
  {
    canonical: 'پیمانه',
    synonyms: ['پیمانه'],
    fallbackGrams: 100,
  },
  {
    canonical: 'برش',
    synonyms: ['برش', 'اسلایس', 'قاچ'],
    fallbackGrams: 35,
  },
  {
    canonical: 'لیوان',
    synonyms: ['لیوان', 'ماگ'],
    fallbackGrams: 230,
  },
  {
    canonical: 'فنجان',
    synonyms: ['فنجان', 'استکان'],
    fallbackGrams: 150,
  },
  {
    canonical: 'کاسه',
    synonyms: ['کاسه', 'بشقاب'],
    fallbackGrams: 220,
  },
  {
    canonical: 'پیاله',
    synonyms: ['پیاله', 'کاسه کوچک', 'کاسه کوچیک'],
    fallbackGrams: 130,
  },
  {
    canonical: 'سیخ',
    synonyms: ['سیخ'],
    fallbackGrams: 150,
  },
  {
    canonical: 'تکه',
    synonyms: ['تکه', 'تیکه', 'قطعه', 'مربع'],
    fallbackGrams: 50,
  },
  {
    canonical: 'برگ',
    synonyms: ['برگ', 'ورق'],
    fallbackGrams: 55,
  },
  {
    canonical: 'پرس',
    synonyms: ['پرس', 'وعده'],
    fallbackGrams: 280,
  },
  {
    canonical: 'مشت',
    synonyms: ['مشت'],
    fallbackGrams: 28,
  },
  {
    canonical: 'بسته',
    synonyms: ['بسته', 'پاکت', 'ساشه'],
    fallbackGrams: 50,
  },
  {
    canonical: 'قوطی',
    synonyms: ['قوطی', 'کنسرو'],
    fallbackGrams: 180,
  },
  {
    canonical: 'حبه',
    synonyms: ['حبه'],
    fallbackGrams: 4,
  },
  {
    canonical: 'شاخه',
    synonyms: ['شاخه'],
    fallbackGrams: 15,
  },
  {
    canonical: 'خوشه',
    synonyms: ['خوشه'],
    fallbackGrams: 160,
  },
  {
    canonical: 'عدد',
    synonyms: ['عدد', 'دانه', 'دونه', 'تا'],
    fallbackGrams: 60,
  },
  {
    canonical: 'گرم',
    synonyms: ['گرم', 'gr', 'gram', 'grams', 'g'],
    fallbackGrams: 1,
  },
  {
    canonical: 'میلی‌لیتر',
    synonyms: ['میلی لیتر', 'میلیلیتر', 'سی سی', 'ml', 'cc'],
    fallbackGrams: 1,
  },
]

const SINGLE_NUMBER_WORDS: Record<string, number> = {
  ربع: 0.25,
  نصف: 0.5,
  نصفه: 0.5,
  نصفی: 0.5,
  نیم: 0.5,
  یک: 1,
  یه: 1,
  یکی: 1,
  دو: 2,
  دوتا: 2,
  سه: 3,
  سهتا: 3,
  چهار: 4,
  چهارتا: 4,
  پنج: 5,
  پنجتا: 5,
  شش: 6,
  شیش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  یازده: 11,
  دوازده: 12,
  سیزده: 13,
  چهارده: 14,
  پانزده: 15,
  پونزده: 15,
  شانزده: 16,
  هفده: 17,
  هجده: 18,
  نوزده: 19,
  بیست: 20,
  بیستوپنج: 25,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
  صد: 100,
  یکصد: 100,
  دویست: 200,
  سیصد: 300,
  چهارصد: 400,
  پانصد: 500,
}

const FRACTION_PHRASES: Array<{ tokens: string[]; value: number }> = [
  { tokens: ['یک', 'دوم'], value: 0.5 },
  { tokens: ['یک', 'چهارم'], value: 0.25 },
  { tokens: ['سه', 'چهارم'], value: 0.75 },
  { tokens: ['یک', 'سوم'], value: 0.33 },
  { tokens: ['دو', 'سوم'], value: 0.67 },
]

const FILLER_WORDS = new Set(['از', 'مقداری', 'حدود', 'تقریبا', 'کمی', 'مقدار', 'کامل', 'متوسط'])

/**
 * Ambiguous generic Persian terms where multiple dishes differ significantly
 * in calories (e.g. برنج کته vs برنج آبکش، ماست معمولی vs ماست پرچرب/یونانی).
 */
const AMBIGUOUS_GENERIC_QUERIES: Record<string, string[]> = {
  برنج: ['berenj-kateh', 'berenj-abkesh', 'berenj-ghahvei'],
  پلو: ['berenj-kateh', 'berenj-abkesh', 'baghali-polo'],
  چلو: ['berenj-kateh', 'berenj-abkesh'],
  ماست: ['yogurt', 'yogurt-highfat', 'strained-yogurt', 'greek-yogurt'],
  پنیر: ['white-cheese', 'lighvan-cheese', 'cream-cheese', 'cottage-cheese'],
  شیر: ['milk', 'milk-fullfat', 'chocolate-milk'],
  کباب: ['kabab-koobideh', 'joojeh-kabab', 'kabab-barg', 'kabab-chenjeh'],
  پیتزا: ['pizza-makhloot', 'pizza-pepperoni', 'pizza-margherita', 'pizza-chicken'],
  شیرینی: ['dry-pastry', 'danish-pastry', 'napoleon-pastry', 'baklava'],
  بستنی: ['saffron-ice-cream', 'packaged-icecream-bar'],
  شکلات: ['milk-chocolate', 'dark-chocolate-70'],
  ماهی: ['grilled-trout', 'fried-fish', 'salmon-grilled'],
  سوپ: ['barley-soup', 'soup-vermicelli', 'soup-mushroom'],
  بیسکویت: ['biscuit-mother', 'petit-beurre', 'sagheh-talayi'],
  مرغ: ['grilled-chicken-breast', 'chicken-thigh-cooked'],
}

/** Protect "یک و نیم", "2 و نیم", "دو و ربع", etc., from being split on "و". */
const NUMBER_TOKEN_PATTERN =
  '(?:\\d+(?:\\.\\d+)?|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده)'
const COMPOUND_QTY_REGEX = new RegExp(
  `(^|\\s)(${NUMBER_TOKEN_PATTERN})\\s+و\\s+(نیم|نصف|نصفی|ربع|یک\\s+دوم|یک\\s+چهارم)(?=\\s|$)`,
  'g',
)

const VAV_PLACEHOLDER = '__VAV__'

/**
 * Splits a multi-item Persian meal string into individual item segments,
 * handling و, +, commas, semicolons, newlines, while preserving compound
 * quantities like "یک و نیم" and dish names containing "و" (e.g. "کشک و بادمجان").
 */
export function splitMealSegments(rawInput: string, foods: FoodItem[]): string[] {
  const lines = rawInput
    .split(/\r?\n/)
    .map((line) => normalizePersian(line))
    .filter(Boolean)
  if (lines.length === 0) return []

  const vavDishes: string[] = []
  for (const food of foods) {
    const names = [food.name, ...food.aliases]
    for (const n of names) {
      const normName = normalizePersian(n)
      if (normName.includes(' و ')) {
        vavDishes.push(normName)
      }
    }
  }
  vavDishes.sort((a, b) => b.length - a.length)

  const segments: string[] = []

  for (const line of lines) {
    let protectedText = line.replace(
      COMPOUND_QTY_REGEX,
      `$1$2 ${VAV_PLACEHOLDER} $3`,
    )

    for (const dish of vavDishes) {
      if (protectedText.includes(dish)) {
        const escaped = dish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const replacement = dish.replace(/ و /g, ` ${VAV_PLACEHOLDER} `)
        protectedText = protectedText.replace(new RegExp(escaped, 'g'), replacement)
      }
    }

    const rawParts = protectedText
      .split(/(?:[+,،;؛]|\s+(?:به\s+همراه|همراه\s+با)\s+|\s+و\s+)/)
      .map((part) => part.replace(new RegExp(VAV_PLACEHOLDER, 'g'), 'و').trim())
      .filter(Boolean)

    segments.push(...rawParts)
  }

  return segments
}

interface QuantityMatch {
  quantity: number
  consumedTokens: number
  impliedUnit?: string
}

function parseNumericToken(token: string): number | null {
  if (/^\d+(?:\.\d+)?$/.test(token)) {
    const n = Number(token)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const fracMatch = token.match(/^(\d+)\/(\d+)$/)
  if (fracMatch) {
    const num = Number(fracMatch[1])
    const den = Number(fracMatch[2])
    if (den > 0 && num > 0) return Math.round((num / den) * 100) / 100
  }
  return null
}

function parseBaseNumberToken(token: string): number | null {
  const numeric = parseNumericToken(token)
  if (numeric !== null) return numeric
  if (token in SINGLE_NUMBER_WORDS) {
    return SINGLE_NUMBER_WORDS[token]
  }
  return null
}

function matchQuantityAtStart(tokens: string[]): QuantityMatch | null {
  if (tokens.length === 0) return null

  if (tokens.length >= 4 && tokens[1] === 'و') {
    const base = parseBaseNumberToken(tokens[0])
    if (base !== null && base >= 1) {
      if (tokens[2] === 'یک' && tokens[3] === 'دوم') {
        return { quantity: base + 0.5, consumedTokens: 4 }
      }
      if (tokens[2] === 'یک' && tokens[3] === 'چهارم') {
        return { quantity: base + 0.25, consumedTokens: 4 }
      }
    }
  }

  if (tokens.length >= 3 && tokens[1] === 'و') {
    const base = parseBaseNumberToken(tokens[0])
    if (base !== null && base >= 1) {
      if (tokens[2] === 'نیم' || tokens[2] === 'نصف' || tokens[2] === 'نصفی') {
        return { quantity: base + 0.5, consumedTokens: 3 }
      }
      if (tokens[2] === 'ربع') {
        return { quantity: base + 0.25, consumedTokens: 3 }
      }
    }
  }

  if (tokens.length >= 2) {
    for (const frac of FRACTION_PHRASES) {
      if (tokens[0] === frac.tokens[0] && tokens[1] === frac.tokens[1]) {
        return { quantity: frac.value, consumedTokens: 2 }
      }
    }
  }

  if (tokens.length >= 2 && (tokens[1] === 'تا' || tokens[1] === 'دونه' || tokens[1] === 'دانه')) {
    const base = parseBaseNumberToken(tokens[0])
    if (base !== null) {
      return { quantity: base, consumedTokens: 2, impliedUnit: 'عدد' }
    }
  }

  if (
    tokens[0] === 'دوتا' ||
    tokens[0] === 'سهتا' ||
    tokens[0] === 'چهارتا' ||
    tokens[0] === 'پنجتا'
  ) {
    return {
      quantity: SINGLE_NUMBER_WORDS[tokens[0]],
      consumedTokens: 1,
      impliedUnit: 'عدد',
    }
  }

  const single = parseBaseNumberToken(tokens[0])
  if (single !== null) {
    return { quantity: single, consumedTokens: 1 }
  }

  return null
}

interface UnitPattern {
  canonical: string
  tokens: string[]
  compact: string
}

function buildUnitPatterns(foods: FoodItem[]): UnitPattern[] {
  const patterns: UnitPattern[] = []
  const seen = new Set<string>()

  const addPattern = (canonical: string, phrase: string) => {
    const norm = toSpaceKey(phrase)
    if (!norm) return
    const key = `${canonical}::${norm}`
    if (seen.has(key)) return
    seen.add(key)
    patterns.push({
      canonical,
      tokens: norm.split(' '),
      compact: norm.replace(/\s+/g, ''),
    })
  }

  for (const food of foods) {
    for (const unit of food.units) {
      addPattern(unit.name, unit.name)
      if (unit.aliases) {
        for (const alias of unit.aliases) {
          addPattern(unit.name, alias)
        }
      }
    }
  }

  for (const def of BUILTIN_UNITS) {
    addPattern(def.canonical, def.canonical)
    for (const syn of def.synonyms) {
      addPattern(def.canonical, syn)
    }
  }

  patterns.sort((a, b) => {
    if (b.tokens.length !== a.tokens.length) return b.tokens.length - a.tokens.length
    return b.compact.length - a.compact.length
  })

  return patterns
}

interface UnitMatch {
  canonical: string
  consumedTokens: number
}

function matchUnitAtStart(tokens: string[], patterns: UnitPattern[]): UnitMatch | null {
  if (tokens.length === 0) return null
  const normalizedTokens = tokens.map((t) => toSpaceKey(t))

  for (const pattern of patterns) {
    const len = pattern.tokens.length
    if (normalizedTokens.length >= len) {
      let allMatch = true
      for (let i = 0; i < len; i++) {
        if (normalizedTokens[i] !== pattern.tokens[i]) {
          allMatch = false
          break
        }
      }
      if (allMatch) {
        return { canonical: pattern.canonical, consumedTokens: len }
      }
    }
    if (len > 1 && normalizedTokens[0] === pattern.compact) {
      return { canonical: pattern.canonical, consumedTokens: 1 }
    }
  }

  return null
}

/** Optimal String Alignment (Damerau-Levenshtein) distance for fuzzy Persian typo matching. */
function damerauLevenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, dp[i - 2][j - 2] + 1)
      }
      dp[i][j] = best
    }
  }
  return dp[m][n]
}

function scoreFoodNameMatch(querySpace: string, queryCompact: string, candidate: string): number {
  const candSpace = toSpaceKey(candidate)
  const candCompact = toCompactKey(candidate)
  if (!queryCompact || !candCompact) return 0

  if (queryCompact === candCompact) return 1.0

  if (candCompact.startsWith(queryCompact) && queryCompact.length >= 2) {
    const ratio = queryCompact.length / candCompact.length
    return 0.85 + ratio * 0.12
  }
  if (queryCompact.startsWith(candCompact) && candCompact.length >= 3) {
    const ratio = candCompact.length / queryCompact.length
    return 0.8 + ratio * 0.12
  }
  if (candCompact.includes(queryCompact) && queryCompact.length >= 3) {
    const ratio = queryCompact.length / candCompact.length
    return 0.78 + ratio * 0.14
  }
  if (queryCompact.includes(candCompact) && candCompact.length >= 3) {
    const ratio = candCompact.length / queryCompact.length
    return 0.74 + ratio * 0.14
  }

  const qTokens = querySpace.split(' ').filter((t) => t.length >= 2)
  const cTokens = candSpace.split(' ').filter((t) => t.length >= 2)
  if (qTokens.length > 0 && cTokens.length > 0) {
    let matched = 0
    for (const qt of qTokens) {
      if (cTokens.some((ct) => ct === qt || ct.includes(qt) || qt.includes(ct))) {
        matched++
      }
    }
    if (matched > 0) {
      const precision = matched / qTokens.length
      const recall = matched / cTokens.length
      const f1 = (2 * precision * recall) / (precision + recall)
      if (f1 >= 0.55) {
        return 0.65 + f1 * 0.22
      }
    }
  }

  const maxLen = Math.max(queryCompact.length, candCompact.length)
  if (maxLen >= 4) {
    const dist = damerauLevenshtein(queryCompact, candCompact)
    const similarity = 1 - dist / maxLen
    if (similarity >= 0.68 && dist <= 2) {
      return similarity * 0.9
    }
  }

  return 0
}

export interface FoodMatchResult {
  food: FoodItem
  confidence: number
  isAmbiguous: boolean
  alternatives: FoodItem[]
}

/** Finds the best matching FoodItem plus ambiguity/alternative suggestions when relevant. */
export function matchFoodInDatabase(foodQuery: string, foods: FoodItem[]): FoodMatchResult | null {
  const cleaned = foodQuery
    .split(' ')
    .filter((token) => token && !FILLER_WORDS.has(token))
    .join(' ')
    .trim()

  const querySpace = toSpaceKey(cleaned || foodQuery)
  const queryCompact = toCompactKey(cleaned || foodQuery)
  if (!queryCompact || queryCompact.length < 2) return null

  const scored: Array<{ food: FoodItem; score: number }> = []

  for (const food of foods) {
    let foodBest = scoreFoodNameMatch(querySpace, queryCompact, food.name)
    for (const alias of food.aliases) {
      const aliasScore = scoreFoodNameMatch(querySpace, queryCompact, alias)
      const adjusted = aliasScore === 1.0 ? 0.995 : aliasScore * 0.99
      if (adjusted > foodBest) {
        foodBest = adjusted
      }
    }
    if (foodBest >= 0.64) {
      scored.push({ food, score: foodBest })
    }
  }

  if (scored.length === 0) return null
  scored.sort((a, b) => b.score - a.score)

  const top = scored[0]
  const confidence = Math.round(top.score * 100) / 100

  // Check explicit generic ambiguous term (e.g. "برنج" -> کته vs آبکش vs قهوه‌ای)
  const genericIds = AMBIGUOUS_GENERIC_QUERIES[queryCompact]
  let alternatives: FoodItem[] = []
  let isAmbiguous = false

  if (genericIds) {
    const byId = new Map(foods.map((f) => [f.id, f]))
    alternatives = genericIds
      .filter((id) => id !== top.food.id)
      .map((id) => byId.get(id))
      .filter((f): f is FoodItem => Boolean(f))
      .slice(0, 3)
    if (alternatives.length > 0) {
      isAmbiguous = true
    }
  } else if (confidence < 0.86) {
    // Low-confidence / fuzzy match: surface up to 3 nearby candidates
    alternatives = scored
      .slice(1, 4)
      .filter((s) => s.score >= 0.68)
      .map((s) => s.food)
    isAmbiguous = true
  } else if (
    scored.length > 1 &&
    top.score < 0.98 &&
    top.score - scored[1].score <= 0.04
  ) {
    // Close tie between multiple foods
    alternatives = scored.slice(1, 4).map((s) => s.food)
    isAmbiguous = true
  }

  return {
    food: top.food,
    confidence,
    isAmbiguous,
    alternatives,
  }
}

export function resolveFoodUnit(
  food: FoodItem,
  requestedUnit: string | null,
): { unit: string; gramsPerUnit: number } {
  const defaultUnitObj =
    food.units.find((u) => toCompactKey(u.name) === toCompactKey(food.defaultUnit)) ??
    food.units[0] ?? { name: 'گرم', grams: 1 }

  if (!requestedUnit) {
    return { unit: defaultUnitObj.name, gramsPerUnit: defaultUnitObj.grams }
  }

  const reqCompact = toCompactKey(requestedUnit)

  for (const u of food.units) {
    if (toCompactKey(u.name) === reqCompact) {
      return { unit: u.name, gramsPerUnit: u.grams }
    }
    if (u.aliases?.some((a) => toCompactKey(a) === reqCompact)) {
      return { unit: u.name, gramsPerUnit: u.grams }
    }
  }

  if (reqCompact === toCompactKey('گرم')) {
    return { unit: 'گرم', gramsPerUnit: 1 }
  }
  if (reqCompact === toCompactKey('میلی‌لیتر')) {
    return { unit: 'میلی‌لیتر', gramsPerUnit: 1 }
  }

  if (reqCompact === toCompactKey('عدد')) {
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
  const unitPatterns = buildUnitPatterns(foods)
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

  const segments = splitMealSegments(trimmed, foods)
  const unitPatterns = buildUnitPatterns(foods)
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

export function matchesFoodSearch(food: FoodItem, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true

  const qCompact = toCompactKey(trimmed)
  const qSpace = toSpaceKey(trimmed)
  if (!qCompact) return true

  const candidates = [food.name, ...food.aliases, ...food.units.map((u) => u.name)]
  return candidates.some((cand) => {
    const cCompact = toCompactKey(cand)
    const cSpace = toSpaceKey(cand)
    return cCompact.includes(qCompact) || cSpace.includes(qSpace)
  })
}
