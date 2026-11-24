<div align="center">

# کالری‌شمار روزمره | KaloriShomar `v1.1.0`

**ردیاب سریع، کاملاً آفلاین و هوشمند کالری، درشت‌مغذی، آب و وزن برای غذاهای خانگی ایرانی**
*Fast, 100% offline-first, mobile-first Persian Calorie & Nutrition Tracker built for Iranian home-cooked meals and real kitchen units.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpersian25511-cyber%2Fcalorie-traker&project-name=calorie-tracker&repository-name=calorie-tracker&env=VITE_SITE_URL&envDescription=Canonical%20public%20HTTPS%20URL%20for%20OpenGraph%20and%20sitemap)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2Fpersian25511-cyber%2Fcalorie-traker)

[نسخه فارسی (Persian)](#-نسخه-فارسی) • [English Documentation](#-english-documentation) • [اعتبارسنجی داده‌ها](./docs/FOOD_DATA_VALIDATION.md) • [Changelog](./CHANGELOG.md) • [MIT License](./LICENSE)

</div>

---

<div dir="rtl">

## نسخه فارسی

### معرفی
**کالری‌شمار روزمره** یک وب‌اپلیکیشن سبک، متن‌باز (MIT) و **۱۰۰٪ آفلاین (Offline-First PWA)** ویژه فرهنگ غذایی ایران است. فونت فارسی (`Vazirmatn Variable`) به‌صورت محلی میزبانی می‌شود (بدون وابستگی به Google Fonts و بدون ریسک کندی/فیلتر) و تمام داده‌ها صرفاً روی دستگاه خود کاربر ذخیره می‌شوند (**بدون ثبت‌نام و بدون هیچ اسکریپت ردیابی**).

> **سلب مسئولیت سلامت:** این برنامه صرفاً یک ابزار آموزشی برای **برآورد تقریبی** کالری و درشت‌مغذی‌هاست و جایگزین پزشک یا متخصص تغذیه نیست. محاسبه‌گر کالری (TDEE) فقط برای بزرگسالان **۱۸+** فعال است، برای اهداف دستی زیر `۱٬۲۰۰` کالری هشدار نرم سلامت نمایش می‌دهد و در شرایط بارداری، شیردهی، سن زیر ۱۸ سال یا سابقه اختلالات خوردن باید حتماً با متخصص مشورت شود.

### امکانات کلیدی (`v1.1.0` — تکمیل فازهای ۰ تا ۳)
- **معماری لایهٔ کاربر برای کاتالوگ غذا (`Schema v3` + `CATALOG_VERSION`):**
  - ۳۲۲ غذای داخلی مستقیماً از کد با نسخهٔ کاتالوگ (`2026.11.2`) خوانده می‌شوند و در مرورگر **فقط غذاهای شخصی و ویرایش‌های کاربر (`foodOverrides`)** ذخیره می‌گردند؛ بنابراین اصلاحات علمی کالری بدون از دست رفتن ویرایش‌های کاربر به کاربران قبلی هم می‌رسد و «همگام‌سازی پیش‌فرض‌ها» هرگز غذاهای شخصی یا ویرایش‌های کاربر را پاک نمی‌کند.
  - **اعتبارسنجی علمی ۶۷ غذای پرمصرف:** دارای فیلدهای `source` و `verified` با ارجاع به جدول ترکیبات مواد غذایی ایران (NNFTRI) و شماره دقیق `USDA NDB #` (مستند در [`docs/FOOD_DATA_VALIDATION.md`](./docs/FOOD_DATA_VALIDATION.md)) همراه با حفظ شفاف برچسب «برآورد تقریبی».
- **تحلیل‌گر زبان طبیعی فارسی ماژولار (`src/utils/parser/*`) + ۲۵۷ تست خودکار:**
  - پشتیبانی از ارقام فارسی/عربی/انگلیسی، کلمات عددی ترکیبی (`صد و بیست و پنج`، `یک و نیم`، `نصف`) و واحدهای واقعی آشپزخانه ایرانی (`کفگیر`، `کف دست`، `قاشق`، `لیوان`، `کاسه`، `پیاله`، `سیخ`، `اسکوپ`، `قوطی`، `ملاقه`، `گرم`).
  - تشخیص ابهام برای عبارات کلی («برنج»، «ماست»، «پنیر»، «کباب»)، افزودن تک‌کلیکی غذای جدید و لینک مستقیم **گزارش غذای ناموجود / اشتباه** در GitHub Issues.
- **ایمنی داده، بکاپ هوشمند و حالت ایمن (`Safe Mode`):**
  - **ایمپورت بکاپ با پیش‌نمایش کامل** (تعداد وعده، بازه تاریخ شمسی، غذاهای شخصی، وزن و آب)، انتخاب حالت **«ادغام»** یا **«جایگزینی کامل»** (با پاک‌سازی داده‌های قدیمی ناسازگار در صورت نبود وزن/آب در بکاپ قدیمی) و **ذخیره خودکار نسخه پشتیبان قبل از ایمپورت** با دکمه بازگردانی تک‌کلیکی.
  - پاک‌سازی کامل (`sanitize`) تمامی مجموعه‌ها (غذاها، وعده‌ها، وزن، قالب‌ها و آب) هنگام خواندن و همگام‌سازی چندتب + آینه‌سازی غیرمسدودکننده در `IndexedDB` ([`docs/STORAGE_ROADMAP.md`](./docs/STORAGE_ROADMAP.md)).
  - **حالت ایمن در `ErrorBoundary`:** دانلود دادهٔ خام تمام کلیدهای حافظه حتی در صورت خرابی JSON و بازنشانی دو مرحله‌ای.
- **آنبوردینگ، رشد و اشتراک‌گذاری (فازهای ۱ تا ۳):**
  - **آنبوردینگ سه‌مرحله‌ای غیرمسدودکننده** (تعیین هدف ← اولین ثبت ← نصب آفلاین) + **راهنمای اختصاصی Add to Home Screen برای iOS Safari**.
  - **غذاهای پرتکرار و اخیر** برای ثبت تک‌کلیکی، **جستجوی فوری در تاریخچه وعده‌ها**، **گزارش هفتگی** و **خروجی تصویر PNG باکیفیت (۱۰۸۰×۱۰۸۰)** از کارت روزانه و هفتگی.
  - **آمار بتای ۱۰۰٪ محلی و ناشناس** برای سنجش نرخ «غذای ناموجود» بدون هیچ ارسال شبکه‌ای خودکار + قالب‌های آماده بسته‌بندی اندروید (TWA / Capacitor) برای **کافه‌بازار و مایکت** ([`docs/STORE_PACKAGING_BAZAAR_MYKET.md`](./docs/STORE_PACKAGING_BAZAAR_MYKET.md)).

### اجرای محلی و تست‌ها

```bash
git clone https://github.com/persian25511-cyber/calorie-traker.git
cd calorie-traker
npm ci
cp .env.example .env.local   # شامل VITE_SITE_URL برای بیلد محلی
npm run dev
```

```bash
npm run lint                                               # بررسی کیفیت کد با oxlint (۰ خطا / ۰ هشدار)
npm run test:coverage                                      # اجرای ۲۵۷ تست با بررسی آستانه پوشش کد
VITE_SITE_URL="https://example.com" npm run build          # تایپ‌چک، تولید متادیتای مطلق، sitemap و بیلد
npm run test:e2e                                           # تست E2E آفلاین با Playwright و Service Worker
```

> **مهم درباره `VITE_SITE_URL`:** طبق سیاست سخت‌گیرانه تولید، متغیر `VITE_SITE_URL` در زمان `npm run build` **اجباری** است و پیش‌فرض پنهان ندارد تا تگ‌های `og:image`، `og:url`، `canonical` و `sitemap.xml` همیشه با آدرس مطلق دامنه واقعی تولید شوند.

---

### راهنمای استقرار (Deployment Guide)

#### ۱. استقرار روی Vercel (پیشنهادی)
1. در [vercel.com/new](https://vercel.com/new) مخزن GitHub را انتخاب کنید.
2. در بخش **Environment Variables** متغیر زیر را اضافه کنید (**الزامی**):
   - `VITE_SITE_URL` = آدرس عمومی پروژه (مثلاً `https://calorie-traker.vercel.app` یا دامنه اختصاصی شما).
3. روی **Deploy** کلیک کنید. فایل [`vercel.json`](./vercel.json) هدرهای `CSP`، `HSTS (preload)` و کشینگ PWA را اعمال می‌کند.

#### ۲. دامنه اختصاصی پشت Cloudflare و تست اپراتورهای ایران
برای پایداری کامل دسترسی روی همراه اول، ایرانسل، رایتل و اینترنت ثابت در ایران، اتصال یک دامنه اختصاصی پشت Cloudflare توصیه می‌شود. جزئیات کامل تنظیمات TLS، چک‌لیست تست دستگاه واقعی (iOS Safari / Android Chrome / VoiceOver / TalkBack) و برنامه بتای محدود در [`docs/A11Y_AND_DEPLOY_CHECKLIST.md`](./docs/A11Y_AND_DEPLOY_CHECKLIST.md) مستند شده است.

#### ۳. استقرار روی Railway (کانتینر Docker + Caddy غیرریشه)
1. در [railway.com](https://railway.com) گزینه **New Project ← Deploy from GitHub repo** را بزنید.
2. در تب **Variables** متغیر الزامی `VITE_SITE_URL` (مثلاً `https://kalorishomar.up.railway.app`) را تنظیم کنید (در `Dockerfile` پیش از بیلد بررسی می‌شود).
3. از **Settings ← Networking** دامنه را فعال کرده و سلامت کانتینر را از مسیر `/health` بررسی نمایید.

</div>

---

## English Documentation

### Overview
**KaloriShomar (کالری‌شمار روزمره) v1.1.0** is an open-source (MIT), 100% offline-first Persian Calorie & Nutrition Tracker PWA built for Iranian home-cooked meals and real household units (`کفگیر`, `کف دست`, `لیوان`, `سیخ`, `کاسه`, `ملاقه`, `اسکوپ`).

### Key Highlights (`v1.1.0`)
- **User-Layer Food Catalog (`Schema v3` + `CATALOG_VERSION`):** Built-in foods load directly from code while `localStorage` stores only custom dishes and explicit user overrides (`kalorishomar_v3_*`), ensuring upstream nutrition updates reach existing users without overwriting personal edits.
- **67 Reference-Validated High-Use Foods:** Every catalog item includes `source` and `verified` metadata cross-checked against the Iranian Food Composition Table (NNFTRI) and USDA FoodData Central (`docs/FOOD_DATA_VALIDATION.md`), while maintaining honest "approximate estimate" (`برآورد تقریبی`) UI messaging.
- **Safe Backup Import & Recovery:** Interactive backup preview (entry count + Jalali date span), **Merge** vs. **Replace** modes (clearing stale water/weights when absent in legacy backups), automatic pre-import rollback snapshot, full sanitizer coverage across all collections, IndexedDB dual-write mirroring (`docs/STORAGE_ROADMAP.md`), and `ErrorBoundary` Safe Mode raw dump + reset.
- **Strict Build-Time SEO & Link Previews:** `VITE_SITE_URL` is strictly validated during `vite build` (throws if unset) to emit absolute `canonical`, `og:url`, `og:image`, `twitter:image`, `dist/sitemap.xml`, and `dist/robots.txt`.
- **Health Safety & Calm UX:** Strict **18+** TDEE gate, soft health warning for manual goals below `1,200 kcal`, non-pressuring streak/weight wording, 3-step guided onboarding, iOS Safari Add-to-Home-Screen guide, Recent/Frequent food chips, History Search, 1080×1080 PNG report cards, local-only anonymous beta metrics, and TWA/Capacitor configs for Cafe Bazaar & Myket (`docs/STORE_PACKAGING_BAZAAR_MYKET.md`).

### Required Build Environment Variable
`VITE_SITE_URL` **must** be set when running `npm run build` (on Vercel, Railway, Cloudflare Pages, or Docker):
```bash
VITE_SITE_URL="https://your-domain.com" npm run build
```

### License
Licensed under the [MIT License](./LICENSE) (`Copyright (c) 2026 persian25511-cyber`).
