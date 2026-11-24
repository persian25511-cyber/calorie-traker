/**
 * Authoritative validation registry for 67 high-consumption Iranian & everyday foods
 * cross-checked against:
 * 1. USDA FoodData Central (SR Legacy NDB & Foundation Foods)
 * 2. Iranian Food Composition Table (جدول ترکیبات مواد غذایی ایران — انستیتو تحقیقات تغذیه‌ای و صنایع غذایی کشور / NNFTRI)
 * 3. ISIRI national dairy/bread standards (سازمان ملی استاندارد ایران)
 *
 * Note: Home-cooked composite dishes naturally vary by oil/meat ratios; therefore UI
 * labels keep the honest «برآورد تقریبی» notice even on reference-verified items.
 */
export const DEFAULT_APPROXIMATE_SOURCE =
  'برآورد تقریبی خانگی بر پایه میانگین ترکیبات مواد غذایی ایران و USDA'

export const VERIFIED_FOOD_SOURCES: Readonly<Record<string, string>> = {
  // Traditional & Everyday Breads (NNFTRI & USDA SR Legacy)
  'nan-sangak': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان سنگک)',
  'nan-barbari': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان بربری)',
  'nan-lavash': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان لواش)',
  'nan-taftoon': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — نان تافتون)',
  'nan-baguette': 'USDA SR Legacy NDB #18029 (French/Baguette Bread)',
  'nan-toast': 'USDA SR Legacy NDB #18069 (White Bread)',
  'nan-toast-whole': 'USDA SR Legacy NDB #18075 (Whole-Wheat Bread)',

  // Rice, Grains, Potatoes & Pasta
  'berenj-abkesh': 'USDA SR Legacy NDB #20045 + چلو آبکش کم‌روغن ایرانی',
  'berenj-kateh': 'جدول ترکیبات مواد غذایی ایران (انستیتو تغذیه — کته خانگی)',
  'berenj-ghahvei': 'USDA SR Legacy NDB #20037 (Cooked Brown Rice)',
  'quinoa-cooked': 'USDA SR Legacy NDB #20137 (Cooked Quinoa)',
  'boiled-potato': 'USDA SR Legacy NDB #11367 (Boiled Potato)',
  'sweet-potato': 'USDA SR Legacy NDB #11508 (Baked Sweet Potato)',
  'french-fries': 'USDA SR Legacy NDB #11403 (French Fries)',
  macaroni: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — ماکارونی با مایه گوشت)',
  'pasta-whole-wheat': 'USDA SR Legacy NDB #20125 (Cooked Whole-Wheat Pasta)',

  // Core Iranian Stews, Mixed Rice, Ashes & Legumes
  'ghormeh-sabzi': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — خورش قورمه‌سبزی)',
  gheymeh: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — خورش قیمه)',
  fesenjan: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — خورش فسنجان)',
  'zereshk-polo-morgh': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — زرشک‌پلو با مرغ)',
  'adas-polo': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — عدس‌پلو)',
  'loobia-polo': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — لوبیاپلو)',
  'ash-reshteh': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — آش رشته)',
  abgoosht: 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — آبگوشت سنتی)',
  adasi: 'USDA SR Legacy NDB #16070 (Cooked Lentils) + دستور عدسی ایرانی',
  'khorak-loobia': 'USDA SR Legacy NDB #16043 (Cooked Pinto Beans) + خوراک لوبیا چیتی',

  // Meats, Poultry, Kebabs & Seafood
  'joojeh-kabab': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — جوجه‌کباب بی‌استخوان)',
  'kabab-koobideh': 'جدول ترکیبات غذاهای پخته ایرانی (انستیتو تغذیه — کباب کوبیده)',
  'grilled-chicken-breast': 'USDA SR Legacy NDB #05064 (Roasted Chicken Breast, Meat Only)',
  'chicken-thigh-cooked': 'USDA SR Legacy NDB #05094 (Roasted Chicken Thigh, Meat Only)',
  'beef-steak': 'USDA SR Legacy NDB #23568 (Cooked Lean Beef Sirloin/Round)',
  'lamb-cooked': 'USDA SR Legacy NDB #17012 (Cooked Lamb)',
  'salmon-grilled': 'USDA SR Legacy NDB #15237 (Cooked Atlantic Salmon)',
  'tuna-in-water': 'USDA SR Legacy NDB #15121 (Light Tuna Canned in Water, Drained)',
  'tuna-in-oil': 'USDA SR Legacy NDB #15119 (Light Tuna Canned in Oil, Drained)',

  // Eggs & Dairy
  'boiled-egg': 'USDA SR Legacy NDB #01129 (Hard-Boiled Egg)',
  'egg-white': 'USDA SR Legacy NDB #01124 (Cooked Egg White)',
  nimroo: 'USDA SR Legacy NDB #01128 (Fried Egg)',
  'white-cheese': 'USDA SR Legacy NDB #01019 / استاندارد ملی پنیر سفید ایرانی',
  yogurt: 'USDA SR Legacy NDB #01116 (Plain Whole-Milk Yogurt)',
  'greek-yogurt': 'USDA SR Legacy NDB #01287 (Lowfat Greek Yogurt)',
  milk: 'USDA SR Legacy NDB #01079 (Reduced-Fat Milk 2%)',
  'milk-fullfat': 'USDA SR Legacy NDB #01077 (Whole Milk 3.25%)',
  doogh: 'جدول ترکیبات مواد غذایی ایران / استاندارد ملی دوغ سنتی',
  butter: 'USDA SR Legacy NDB #01001 (Salted/Unsalted Butter)',

  // Oils, Sweeteners, Breakfast Staples & Seeds/Nuts
  'olive-oil': 'USDA SR Legacy NDB #04053 (Olive Oil)',
  honey: 'USDA SR Legacy NDB #19296 (Natural Honey)',
  'sugar-granulated': 'USDA SR Legacy NDB #19335 (Granulated Sugar)',
  'oats-dry': 'USDA SR Legacy NDB #08120 (Rolled Oats)',
  tahini: 'USDA SR Legacy NDB #12166 (Sesame Tahini)',
  'peanut-butter': 'USDA SR Legacy NDB #16098 (Smooth Peanut Butter)',
  walnut: 'USDA SR Legacy NDB #12155 (English Walnuts)',
  almond: 'USDA SR Legacy NDB #12061 (Whole Almonds)',
  pistachio: 'USDA SR Legacy NDB #12151 (Pistachio Nuts)',
  peanut: 'USDA SR Legacy NDB #16087 (Peanuts)',
  dates: 'USDA SR Legacy NDB #09087 (Dates)',
  raisins: 'USDA SR Legacy NDB #09298 (Seedless Raisins)',
  'chia-seeds': 'USDA SR Legacy NDB #12006 (Dried Chia Seeds)',

  // Everyday Fruits & Vegetables
  apple: 'USDA SR Legacy NDB #09003 (Raw Apple with Skin)',
  banana: 'USDA SR Legacy NDB #09040 (Raw Banana)',
  orange: 'USDA SR Legacy NDB #09200 (Raw Navel Orange)',
  pomegranate: 'USDA SR Legacy NDB #09286 (Raw Pomegranate Arils)',
  watermelon: 'USDA SR Legacy NDB #09326 (Raw Watermelon)',
  avocado: 'USDA SR Legacy NDB #09037 (Raw Avocado)',
  cucumber: 'USDA SR Legacy NDB #11205 (Raw Cucumber with Peel)',
  tomato: 'USDA SR Legacy NDB #11529 (Raw Red Tomato)',
  carrot: 'USDA SR Legacy NDB #11124 (Raw Carrot)',
}
