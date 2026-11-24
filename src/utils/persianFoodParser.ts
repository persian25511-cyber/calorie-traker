import type { FoodItem, ParseResult, ParsedFoodItem } from '../types/nutrition'
import { toAsciiDigits } from './persianFormat'

/**
 * Normalizes Persian/Arabic characters, digits, ZWNJ, non-decimal punctuation,
 * and whitespace into a clean canonical form suitable for tokenization and matching.
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
    .replace(/[!؟?()"«»'`[\]{}:]/g, ' ') // strip non-structural punctuation
    .replace(/(^|[^\d])\.(?=[^\d]|$)/g, '$1 ') // strip standalone/trailing dots while keeping 1.5
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
    canonical: 'کیلوگرم',
    synonyms: ['کیلوگرم', 'کیلو', 'kg'],
    fallbackGrams: 1000,
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

const HUNDREDS_WORDS: Record<string, number> = {
  صد: 100,
  یکصد: 100,
  دویست: 200,
  سیصد: 300,
  چهارصد: 400,
  پانصد: 500,
  ششصد: 600,
  هفتصد: 700,
  هشتصد: 800,
  نهصد: 900,
}

const TENS_WORDS: Record<string, number> = {
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
}

const TEENS_WORDS: Record<string, number> = {
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
}

const ONES_WORDS: Record<string, number> = {
  یک: 1,
  یه: 1,
  یکی: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  شیش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
}

const SINGLE_NUMBER_WORDS: Record<string, number> = {
  ربع: 0.25,
  نصف: 0.5,
  نصفه: 0.5,
  نصفی: 0.5,
  نیم: 0.5,
  ...ONES_WORDS,
  دوتا: 2,
  سهتا: 3,
  چهارتا: 4,
  پنجتا: 5,
  ...TEENS_WORDS,
  ...TENS_WORDS,
  بیستوپنج: 25,
  ...HUNDREDS_WORDS,
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
  مرغسوخاری: ['chicken-strips', 'fried-chicken-drumstick'],
}

// Strict place-value Persian compound number patterns to protect "و" during segment splitting:
// 1) Hundreds + و + Tens (+ optional و + Ones) OR Hundreds + و + Teens/Ones (e.g. "صد و پنجاه", "صد و بیست و پنج")
const HUNDREDS_PATTERN = '(?:صد|یکصد|دویست|سیصد|چهارصد|پانصد|ششصد|هفتصد|هشتصد|نهصد)'
const TENS_PATTERN = '(?:بیست|سی|چهل|پنجاه|شصت|هفتاد|هشتاد|نود)'
const TEENS_ONES_PATTERN =
  '(?:یازده|دوازده|سیزده|چهارده|پانزده|پونزده|شانزده|هفده|هجده|نوزده|ده|یک|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه)'
const ONES_STRICT_PATTERN = '(?:یک|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه)'

const COMPOUND_HUNDREDS_REGEX = new RegExp(
  `(^|\\s)(${HUNDREDS_PATTERN})\\s+و\\s+(${TENS_PATTERN})(?:\\s+و\\s+(${ONES_STRICT_PATTERN}))?(?=\\s|$)`,
  'g',
)
const COMPOUND_HUNDREDS_SMALL_REGEX = new RegExp(
  `(^|\\s)(${HUNDREDS_PATTERN})\\s+و\\s+(${TEENS_ONES_PATTERN})(?=\\s|$)`,
  'g',
)
const COMPOUND_TENS_ONES_REGEX = new RegExp(
  `(^|\\s)(${TENS_PATTERN})\\s+و\\s+(${ONES_STRICT_PATTERN})(?=\\s|$)`,
  'g',
)
const NUMBER_TOKEN_PATTERN =
  '(?:\\d+(?:\\.\\d+)?|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده)'
const COMPOUND_FRAC_QTY_REGEX = new RegExp(
  `(^|\\s)(${NUMBER_TOKEN_PATTERN})\\s+و\\s+(نیم|نصف|نصفی|ربع|یک\\s+دوم|یک\\s+چهارم)(?=\\s|$)`,
  'g',
)

const VAV_PLACEHOLDER = '__VAV__'

// ============================================================================
// High-Performance Memoized Catalog Index (WeakMap per FoodItem & FoodItem[])
// Eliminates ~36,000 regex calls + ~3,500 2D array allocations per keystroke!
// ============================================================================

interface PreparedCandidate {
  space: string
  compact: string
  tokens: string[]
}

interface PreparedFoodItem {
  food: FoodItem
  primary: PreparedCandidate
  aliases: PreparedCandidate[]
  searchCompacts: string[]
  searchSpaces: string[]
}

interface VavDishRule {
  dish: string
  regex: RegExp
  replacement: string
}

interface UnitPattern {
  canonical: string
  tokens: string[]
  compact: string
}

interface PreparedCatalogIndex {
  items: PreparedFoodItem[]
  byId: Map<string, FoodItem>
  vavDishes: VavDishRule[]
  unitPatterns: UnitPattern[]
}

const FOOD_ITEM_CACHE = new WeakMap<FoodItem, PreparedFoodItem>()
const CATALOG_INDEX_CACHE = new WeakMap<FoodItem[], PreparedCatalogIndex>()

function prepareCandidate(text: string): PreparedCandidate {
  const space = toSpaceKey(text)
  const compact = space.replace(/[\s\u200C\-_]+/g, '')
  const tokens = space ? space.split(' ').filter((t) => t.length >= 2) : []
  return { space, compact, tokens }
}

function getPreparedFoodItem(food: FoodItem): PreparedFoodItem {
  const cached = FOOD_ITEM_CACHE.get(food)
  if (cached) return cached

  const safeAliases = Array.isArray(food.aliases) ? food.aliases : []
  const safeUnits = Array.isArray(food.units) ? food.units : []

  const primary = prepareCandidate(food.name)
  const aliases = safeAliases.map(prepareCandidate)
  const unitPrepared = safeUnits.map((u) => prepareCandidate(u.name))

  const searchCompacts = [
    primary.compact,
    ...aliases.map((a) => a.compact),
    ...unitPrepared.map((u) => u.compact),
  ].filter(Boolean)

  const searchSpaces = [
    primary.space,
    ...aliases.map((a) => a.space),
    ...unitPrepared.map((u) => u.space),
  ].filter(Boolean)

  const prepared: PreparedFoodItem = {
    food,
    primary,
    aliases,
    searchCompacts,
    searchSpaces,
  }
  FOOD_ITEM_CACHE.set(food, prepared)
  return prepared
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
    if (!Array.isArray(food.units)) continue
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

function getCatalogIndex(foods: FoodItem[]): PreparedCatalogIndex {
  const cached = CATALOG_INDEX_CACHE.get(foods)
  if (cached) return cached

  const items = foods.map(getPreparedFoodItem)
  const byId = new Map<string, FoodItem>()
  const rawVavSet = new Set<string>()

  for (const food of foods) {
    byId.set(food.id, food)
    const names = [food.name, ...(Array.isArray(food.aliases) ? food.aliases : [])]
    for (const n of names) {
      const normName = normalizePersian(n)
      if (normName.includes(' و ')) {
        rawVavSet.add(normName)
      }
    }
  }

  const vavDishes: VavDishRule[] = Array.from(rawVavSet)
    .sort((a, b) => b.length - a.length)
    .map((dish) => ({
      dish,
      regex: new RegExp(dish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      replacement: dish.replace(/ و /g, ` ${VAV_PLACEHOLDER} `),
    }))

  const unitPatterns = buildUnitPatterns(foods)

  const index: PreparedCatalogIndex = { items, byId, vavDishes, unitPatterns }
  CATALOG_INDEX_CACHE.set(foods, index)
  return index
}

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

/** Parses descending multi-word Persian integers such as "صد و بیست و پنج" (125) or "بیست و پنج" (25). */
function matchCompoundIntegerWords(tokens: string[]): { value: number; consumed: number } | null {
  if (tokens.length === 0) return null

  let idx = 0
  let total = 0

  if (tokens[idx] in HUNDREDS_WORDS) {
    total += HUNDREDS_WORDS[tokens[idx]]
    idx += 1

    if (idx + 1 < tokens.length && tokens[idx] === 'و') {
      const next = tokens[idx + 1]
      if (next in TENS_WORDS) {
        total += TENS_WORDS[next]
        idx += 2
        if (idx + 1 < tokens.length && tokens[idx] === 'و' && tokens[idx + 1] in ONES_WORDS) {
          total += ONES_WORDS[tokens[idx + 1]]
          idx += 2
        }
      } else if (next in TEENS_WORDS) {
        total += TEENS_WORDS[next]
        idx += 2
      } else if (next in ONES_WORDS) {
        total += ONES_WORDS[next]
        idx += 2
      }
    }
    return { value: total, consumed: idx }
  }

  if (tokens[0] in TENS_WORDS) {
    total += TENS_WORDS[tokens[0]]
    idx = 1
    if (tokens.length >= 3 && tokens[1] === 'و' && tokens[2] in ONES_WORDS) {
      total += ONES_WORDS[tokens[2]]
      idx = 3
    }
    return { value: total, consumed: idx }
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

  // 1. Check multi-word compound Persian integers ("صد و پنجاه", "بیست و پنج", "صد و بیست و پنج")
  const compoundInt = matchCompoundIntegerWords(tokens)
  if (compoundInt && compoundInt.consumed > 1) {
    let qty = compoundInt.value
    let consumed = compoundInt.consumed
    let impliedUnit: string | undefined

    if (
      consumed + 1 < tokens.length &&
      tokens[consumed] === 'و' &&
      (tokens[consumed + 1] === 'نیم' || tokens[consumed + 1] === 'نصف')
    ) {
      qty += 0.5
      consumed += 2
    }
    if (
      consumed < tokens.length &&
      (tokens[consumed] === 'تا' || tokens[consumed] === 'دونه' || tokens[consumed] === 'دانه')
    ) {
      consumed += 1
      impliedUnit = 'عدد'
    }
    return { quantity: qty, consumedTokens: consumed, impliedUnit }
  }

  // 2. Check "<num> و یک دوم / یک چهارم" (4 tokens)
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

  // 3. Check "<num> و نیم / نصف / ربع" (3 tokens)
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

  // 4. Check 2-token fractions ("یک دوم", "یک چهارم", "سه چهارم", etc.)
  if (tokens.length >= 2) {
    for (const frac of FRACTION_PHRASES) {
      if (tokens[0] === frac.tokens[0] && tokens[1] === frac.tokens[1]) {
        return { quantity: frac.value, consumedTokens: 2 }
      }
    }
  }

  // 5. Check colloquial "نصف یه ..." / "نصف یک ..." / "ربع یک ..."
  if (
    tokens.length >= 3 &&
    (tokens[0] === 'نصف' || tokens[0] === 'نصفه' || tokens[0] === 'نیم' || tokens[0] === 'ربع') &&
    (tokens[1] === 'یک' || tokens[1] === 'یه')
  ) {
    return {
      quantity: tokens[0] === 'ربع' ? 0.25 : 0.5,
      consumedTokens: 2,
    }
  }

  // 6. Check "<num> تا / دونه / دانه"
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

interface UnitMatch {
  canonical: string
  consumedTokens: number
}

function matchUnitAtStart(tokens: string[], patterns: UnitPattern[]): UnitMatch | null {
  if (tokens.length === 0) return null
  const normalizedTokens = tokens.map((t) => t.replace(/آ/g, 'ا'))

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

// Reusable flat typed-array rows for zero-GC Damerau-Levenshtein bounded to maxLen <= 64
const DL_CAP = 65
const dlRowPrev2 = new Uint16Array(DL_CAP)
const dlRowPrev1 = new Uint16Array(DL_CAP)
const dlRowCurr = new Uint16Array(DL_CAP)

/**
 * Bounded Optimal String Alignment (Damerau-Levenshtein) distance with
 * O(1) memory (zero heap allocations) and early exit when distance > maxDist.
 */
function boundedDamerauLevenshtein(a: string, b: string, maxDist = 2): number {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > maxDist) return maxDist + 1
  if (m === 0) return n
  if (n === 0) return m
  if (n >= DL_CAP) return maxDist + 1

  let prev2 = dlRowPrev2
  let prev1 = dlRowPrev1
  let curr = dlRowCurr

  for (let j = 0; j <= n; j++) prev1[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = curr[0]
    const aChar = a.charCodeAt(i - 1)

    for (let j = 1; j <= n; j++) {
      const bChar = b.charCodeAt(j - 1)
      const cost = aChar === bChar ? 0 : 1
      let best = Math.min(prev1[j] + 1, curr[j - 1] + 1, prev1[j - 1] + cost)
      if (
        i > 1 &&
        j > 1 &&
        aChar === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === bChar
      ) {
        best = Math.min(best, prev2[j - 2] + 1)
      }
      curr[j] = best
      if (best < rowMin) rowMin = best
    }

    if (rowMin > maxDist) return maxDist + 1

    const tmp = prev2
    prev2 = prev1
    prev1 = curr
    curr = tmp
  }

  return prev1[n]
}

function scorePreparedCandidate(
  qTokens: string[],
  queryCompact: string,
  cand: PreparedCandidate,
): number {
  const candCompact = cand.compact
  if (!queryCompact || !candCompact) return 0

  const qLen = queryCompact.length
  const cLen = candCompact.length

  if (queryCompact === candCompact) return 1.0

  if (qLen <= cLen) {
    if (qLen >= 2 && candCompact.startsWith(queryCompact)) {
      return 0.85 + (qLen / cLen) * 0.12
    }
    if (qLen >= 3 && candCompact.includes(queryCompact)) {
      return 0.78 + (qLen / cLen) * 0.14
    }
  } else {
    if (cLen >= 3 && queryCompact.startsWith(candCompact)) {
      return 0.8 + (cLen / qLen) * 0.12
    }
    if (cLen >= 3 && queryCompact.includes(candCompact)) {
      return 0.74 + (cLen / qLen) * 0.14
    }
  }

  const cTokens = cand.tokens
  if (qTokens.length > 0 && cTokens.length > 0) {
    let matched = 0
    for (let i = 0; i < qTokens.length; i++) {
      const qt = qTokens[i]
      for (let j = 0; j < cTokens.length; j++) {
        const ct = cTokens[j]
        if (ct === qt || ct.includes(qt) || qt.includes(ct)) {
          matched++
          break
        }
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

  const maxLen = Math.max(qLen, cLen)
  if (maxLen >= 4 && Math.abs(qLen - cLen) <= 2) {
    const dist = boundedDamerauLevenshtein(queryCompact, candCompact, 2)
    if (dist <= 2) {
      const similarity = 1 - dist / maxLen
      if (similarity >= 0.68) {
        return similarity * 0.9
      }
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

/** Finds the best matching FoodItem plus ambiguity/alternative suggestions using the cached index. */
export function matchFoodInDatabase(foodQuery: string, foods: FoodItem[]): FoodMatchResult | null {
  const cleaned = foodQuery
    .split(' ')
    .filter((token) => token && !FILLER_WORDS.has(token))
    .join(' ')
    .trim()

  const querySpace = toSpaceKey(cleaned || foodQuery)
  const queryCompact = querySpace.replace(/[\s\u200C\-_]+/g, '')
  if (!queryCompact || queryCompact.length < 2) return null

  const qTokens = querySpace.split(' ').filter((t) => t.length >= 2)
  const { items, byId } = getCatalogIndex(foods)
  const scored: Array<{ food: FoodItem; score: number }> = []

  for (let i = 0; i < items.length; i++) {
    const entry = items[i]
    let foodBest = scorePreparedCandidate(qTokens, queryCompact, entry.primary)
    if (foodBest < 1.0) {
      for (let j = 0; j < entry.aliases.length; j++) {
        const aliasScore = scorePreparedCandidate(qTokens, queryCompact, entry.aliases[j])
        const adjusted = aliasScore === 1.0 ? 0.995 : aliasScore * 0.99
        if (adjusted > foodBest) {
          foodBest = adjusted
          if (foodBest >= 0.995) break
        }
      }
    }
    if (foodBest >= 0.64) {
      scored.push({ food: entry.food, score: foodBest })
    }
  }

  if (scored.length === 0) return null
  scored.sort((a, b) => b.score - a.score)

  const top = scored[0]
  const confidence = Math.round(top.score * 100) / 100

  const genericIds = AMBIGUOUS_GENERIC_QUERIES[queryCompact]
  let alternatives: FoodItem[] = []
  let isAmbiguous = false

  if (genericIds) {
    alternatives = genericIds
      .filter((id) => id !== top.food.id)
      .map((id) => byId.get(id))
      .filter((f): f is FoodItem => Boolean(f))
      .slice(0, 3)
    if (alternatives.length > 0) {
      isAmbiguous = true
    }
  } else if (confidence < 0.86) {
    alternatives = scored
      .slice(1, 4)
      .filter((s) => s.score >= 0.68)
      .map((s) => s.food)
    isAmbiguous = true
  } else if (scored.length > 1 && top.score < 0.98 && top.score - scored[1].score <= 0.04) {
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

/** Fast Persian search using precomputed food search keys (O(1) per candidate). */
export function matchesFoodSearch(food: FoodItem, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true

  const qSpace = toSpaceKey(trimmed)
  const qCompact = qSpace.replace(/[\s\u200C\-_]+/g, '')
  if (!qCompact) return true

  const prepared = getPreparedFoodItem(food)
  for (let i = 0; i < prepared.searchCompacts.length; i++) {
    if (prepared.searchCompacts[i].includes(qCompact)) return true
  }
  for (let i = 0; i < prepared.searchSpaces.length; i++) {
    if (prepared.searchSpaces[i].includes(qSpace)) return true
  }
  return false
}
