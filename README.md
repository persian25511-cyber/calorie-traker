<div align="center">

# کالری‌شمار روزمره | KaloriShomar `v1.0.0`

**ردیاب سریع، کاملاً آفلاین و هوشمند کالری، درشت‌مغذی، آب و وزن برای غذاهای خانگی ایرانی**
*Fast, 100% offline-first, mobile-first Persian Calorie & Nutrition Tracker built for Iranian home-cooked meals and real kitchen units.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpersian25511-cyber%2Fcalorie-traker&project-name=calorie-tracker&repository-name=calorie-tracker)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2Fpersian25511-cyber%2Fcalorie-traker)

[نسخه فارسی (Persian)](#-نسخه-فارسی) • [English Documentation](#-english-documentation) • [Changelog](./CHANGELOG.md) • [MIT License](./LICENSE)

</div>

---

<div dir="rtl">

## نسخه فارسی

### معرفی
**کالری‌شمار روزمره** یک وب‌اپلیکیشن سبک، متن‌باز (MIT) و **۱۰۰٪ آفلاین (Offline-First PWA)** ویژه فرهنگ غذایی ایران است. فونت فارسی (`Vazirmatn Variable`) به‌صورت محلی میزبانی می‌شود (بدون وابستگی به Google Fonts و بدون ریسک کندی/فیلتر) و تمام داده‌ها صرفاً روی دستگاه خود کاربر ذخیره می‌شوند.

> **سلب مسئولیت سلامت:** این برنامه صرفاً یک ابزار آموزشی برای برآورد تقریبی کالری و درشت‌مغذی‌هاست و جایگزین پزشک یا متخصص تغذیه نیست. محاسبه‌گر کالری (TDEE) فقط برای بزرگسالان ۱۸+ فعال است و در شرایط بارداری، شیردهی، سن زیر ۱۸ سال یا سابقه اختلالات خوردن باید حتماً با متخصص مشورت شود.

### امکانات کلیدی (`v1.0.0`)
- **تحلیل‌گر زبان طبیعی فارسی (آفلاین و قطعی) + تست طلایی ۲۱۵ جمله‌ای:**
  - پشتیبانی از ارقام فارسی/عربی/انگلیسی، کلمات عددی (`یک` تا `پانصد`، `یه`، `نصف`، `نیم`، `یک و نیم`، `دو و نیم`) و کسرها (`1/2`).
  - تشخیص ابهام برای عبارات کلی مثل «برنج»، «ماست»، «پنیر» و «کباب» همراه با دکمه جایگزینی تک‌کلیکی روی چیپ پیش‌نمایش.
  - پشتیبانی از واحدهای واقعی آشپزخانه ایرانی (`کفگیر`، `کف دست`، `قاشق`، `لیوان`، `کاسه`، `پیاله`، `سیخ`، `اسکوپ`، `قوطی`، `ملاقه`، `گرم` و هر واحد شخصی جدید) + تغییر واحد مستقیم روی چیپ.
  - افزودن تک‌کلیکی غذاهای تشخیص‌داده‌نشده به بانک غذا با حذف خودکار عدد و واحد.
- **بانک جامع ۳۱۵+ غذای ایرانی (قابل ویرایش + دستور پخت ترکیبی):**
  - شامل خورش‌ها و غذاهای محلی ایرانی (باقالی‌قاتق، اناربیج، قلیه ماهی، قیمه نثار، کلم‌پلو، کوفته تبریزی...)، کباب‌ها، نان‌های سنتی، فست‌فود، لبنیات، آجیل، شیرینی‌های سنتی، میوه‌ها، شربت‌ها و اقلام بسته‌بندی بازار ایران.
  - **منابع علمی (ارزش‌های تقریبی):** جدول ترکیبات مواد غذایی ایران (انستیتو تحقیقات تغذیه‌ای کشور)، پایگاه USDA FoodData Central و برچسب محصولات رایج.
  - امکان ساخت **دستور پخت ترکیبی** از چند ماده اولیه و محاسبه خودکار کالری هر پرس.
- **تجربه کاربری کامل روزمره:**
  - داشبورد روزانه (حلقه کالری، پروتئین، کربوهیدرات، چربی، **ردیاب آب روزانه**، **کپی گزارش روزانه**).
  - ویرایش درون‌خطی مقدار، **تغییر واحد** و جابه‌جایی وعده ثبت‌شده + دکمه **بازگردانی (Undo)** پس از حذف.
  - ذخیره و ثبت تک‌کلیکی **وعده‌های منتخب (Favorites)** + تکرار سریع از دیروز.
  - نمای **۷ روزه و ۳۰ روزه (ماهانه)**، شمارنده **تداوم ثبت (Streak)** و **ثبت وزن با نمودار پیشرفت**.
  - **تم تاریک و روشن**، دسترسی‌پذیری (Focus Trap، `prefers-reduced-motion`) و **ماشین‌حساب TDEE (محدودیت +۱۸)**.
- **ایمنی داده و PWA استاندارد:**
  - اسکیمای نسخه‌دار `v2` با مهاجرت امن از `v1`، نمایش خطای پر شدن حافظه (`QuotaExceededError`) با دکمه پشتیبان فوری، درخواست حافظه پایدار (`navigator.storage.persist`)، هماهنگی آنی چند تب (`storage` event) و یادآوری پشتیبان‌گیری هفتگی.
  - خروجی کامل **JSON** و **اکسل (CSV با UTF-8 BOM)**.
  - Service Worker ایمن (بدون ریلود ناگهانی هنگام تایپ + هرس خودکار کش runtime) و آیکن‌های PNG استاندارد (`192`، `512`، `maskable` و `apple-touch-icon` ۱۸۰ برای iOS).

### اجرای محلی و تست‌ها

```bash
git clone https://github.com/persian25511-cyber/calorie-traker.git
cd calorie-traker
npm ci
cp .env.example .env.local   # اختیاری
npm run dev
```

```bash
npm run lint           # بررسی کیفیت کد با oxlint
npm test               # اجرای ۲۴۰+ تست واحد و مجموعه طلایی پارسر
npm run test:coverage  # گزارش پوشش تست
npm run build          # تایپ‌چک و بیلد تولید در dist/
```

---

### راهنمای استقرار (Deployment Guide)

> **توصیه زیرساختی:** از آنجا که برنامه ۱۰۰٪ استاتیک (SPA + PWA) است، **Vercel** یا **Cloudflare Pages** بهترین و سبک‌ترین مقصد اصلی هستند (استفاده از دامنه سفارشی پشت Cloudflare پایداری دسترسی از داخل ایران را بهبود می‌دهد). پیکربندی رسمی **Railway** (با کانتینر غیرریشه Caddy) نیز برای نیازهای کانتینری آماده است.

#### ۱. استقرار روی Vercel (پیشنهادی)
فایل [`vercel.json`](./vercel.json) شامل SPA rewrite، هدرهای امنیتی سخت‌گیرانه (`CSP` خودمیزبان، `HSTS`، `X-Frame-Options`) و سیاست کش PWA است:
1. در [vercel.com/new](https://vercel.com/new) مخزن GitHub را انتخاب کنید.
2. در صورت نیاز متغیرهای `VITE_*` را از [`.env.example`](./.env.example) تنظیم کنید.
3. روی **Deploy** کلیک کنید (یا با CLI: `npx vercel --prod`).

#### ۲. استقرار روی Cloudflare Pages (پیشنهادی برای دسترسی پایدار در ایران)
فایل‌های [`public/_headers`](./public/_headers) و [`public/_redirects`](./public/_redirects) به‌صورت خودکار در `dist/` کپی می‌شوند و تمام هدرهای `CSP`/`HSTS`/PWA و SPA routing را تنظیم می‌کنند:
1. در داشبورد Cloudflare ← **Workers & Pages ← Create ← Pages ← Connect to Git**.
2. تنظیمات بیلد: Build command: `npm run build` و Build output directory: `dist`.
3. دامنه سفارشی خود را متصل کنید و دسترسی را روی موبایل (iOS Safari و Android Chrome) و حالت آفلاین تست نمایید.

#### ۳. استقرار روی Railway (کانتینر Docker + Caddy غیرریشه)
پروژه شامل [`Dockerfile`](./Dockerfile) (اجرا با کاربر غیرریشه `appuser`)، [`Caddyfile`](./Caddyfile) (با مسیر سلامت `/health`، هدرهای `CSP`/`HSTS` و فشرده‌سازی `zstd`/`gzip`) و [`railway.json`](./railway.json) است:
1. در [railway.com](https://railway.com) گزینه **New Project ← Deploy from GitHub repo** را بزنید.
2. متغیرهای `VITE_*` را در تب **Variables** قرار دهید (در Docker به‌عنوان `ARG` تزریق می‌شوند).
3. از **Settings ← Networking** روی **Generate Domain** بزنید و مسیر `/health` را بررسی کنید.

</div>

---

## English Documentation

### Overview
**KaloriShomar (کالری‌شمار روزمره) v1.0.0** is an open-source (MIT), 100% offline-first Persian Calorie & Nutrition Tracker PWA tailored for Iranian home-cooked meals and everyday household units (`کفگیر`, `کف دست`, `لیوان`, `سیخ`, `کاسه`, `ملاقه`, `اسکوپ`).

- **Zero external font dependency:** Self-hosts `Vazirmatn Variable` via `@fontsource-variable/vazirmatn` for true offline use and reliable loading inside Iran.
- **Health & Privacy First:** 100% on-device storage (`localStorage` v2 schema with `v1 → v2` migration, quota error alerts, `navigator.storage.persist()`, cross-tab sync, weekly backup reminders), strict **18+** TDEE calculator age gate, and explicit educational/medical disclaimers.
- **315+ Iranian & Everyday Foods:** Modular catalog referencing the Iranian Food Composition Table and USDA FoodData Central, plus custom food CRUD and a multi-ingredient Recipe Builder.
- **215+ Sentence Golden Parser Test Suite:** Deterministic Persian NLP with ZWNJ/Arabic normalization, Damerau-Levenshtein typo tolerance, ambiguity detection with 1-tap disambiguation chips, and clean 1-click unmatched food creation.
- **Everyday Retention Features:** Daily water tracker, inline quantity/unit/meal editing, Undo delete toast, favorite meal templates, 7-day & 30-day trend views, weight progress line chart, JSON & Excel UTF-8 BOM CSV export, and Dark/Light themes.

### Hosting & Security Hardening
- **Primary Static Hosts:** Ready out-of-the-box for **Vercel** (`vercel.json`) and **Cloudflare Pages** (`public/_headers`, `public/_redirects`).
- **Optional Container Host:** Ready for **Railway** via non-root multi-stage `Dockerfile` (`Node 22 Alpine → Caddy 2 Alpine` as `appuser`), `Caddyfile` (`/health` endpoint, `zstd/gzip`, SPA `try_files`), and `railway.json`.
- **Hardened Security Headers:** Strict self-only `Content-Security-Policy`, `Strict-Transport-Security` (HSTS preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and bounded SW runtime caching without unexpected mid-typing reloads.
- **Automated CI:** GitHub Actions (`.github/workflows/ci.yml`) runs `npm audit --audit-level=high`, `oxlint`, Vitest coverage, production build, Playwright Offline PWA E2E (`scripts/e2e-offline.mjs`), Lighthouse CI (`lighthouserc.json`), plus weekly Dependabot updates.

### Local Commands

```bash
npm ci
npm run dev            # local dev server
npm run lint           # oxlint check
npm test               # run all unit + 215 golden parser tests
npm run test:coverage  # run tests with v8 coverage report
npm run build          # TypeScript check + Vite production build
```

### License
Licensed under the [MIT License](./LICENSE).
