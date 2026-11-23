# Changelog

All notable changes to **KaloriShomar (کالری‌شمار روزمره)** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-22

### Added
- **Self-hosted Vazirmatn Variable Font (`@fontsource-variable/vazirmatn`):** Eliminated Google Fonts external dependency for 100% offline reliability and zero blocking risk inside Iran.
- **315+ Iranian & Everyday Food Database:** Expanded across stews, regional Iranian specialties, kebabs, rice/breads, fast foods, dairy, traditional sweets, nuts/dried fruits, seasonal produce, Persian drinks, and packaged supermarket staples, with transparent source attribution (Iranian Food Composition Table & USDA) and approximate labeling.
- **Parser Disambiguation & 200+ Golden Test Corpus:** Added ambiguity and low-confidence match detection (e.g., «برنج», «ماست», «پنیر», «کباب») with 1-tap alternative food swapping on chips, smart food-name extraction for 1-click custom food creation, and a 210-sentence golden parser test suite.
- **Health Safety & Legal Compliance:** Enforced strict **18+ age gate** in the Mifflin-St Jeor TDEE calculator, added prominent Persian health disclaimers (educational tool only; explicit warnings for pregnancy, breastfeeding, minors, and eating disorders), added an on-device Privacy & Sources section, and published under the **MIT License**.
- **Data Safety & Multi-Tab Reliability:** Added schema versioning (`v2`) with safe `v1 → v2` migration, visible quota/storage error alerts with instant emergency JSON backup, `navigator.storage.persist()` durable storage requests, weekly backup reminders, and real-time cross-tab synchronization via the `storage` event.
- **PWA Assets & Safe Service Worker Updates:** Generated crisp PNG icons (`192×192`, `512×512`, separate `maskable` 512px, `180×180` iOS `apple-touch-icon`) and `1200×630` Open Graph preview image (`og-image.png`). Fixed Service Worker update flow to avoid mid-typing reloads and added bounded runtime cache pruning (`MAX_RUNTIME_ENTRIES = 80`).
- **Everyday Retention Features:** Inline unit editing on logged meals, favorite meal templates (`وعده‌های منتخب`), multi-ingredient recipe builder (`دستور پخت ترکیبی`), 30-day monthly trend view, weight tracking & progress line chart, UTF-8 BOM Excel CSV export, and optional Light/Dark theme switch.
- **Accessibility & Security Hardening:** Added WCAG focus trap & Escape handling for modals, `prefers-reduced-motion` support, visible focus rings, strict self-only CSP + HSTS headers across Vercel, Cloudflare Pages, and Caddy, and non-root Docker runtime (`appuser` UID 1001).
- **CI/CD & Hosting Configs:** Renamed package to `calorie-tracker@1.0.0`, added `vercel.json`, Cloudflare Pages `_headers`/`_redirects`, Railway `Dockerfile`/`Caddyfile`/`railway.json`, `lighthouserc.json`, Dependabot, and GitHub Actions CI with `npm audit`, coverage, and offline E2E verification.
