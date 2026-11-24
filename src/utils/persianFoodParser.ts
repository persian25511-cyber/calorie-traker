export {
  matchFoodInDatabase,
  matchesFoodSearch,
  type FoodMatchResult,
} from './parser/catalogIndex'
export { normalizePersian, toCompactKey, toSpaceKey } from './parser/normalize'
export {
  calculateFoodMacros,
  extractCleanFoodName,
  parsePersianFoodInput,
  resolveFoodUnit,
  splitMealSegments,
} from './parser/parseEngine'
