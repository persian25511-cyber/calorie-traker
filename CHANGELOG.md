# Changelog

All notable changes to **KaloriShomar (کالری‌شمار روزمره)** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-11-24

### Added
- **Zero-Dependency Native SVG Charts & Bundle Budget Gate (#1 & #9):** Replaced `recharts` (removing 39 npm packages) with custom RTL-native SVG `CalorieBarChart` and `WeightLineChart` (`src/components/charts/NativeCharts.tsx`), and enforced strict gzipped bundle budgets via `scripts/check-bundle-budget.mjs` in GitHub Actions CI.
- **Bidirectional `IndexedDB` Startup Recovery (#2):** Added `idbGetMany` batch transaction reader (`src/storage/idbAdapter.ts`) and automatic startup recovery + backfill in `useNutritionStore` if `localStorage` keys are evicted.
- **Live Inline Autocomplete in QuickEntryBar (#3):** Added real-time trailing-segment Persian food suggestions (`getInlineFoodAutocomplete`) with `Tab` key and 1-tap completion while preserving typed quantities, units, and earlier meal segments.
- **Iranian Cooking Preparation Modifiers in Parser (#4):** Added `extractCookingModifier` & `applyCookingModifierToPer100g` (`کم‌روغن`, `بدون روغن`, `رژیمی`, `ایرفرایر`, `بخارپز`, `پرچرب`, `با کره`) with transparent fat/kcal adjustment and UI badges while preserving 100% compatibility on built-in catalog items.
- **Persian Voice Input (`fa-IR`) & Iranian `626` Barcode Scanner (#5):** Added `VoiceAndBarcodeControls` supporting Web Speech API dictation, `BarcodeDetector` camera scanning, manual `626` EAN-13 lookup across popular Iranian packaged items, and 1-click custom barcode product creation.
- **Editable Multi-Ingredient Recipes with Cooking Weight Yield (#6):** Persisted `recipeIngredients` and `cookingYieldPct` (`ضریب پخت ٪`) on custom recipes so users can re-open and edit ingredients and water evaporation/absorption yield at any time.
- **Visual Jalali (Shamsi) Monthly Calendar & Arbitrary Past-Day Meal Copy (#7):** Added accessible `JalaliCalendarPopover` (`src/utils/jalaliCalendar.ts`) with emerald logged-day dots and expanded meal copying to select from any past logged day.
- **Dietary Fiber Tracking & Ramadan / Fasting Schedule Mode (#8):** Added `fiber` across all 322 foods (with curated values for breads, legumes, stews, nuts, fruits, and vegetables), daily fiber goal & progress bar, per-meal calorie budget hints, and `سحری / افطاری / شام` schedule mode.
- **Password-Encrypted Backups (`AES-256-GCM`) & Opt-in Local Reminders (#10):** Added Web Crypto `PBKDF2-SHA256` (100k iterations) + `AES-256-GCM` backup encryption/decryption (`src/utils/cryptoBackup.ts`) and opt-in local evening meal & daytime hydration reminders (`src/utils/localReminders.ts`).

## [1.1.0] - 2026-11-24

### Added
- **Phase 0 — Release Blockers Resolved:**
  - **User-Layer Food Catalog (`Schema v3` + `CATALOG_VERSION = 2026.11.2`):** Persist only user-created `customFoods` and explicit `foodOverrides` in `localStorage`, loading built-in foods directly from code so calorie refinements reach existing users and non-destructive catalog sync never wipes user edits.
  - **67 Reference-Validated High-Consumption Foods:** Added `source` and `verified` fields to every `FoodItem`, cross-checked 67 staple foods against USDA SR Legacy (`NDB #`) and the Iranian Food Composition Table (NNFTRI), and documented them in `docs/FOOD_DATA_VALIDATION.md` while keeping «برآورد تقریبی» wording.
  - **Safe Backup Preview, Merge/Replace & Auto Pre-Import Snapshot:** Added `analyzeBackupJson` preview (meal count, Jalali date range, custom foods/overrides, weights/water presence), `merge` vs. `replace` import selector (clearing stale water/weight data on `replace` when absent in legacy backups), and automatic pre-import rollback snapshot.
  - **Complete Sanitization & `ErrorBoundary` Safe Mode:** Added sanitizers for `weights`, `templates`, `waterByDate`, and `foodOverrides` on hydration, cross-tab sync, and import, plus crash-proof raw `localStorage` dump + 2-step reset in `ErrorBoundary`.
  - **iOS Add-to-Home-Screen Guide & IndexedDB Adapter:** Added `detectIosDevice` + step-by-step Safari A2HS instructions, tiered gentle/urgent backup reminders showing exact unbacked entry counts, and `src/storage/idbAdapter.ts` + `docs/STORAGE_ROADMAP.md`.
  - **Strict Build-Time `VITE_SITE_URL`, Canonical & Sitemap:** Enforced `VITE_SITE_URL` at build time (fails fast if unset) to inject absolute `canonical`, `og:url`, `og:image`, and `twitter:image` tags and generate `dist/sitemap.xml` and `dist/robots.txt`.
  - **Health Safety & Feedback Channels:** Added soft health warning for manual goals below `1,200 kcal`, supportive non-pressuring Streak & Weight copy, `persian25511-cyber` MIT license attribution, and prefilled GitHub Issue templates (`.github/ISSUE_TEMPLATE/*`) for missing/wrong foods and feedback.
- **Phase 1 — Pre-Launch Quality & Modular Architecture:**
  - Fixed `updateEntry` rounding drift via `recomputeUpdatedEntry` (`per100g × grams` always).
  - Split `persianFoodParser.ts` into `src/utils/parser/*` and `FoodDatabaseTab.tsx` into `src/components/foodDatabase/*`.
  - Added 3-step guided `OnboardingCard`, enforced v8 coverage thresholds in `vite.config.ts`, and removed `continue-on-error` from Lighthouse CI in `.github/workflows/ci.yml`.
- **Phase 2 — Privacy-First Local Beta Instrumentation:**
  - Added `src/utils/localMetrics.ts` to compute local-only parser unmatched rate, PII-scrubbed unmatched phrases, active days, and anonymous user-exportable Markdown reports (`docs/A11Y_AND_DEPLOY_CHECKLIST.md`).
- **Phase 3 — Growth, Sharing & Store Packaging:**
  - Added Recent & Frequent food 1-tap chips in `QuickEntryBar`, instant History Search and 7-day Weekly Report in `WeeklyTrendsTab`, client-side `1080×1080` Canvas PNG export for Daily & Weekly summary cards, and TWA (`assetlinks.json`) + Capacitor (`capacitor.config.json`) templates for Cafe Bazaar & Myket (`docs/STORE_PACKAGING_BAZAAR_MYKET.md`).

## [1.0.0] - 2026-11-22

### Added
- **Self-hosted Vazirmatn Variable Font (`@fontsource-variable/vazirmatn`):** Eliminated Google Fonts external dependency for 100% offline reliability and zero blocking risk inside Iran.
- **315+ Iranian & Everyday Food Database:** Expanded across stews, regional Iranian specialties, kebabs, rice/breads, fast foods, dairy, traditional sweets, nuts/dried fruits, seasonal produce, Persian drinks, and packaged supermarket staples, with transparent source attribution (Iranian Food Composition Table & USDA) and approximate labeling.
- **Parser Disambiguation & 200+ Golden Test Corpus:** Added ambiguity and low-confidence match detection with 1-tap alternative food swapping on chips, smart food-name extraction for 1-click custom food creation, and a 210+ sentence golden parser test suite.
- **Health Safety & Legal Compliance:** Enforced strict **18+ age gate** in the Mifflin-St Jeor TDEE calculator, added prominent Persian health disclaimers, added an on-device Privacy & Sources section, and published under the **MIT License**.
- **Data Safety & Multi-Tab Reliability:** Added schema versioning (`v2`) with safe `v1 → v2` migration, visible quota/storage error alerts with instant emergency JSON backup, `navigator.storage.persist()` durable storage requests, weekly backup reminders, and real-time cross-tab synchronization via the `storage` event.
- **PWA Assets & Safe Service Worker Updates:** Generated crisp PNG icons (`192×192`, `512×512`, separate `maskable` 512px, `180×180` iOS `apple-touch-icon`) and `1200×630` Open Graph preview image (`og-image.png`).
- **CI/CD & Hosting Configs:** Added `vercel.json`, Cloudflare Pages `_headers`/`_redirects`, Railway `Dockerfile`/`Caddyfile`/`railway.json`, `lighthouserc.json`, Dependabot, and GitHub Actions CI.
