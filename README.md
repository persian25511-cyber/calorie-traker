<div align="center">

# کالری‌شمار روزمره | KaloriShomar

**ردیاب سریع، آفلاین و هوشمند کالری و تغذیه برای غذاهای خانگی ایرانی**
*Fast, offline-first, mobile-first Persian Calorie & Nutrition Tracker built for Iranian home-cooked meals and real kitchen units.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpersian25511-cyber%2Fcalorie-traker&project-name=kalorishomar&repository-name=kalorishomar)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2Fpersian25511-cyber%2Fcalorie-traker)

[نسخه فارسی (Persian)](#-نسخه-فارسی) • [English Documentation](#-english-documentation)

</div>

---

<div dir="rtl">

## نسخه فارسی

### معرفی
**کالری‌شمار روزمره** یک وب‌اپلیکیشن سبک، مدرن و کاملاً **لوکال‌فرست (Offline-First PWA)** است که مخصوص سبک تغذیه ایرانی طراحی شده است. بدون نیاز به ثبت‌نام، سرور یا اینترنت، کافی است غذای خود را به فارسی روزمره بنویسید تا در کمتر از ۱۰ ثانیه کالری و درشت‌مغذی‌ها (پروتئین، کربوهیدرات، چربی) محاسبه و ثبت شوند.

> مثال ورودی:
> `دو کفگیر قورمه‌سبزی و یک کف دست سنگک و نصف لیوان دوغ`

### امکانات کلیدی
- **تحلیل‌گر هوشمند زبان طبیعی فارسی (آفلاین و قطعی):**
  - پشتیبانی از ارقام فارسی (`۰-۹`)، عربی (`٠-٩`)، انگلیسی (`0-9`)، کلمات عددی (`یک` تا `پانصد`، `یه`، `نصف`، `نیم`، `یک و نیم`، `دو و نیم`، `دوتا`) و کسرها (`1/2`).
  - پشتیبانی کامل از واحدهای واقعی آشپزخانه ایرانی: `کفگیر`، `قاشق غذاخوری`، `قاشق چای‌خوری`، `کف دست`، `برش`، `لیوان`، `فنجان`، `کاسه`، `پیاله`، `عدد`، `سیخ`، `تکه`، `برگ`، `پرس`، `مشت`، `حبه`، `ملاقه`، `اسکوپ`، `گرم` و هر واحد شخصی جدیدی که کاربر اضافه کند.
  - تشخیص هوشمند نیم‌فاصله و حروف عربی (`قورمهسبزی` / `قورمه‌سبزی` / `قورمه سبزی`، `ک`/`ك`، `ی`/`ي`) و تصحیح خطای تایپی با الگوریتم Damerau-Levenshtein.
  - پیش‌نمایش زنده به صورت چیپ‌های تعاملی با امکان تغییر مقدار (`+`/`-`)، **تغییر واحد روی چیپ** و حذف موردی پیش از ثبت.
- **بانک جامع ۷۲+ غذای ایرانی (کاملاً قابل ویرایش):**
  - شامل خورش‌ها، کباب‌ها، پلوها، نان‌های سنتی، صبحانه، لبنیات، میوه‌ها و نوشیدنی‌های رایج ایرانی.
  - امکان جستجوی فارسی، ویرایش کالری/وزن واحدها و افزودن غذای خانگی با واحد دلخواه.
- **داشبورد روزانه، آب روزانه و ویرایش سریع:**
  - حلقه پیشرفت کالری روزانه و نوارهای پروتئین، کربوهیدرات و چربی با فونت `Vazirmatn` و اعداد هم‌عرض (`tabular-nums`).
  - ردیاب **آب روزانه** (لیوان)، دکمه **کپی گزارش روزانه** برای ارسال به مربی/متخصص، **تکرار سریع** وعده‌های دیروز و امروز، ویرایش درون‌خطی وعده ثبت‌شده و دکمه **بازگردانی (Undo)** پس از حذف.
- **روند هفتگی و تقویم جلالی:**
  - نمودار میله‌ای ۷ روز اخیر (Recharts) با خط هدف روزانه، تداوم ثبت (Streak)، درصد درشت‌مغذی‌ها و امکان کلیک روی هر تاریخ جلالی برای مشاهده آن روز.
- **محاسبه‌گر هوشمند هدف کالری (TDEE) و پشتیبان‌گیری JSON:**
  - محاسبه‌گر علمی Mifflin-St Jeor برای تعیین دقیق کالری، درشت‌مغذی‌ها و آب روزانه.
  - پشتیبان‌گیری و بازیابی کامل داده‌ها با فایل `JSON` و قابلیت نصب روی صفحه اصلی موبایل (PWA کامل با Service Worker).

### اجرای محلی (Local Development)

```bash
# ۱. دریافت سورس پروژه
git clone https://github.com/persian25511-cyber/calorie-traker.git
cd calorie-traker

# ۲. نصب وابستگی‌ها
npm ci

# ۳. (اختیاری) ساخت فایل متغیرهای محیطی محلی
cp .env.example .env.local

# ۴. اجرای سرور توسعه
npm run dev
```

دستورات تست، لینت و بیلد تولید:

```bash
npm test          # اجرای تست‌های واحد Vitest
npm run lint      # بررسی کیفیت کد با oxlint
npm run build     # تایپ‌چک TypeScript و ساخت خروجی dist/
npm run preview   # پیش‌نمایش محلی بیلد تولید
```

### متغیرهای محیطی (`.env.example`)

تمامی متغیرهای سمت کلاینت در Vite باید با پیشوند `VITE_` تعریف شوند (در زمان بیلد داخل باندل تزریق می‌شوند):

| متغیر | پیش‌فرض | توضیح |
| --- | --- | --- |
| `VITE_APP_NAME` | `کالری‌شمار روزمره` | عنوان نمایشی برنامه |
| `VITE_SITE_URL` | *(خالی)* | دامنه عمومی برنامه (اختیاری) |
| `VITE_DEFAULT_DAILY_KCAL` | `2000` | هدف پیش‌فرض کالری روزانه برای کاربران جدید |
| `VITE_DEFAULT_WATER_GOAL_GLASSES` | `8` | هدف پیش‌فرض مصرف آب روزانه (لیوان) |
| `VITE_ENABLE_PWA` | `true` | فعال‌سازی Service Worker برای حالت آفلاین (`true` / `false`) |
| `VITE_REPO_URL` | لینک مخزن گیت‌هاب | آدرس مخزن پروژه |

---

### آموزش دپلوی روی Vercel (طبق مستندات رسمی)

فایل [`vercel.json`](./vercel.json) از پیش با تنظیمات رسمی Vite SPA، ریدایرکت روتینگ (`rewrites` به `/index.html`)، هدرهای امنیتی و قوانین کش PWA (کش بلندمدت برای `/assets/*` و بدون کش برای `/sw.js`) آماده شده است.

#### روش ۱: از طریق داشبورد Vercel (پیشنهادی)
1. وارد [vercel.com/new](https://vercel.com/new) شوید و مخزن GitHub را انتخاب کنید.
2. Vercel به‌صورت خودکار فریم‌ورک **Vite**، دستور بیلد (`npm run build`) و پوشه خروجی (`dist`) را از `vercel.json` تشخیص می‌دهد.
3. در بخش **Environment Variables** در صورت نیاز متغیرهای `.env.example` (با پیشوند `VITE_`) را اضافه کنید.
4. روی **Deploy** کلیک کنید؛ پس از چند ثانیه لینک HTTPS آماده است.

#### روش ۲: از طریق Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

---

### آموزش دپلوی روی Railway (طبق مستندات رسمی)

مطابق راهنمای رسمی React/Vite در Railway، پروژه شامل فایل‌های زیر است:
- [`Dockerfile`](./Dockerfile): بیلد چندمرحله‌ای (`Node 22 Alpine` ← `Caddy 2 Alpine`) با پشتیبانی کامل از `ARG VITE_*`.
- [`Caddyfile`](./Caddyfile): سرو فایل‌های استاتیک `dist/` با فشرده‌سازی `zstd`/`gzip`، پشتیبانی از `$PORT`، هدرهای امنیتی و PWA، روتینگ SPA (`try_files`) و مسیر سلامت `/health`.
- [`railway.json`](./railway.json): تنظیم بیلدر `DOCKERFILE` و Zero-Downtime Healthcheck روی `/health`.

#### روش ۱: از طریق داشبورد Railway (اتصال به GitHub)
1. وارد [railway.com](https://railway.com) شوید ← **New Project** ← **Deploy from GitHub repo**.
2. مخزن پروژه را انتخاب کنید. Railway به‌صورت خودکار `railway.json` و `Dockerfile` را شناسایی و بیلد می‌کند.
3. در تب **Variables** در صورت نیاز متغیرهای `VITE_*` را از `.env.example` اضافه کنید (در صورت تغییر متغیرها یک بار Redeploy بزنید تا در بیلد جدید اعمال شوند).
4. پس از اتمام بیلد، وارد **Settings ← Networking** شوید و روی **Generate Domain** کلیک کنید تا دامنه عمومی (`*.up.railway.app`) فعال شود.
5. برای اطمینان از سلامت سرویس می‌توانید مسیر `https://<your-domain>/health` را باز کنید (خروجی `{"status":"ok","service":"kalorishomar"}`).

#### روش ۲: از طریق Railway CLI
```bash
npm i -g @railway/cli
railway login
railway init
railway up
railway domain
```

#### تست محلی Docker قبل از دپلوی روی Railway
```bash
docker build -t kalorishomar .
docker run -p 3000:3000 -e PORT=3000 kalorishomar
# بررسی صفحه اصلی: http://localhost:3000
# بررسی مسیر سلامت: http://localhost:3000/health
```

</div>

---

## English Documentation

### Overview
**KaloriShomar (کالری‌شمار روزمره)** is a fast, lightweight, 100% local-first Persian Calorie & Nutrition Tracker PWA built specifically for Iranian home-cooked dishes and real household kitchen measurements (`کفگیر`, `کف دست`, `لیوان`, `سیخ`, `کاسه`, `ملاقه`, etc.).

Example natural Persian input parsed instantly offline:
```text
دو کفگیر قورمه‌سبزی و یک کف دست سنگک و نصف لیوان دوغ
```

### Key Features
- **Deterministic Offline Persian NLP Parser (`src/utils/persianFoodParser.ts`):**
  - Parses Persian (`۰-۹`), Arabic-Indic (`٠-٩`), and English (`0-9`) numerals, Persian number words (`یک`–`پانصد`, `یه`, `نصف`, `نیم`, `یک و نیم`, `دو و نیم`, `دوتا`), fractions (`1/2`), and multi-item delimiters (`و`, `+`, `,`, `،`, newlines) while preserving compound numbers and dish names containing `و`.
  - Normalizes ZWNJ/space variations (`قورمهسبزی` / `قورمه سبزی` / `قورمه‌سبزی`), Arabic/Persian characters (`ك`/`ک`, `ي`/`ی`), and handles typos via Damerau-Levenshtein matching.
  - Dynamically recognizes any custom household unit added by the user.
- **72+ Pre-Seeded Editable Iranian Foods (`src/data/iranianFoods.ts`):**
  - Stews, kebabs, rice dishes, traditional breads, dairy, fruits, drinks, and snacks with realistic per-100g macros and household unit weights.
  - Full CRUD food manager with per-unit or per-100g macro entry and automatic catalog migration on app updates.
- **Under-10-Second Daily UX:**
  - Top-of-screen quick entry with live preview chips (`+`/`-`, inline unit switcher, remove), daily calorie ring, Protein/Carbs/Fat bars, daily water glass tracker, inline meal editing, Undo delete toast, 1-tap meal repeat, and clipboard daily summary export.
- **Jalali Calendar & Weekly Analytics:**
  - Code-split Recharts 7-day bar chart against the daily calorie goal line, logging streak KPI, macro ratio breakdown, and clickable Jalali date navigation.
- **Mifflin-St Jeor TDEE Calculator, Backup & True Offline PWA:**
  - Interactive Persian TDEE/macro/water calculator in Settings, versioned JSON Export/Import backup, React `ErrorBoundary` with emergency backup, and offline Service Worker (`public/sw.js`) + install prompt (`beforeinstallprompt`).

### Tech Stack & Structure

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS v4 (strict RTL `dir="rtl"`, dark-only theme, `Vazirmatn` font) |
| Charts & Icons | Recharts (lazy-loaded), Lucide React |
| Testing & Lint | Vitest (21 unit tests), oxlint |
| Persistence & PWA | `localStorage` + JSON Backup + Service Worker (`public/sw.js`) |
| Hosting Ready | Vercel (`vercel.json`) & Railway (`Dockerfile` + `Caddyfile` + `railway.json`) |

```text
├── public/
│   ├── icon.svg                  # Maskable PWA vector icon
│   ├── manifest.webmanifest      # RTL Persian PWA manifest
│   ├── robots.txt                # Search crawler configuration
│   └── sw.js                     # Offline-first PWA Service Worker
├── src/
│   ├── components/               # QuickEntryBar, DailySummaryCard, TodayMealsList,
│   │                             # WeeklyTrendsTab, FoodDatabaseTab, SettingsTab, ErrorBoundary
│   ├── config/env.ts             # Typed VITE_* runtime environment config
│   ├── data/iranianFoods.ts      # 72+ pre-seeded Iranian dishes & household units
│   ├── hooks/useNutritionStore.ts# localStorage persistence, water, catalog merge, JSON backup
│   ├── types/nutrition.ts        # Shared TypeScript interfaces
│   └── utils/                    # Persian NLP parser, Jalali formatter, TDEE calculator, PWA hook
├── .env.example                  # Documented environment variable template
├── vercel.json                   # Official Vercel Vite SPA + security/PWA headers config
├── Dockerfile                    # Multi-stage Node 22 + Caddy 2 Railway container
├── Caddyfile                     # Railway static SPA server with /health & compression
├── railway.json                  # Official Railway Config-as-Code with healthcheck
└── .github/workflows/ci.yml      # GitHub Actions CI (lint, test, build)
```

### Local Development & Testing

```bash
git clone https://github.com/persian25511-cyber/calorie-traker.git
cd calorie-traker
npm ci
cp .env.example .env.local   # optional local overrides
npm run dev                  # start dev server on http://localhost:5173
```

Quality checks:

```bash
npm run lint     # oxlint static analysis
npm test         # Vitest unit tests (parser, TDEE calculator, Jalali format, store helpers)
npm run build    # TypeScript typecheck + production bundle into dist/
```

### Environment Variables (`.env.example`)

All client-side variables in Vite require the `VITE_` prefix and are injected at build time:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_APP_NAME` | `کالری‌شمار روزمره` | App header & report title |
| `VITE_SITE_URL` | `""` | Optional public deployment URL |
| `VITE_DEFAULT_DAILY_KCAL` | `2000` | Initial calorie target for new users |
| `VITE_DEFAULT_WATER_GOAL_GLASSES` | `8` | Initial daily water glass target |
| `VITE_ENABLE_PWA` | `true` | Enable offline Service Worker (`true` / `false`) |
| `VITE_REPO_URL` | GitHub repo URL | Optional repository/support link |

---

### Deploying to Vercel

[`vercel.json`](./vercel.json) is preconfigured per Vercel's official Vite SPA docs with SPA fallback rewrites, security headers, immutable caching for Vite's hashed `/assets/*`, and strict revalidation for `/sw.js` and `/manifest.webmanifest`.

**Via Vercel Dashboard:**
1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository.
2. Vercel auto-detects `framework: "vite"`, `buildCommand: "npm run build"`, and `outputDirectory: "dist"` from `vercel.json`.
3. Optionally configure `VITE_*` variables from `.env.example` in **Settings → Environment Variables**.
4. Click **Deploy**.

**Via Vercel CLI:**
```bash
npm i -g vercel
vercel login
vercel --prod
```

---

### Deploying to Railway

Per Railway's official React/Vite deployment guide, this repository includes:
- [`Dockerfile`](./Dockerfile): Multi-stage `node:22-alpine` build → `caddy:2-alpine` static server with `ARG VITE_*` build-arg forwarding.
- [`Caddyfile`](./Caddyfile): Binds to `:{$PORT:3000}`, exposes `GET /health` (`200 OK` JSON for `healthcheck.railway.app`), enables `zstd`/`gzip`, adds security & PWA cache headers, and handles SPA `try_files {path} /index.html`.
- [`railway.json`](./railway.json): Configures `DOCKERFILE` builder, `/health` zero-downtime healthcheck, and `ON_FAILURE` restart policy.

**Via Railway Dashboard:**
1. Open [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**.
2. Select this repository; Railway automatically detects `railway.json` and `Dockerfile`.
3. Optionally add any `VITE_*` variables from `.env.example` under the **Variables** tab (redeploy if you change build-time `VITE_*` values).
4. Open **Settings → Networking** and click **Generate Domain** to expose a public HTTPS URL (`*.up.railway.app`).
5. Verify zero-downtime healthcheck at `https://<your-domain>/health`.

**Via Railway CLI:**
```bash
npm i -g @railway/cli
railway login
railway init
railway up
railway domain
```

**Verify Container Locally:**
```bash
docker build -t kalorishomar .
docker run -p 3000:3000 -e PORT=3000 kalorishomar
curl http://localhost:3000/health
```
