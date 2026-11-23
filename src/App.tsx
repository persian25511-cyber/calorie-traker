import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Home,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldAlert,
  WifiOff,
  X,
} from 'lucide-react'
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { DailySummaryCard } from './components/DailySummaryCard'
import { FoodDatabaseTab } from './components/FoodDatabaseTab'
import { QuickEntryBar } from './components/QuickEntryBar'
import { SettingsTab } from './components/SettingsTab'
import { TodayMealsList } from './components/TodayMealsList'
import { APP_CONFIG } from './config/env'
import { computeLoggingStreak, useNutritionStore } from './hooks/useNutritionStore'
import {
  MEAL_TYPE_LABELS,
  type AppTab,
  type FoodItem,
  type LoggedFoodEntry,
  type MacroValues,
  type MealTemplate,
  type MealType,
  type ParsedFoodItem,
} from './types/nutrition'
import { buildPersianDailyReport } from './utils/dailySummaryShare'
import {
  dateFromKey,
  formatFaNumber,
  formatJalaliDate,
  getDefaultMealTypeForHour,
  getLocalDateKey,
  shiftDateKey,
} from './utils/persianFormat'
import { usePwaStatus } from './utils/pwa'

const WeeklyTrendsTab = lazy(() =>
  import('./components/WeeklyTrendsTab').then((m) => ({ default: m.WeeklyTrendsTab })),
)

const NAV_ITEMS: Array<{ id: AppTab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'ثبت روزانه', icon: Home },
  { id: 'trends', label: 'روند و وزن', icon: BarChart3 },
  { id: 'foods', label: 'بانک غذاها', icon: BookOpen },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
]

interface ToastState {
  message: string
  undoEntry?: LoggedFoodEntry
}

export function App() {
  const {
    foods,
    entries,
    goals,
    waterByDate,
    weights,
    templates,
    theme,
    lastBackupAt,
    storageError,
    persistenceState,
    shouldRemindBackup,
    setTheme,
    dismissStorageError,
    logParsedItems,
    deleteEntry,
    restoreEntry,
    updateEntry,
    repeatEntries,
    adjustWater,
    upsertWeight,
    deleteWeight,
    saveMealTemplate,
    deleteMealTemplate,
    applyMealTemplate,
    addFood,
    updateFood,
    deleteFood,
    resetDefaultFoods,
    updateGoals,
    clearAllEntries,
    exportBackupJson,
    exportEntriesCsv,
    importBackupJson,
  } = useNutritionStore()

  const pwaStatus = usePwaStatus()

  const todayKey = getLocalDateKey()
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey)
  const [quickInput, setQuickInput] = useState('')
  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealTypeForHour())
  const [prefillNewFoodName, setPrefillNewFoodName] = useState<string | null>(null)
  const [backupReminderDismissed, setBackupReminderDismissed] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = useCallback((message: string, undoEntry?: LoggedFoodEntry) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast({ message, undoEntry })
    toastTimerRef.current = window.setTimeout(
      () => {
        setToast(null)
        toastTimerRef.current = null
      },
      undoEntry ? 4500 : 2800,
    )
  }, [])

  const isSelectedToday = selectedDateKey === todayKey
  const previousDateKey = useMemo(() => shiftDateKey(selectedDateKey, -1), [selectedDateKey])

  const selectedJalaliFull = useMemo(
    () => formatJalaliDate(dateFromKey(selectedDateKey), 'full'),
    [selectedDateKey],
  )

  const selectedDayShortLabel = useMemo(() => {
    if (selectedDateKey === todayKey) return 'امروز'
    if (selectedDateKey === shiftDateKey(todayKey, -1)) return 'دیروز'
    return formatJalaliDate(dateFromKey(selectedDateKey), 'medium')
  }, [selectedDateKey, todayKey])

  const previousDayLabel = useMemo(() => {
    if (previousDateKey === shiftDateKey(todayKey, -1)) return 'دیروز'
    return formatJalaliDate(dateFromKey(previousDateKey), 'short')
  }, [previousDateKey, todayKey])

  const dayEntries = useMemo(
    () => entries.filter((e) => e.dateKey === selectedDateKey),
    [entries, selectedDateKey],
  )

  const previousDayEntries = useMemo(
    () => entries.filter((e) => e.dateKey === previousDateKey),
    [entries, previousDateKey],
  )

  const dailyConsumed = useMemo<MacroValues>(() => {
    return dayEntries.reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.kcal,
        protein: Math.round((acc.protein + e.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + e.carbs) * 10) / 10,
        fat: Math.round((acc.fat + e.fat) * 10) / 10,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [dayEntries])

  const selectedWaterGlasses = waterByDate[selectedDateKey] ?? 0
  const streakDays = useMemo(() => computeLoggingStreak(entries, todayKey), [entries, todayKey])

  const handleQuickDownloadBackup = useCallback(() => {
    const json = exportBackupJson()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kalorishomar-backup-${getLocalDateKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('فایل پشتیبان JSON با موفقیت دانلود شد')
  }, [exportBackupJson, showToast])

  const handleSubmitQuickMeal = useCallback(
    (items: ParsedFoodItem[], chosenMealType: MealType, sourceText: string) => {
      const created = logParsedItems(items, chosenMealType, selectedDateKey, sourceText)
      const totalKcal = created.reduce((sum, item) => sum + item.kcal, 0)
      showToast(
        `${formatFaNumber(created.length)} مورد در ${MEAL_TYPE_LABELS[chosenMealType]} ثبت شد (${formatFaNumber(totalKcal)} کالری)`,
      )
    },
    [logParsedItems, selectedDateKey, showToast],
  )

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      const removed = deleteEntry(entryId)
      if (removed) {
        showToast(`«${removed.foodName}» حذف شد`, removed)
      }
    },
    [deleteEntry, showToast],
  )

  const handleUndoDelete = useCallback(() => {
    if (!toast?.undoEntry) return
    restoreEntry(toast.undoEntry)
    setToast(null)
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [restoreEntry, toast])

  const handleRepeatEntries = useCallback(
    (items: LoggedFoodEntry[], targetMealType: MealType) => {
      const cloned = repeatEntries(items, targetMealType, selectedDateKey)
      const totalKcal = cloned.reduce((sum, item) => sum + item.kcal, 0)
      showToast(
        `${MEAL_TYPE_LABELS[targetMealType]} تکرار شد (${formatFaNumber(totalKcal)} کالری)`,
      )
    },
    [repeatEntries, selectedDateKey, showToast],
  )

  const handleSaveTemplate = useCallback(
    (name: string, targetMealType: MealType, items: LoggedFoodEntry[]) => {
      saveMealTemplate(name, targetMealType, items)
      showToast(`«${name}» به وعده‌های منتخب اضافه شد`)
    },
    [saveMealTemplate, showToast],
  )

  const handleApplyTemplate = useCallback(
    (template: MealTemplate) => {
      const created = applyMealTemplate(template, selectedDateKey, mealType)
      const totalKcal = created.reduce((sum, item) => sum + item.kcal, 0)
      showToast(`«${template.name}» ثبت شد (${formatFaNumber(totalKcal)} کالری)`)
    },
    [applyMealTemplate, mealType, selectedDateKey, showToast],
  )

  const handleCopyDailyReport = useCallback(async (): Promise<boolean> => {
    const report = buildPersianDailyReport({
      appName: APP_CONFIG.appName,
      jalaliDateLabel: selectedJalaliFull,
      consumed: dailyConsumed,
      goals,
      waterGlasses: selectedWaterGlasses,
      entries: dayEntries,
    })

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report)
        showToast('گزارش کامل امروز در حافظه کپی شد')
        return true
      }
    } catch {
      // Fallback below
    }

    try {
      const ta = document.createElement('textarea')
      ta.value = report
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      showToast('گزارش کامل امروز در حافظه کپی شد')
      return true
    } catch {
      showToast('امکان کپی خودکار گزارش وجود نداشت')
      return false
    }
  }, [dailyConsumed, dayEntries, goals, selectedJalaliFull, selectedWaterGlasses, showToast])

  const handleQuickUseFood = useCallback(
    (food: FoodItem) => {
      const phrase = `یک ${food.defaultUnit} ${food.name}`
      setQuickInput((prev) => (prev.trim() ? `${prev.trim()} و ${phrase}` : phrase))
      setActiveTab('home')
      showToast(`«${food.name}» به کادر ثبت سریع اضافه شد`)
    },
    [showToast],
  )

  const handleRequestAddCustomFood = useCallback((prefillName: string) => {
    setPrefillNewFoodName(prefillName)
    setActiveTab('foods')
  }, [])

  const handleAddFood = useCallback(
    (food: Omit<FoodItem, 'id'>) => {
      addFood(food)
      showToast(`«${food.name}» به بانک غذاها اضافه شد`)
    },
    [addFood, showToast],
  )

  const handleUpdateFood = useCallback(
    (food: FoodItem) => {
      updateFood(food)
      showToast(`تغییرات «${food.name}» ذخیره شد`)
    },
    [updateFood, showToast],
  )

  const handleDeleteFood = useCallback(
    (id: string) => {
      deleteFood(id)
      showToast('غذا از بانک حذف شد')
    },
    [deleteFood, showToast],
  )

  const handleSelectDateFromTrends = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey)
    setActiveTab('home')
  }, [])

  return (
    <div dir="rtl" className="min-h-dvh bg-[#0C0C0D] text-[#FAFAFA] flex flex-col">
      {/* Visible Storage Quota / Persistence Error Banner (NEVER silently swallow errors) */}
      {storageError && (
        <div
          role="alert"
          data-testid="storage-error-banner"
          className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-xs flex flex-wrap items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2 text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{storageError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickDownloadBackup}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-500 text-white font-bold px-2.5 py-1 text-[11px]"
            >
              <Download className="w-3 h-3" />
              <span>دانلود پشتیبان فوری</span>
            </button>
            <button
              type="button"
              onClick={dismissStorageError}
              aria-label="بستن هشدار حافظه"
              className="text-rose-200 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* User-Controlled PWA Update Available Banner (never reloads mid-typing) */}
      {pwaStatus.hasUpdate && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-4 py-2 text-xs flex items-center justify-center gap-3">
          <span className="text-amber-200">نسخه جدید کالری‌شمار روزمره آماده است.</span>
          <button
            type="button"
            onClick={pwaStatus.applyUpdate}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-[#1A1202] font-bold px-2.5 py-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>به‌روزرسانی</span>
          </button>
        </div>
      )}

      {/* Gentle Weekly Backup Reminder Banner */}
      {shouldRemindBackup && !backupReminderDismissed && !storageError && (
        <div
          data-testid="weekly-backup-reminder"
          className="bg-sky-500/10 border-b border-sky-500/20 px-4 py-2 text-xs flex flex-wrap items-center justify-center gap-2.5"
        >
          <span className="text-zinc-200">
            داده‌ها فقط روی این دستگاه ذخیره می‌شوند؛ یادآوری پشتیبان‌گیری هفتگی:
          </span>
          <button
            type="button"
            onClick={handleQuickDownloadBackup}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold px-2.5 py-1 text-[11px]"
          >
            <Download className="w-3 h-3" />
            <span>دانلود پشتیبان JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setBackupReminderDismissed(true)}
            aria-label="یادآوری بعدی"
            className="text-zinc-400 hover:text-zinc-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#0C0C0D]/90 backdrop-blur-xl border-b border-[#1E1E22]">
        <div className="max-w-5xl mx-auto px-4 h-15 flex items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#161618] border border-[#26262A] flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-zinc-50 leading-tight truncate">
                  {APP_CONFIG.appName}
                </h1>
                {!pwaStatus.isOnline && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-300 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                    <WifiOff className="w-3 h-3" />
                    آفلاین
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight truncate mt-0.5">
                {selectedJalaliFull}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav
            aria-label="منوی اصلی دسکتاپ"
            className="hidden md:flex items-center gap-1 rounded-xl bg-[#161618] border border-[#26262A] p-1"
          >
            {NAV_ITEMS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`desktop-nav-${tab.id}`}
                  data-nav-tab={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-emerald-500 text-[#051B11] font-bold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#222227]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Compact Jalali Date Switcher on Home Tab */}
          {activeTab === 'home' ? (
            <div className="flex items-center gap-1 rounded-xl bg-[#161618] border border-[#26262A] p-1 shrink-0">
              <button
                type="button"
                aria-label="روز قبل"
                onClick={() => setSelectedDateKey((k) => shiftDateKey(k, -1))}
                className="w-7 h-7 rounded-lg hover:bg-[#24242A] text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateKey(todayKey)}
                className="px-2 py-1 text-xs font-semibold text-zinc-200 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                title="بازگشت به امروز"
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
                <span>{selectedDayShortLabel}</span>
              </button>
              <button
                type="button"
                aria-label="روز بعد"
                disabled={isSelectedToday}
                onClick={() => setSelectedDateKey((k) => shiftDateKey(k, 1))}
                className="w-7 h-7 rounded-lg hover:bg-[#24242A] text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="md:hidden text-xs font-semibold text-zinc-300 bg-[#161618] border border-[#26262A] rounded-xl px-3 py-1.5">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-4 pb-28 md:pb-8">
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Primary Column: Instant Quick Entry FIRST, then Today's Meals */}
            <div className="lg:col-span-8 space-y-4">
              <QuickEntryBar
                foods={foods}
                recentEntries={entries}
                templates={templates}
                totalLoggedCount={entries.length}
                inputText={quickInput}
                onInputTextChange={setQuickInput}
                mealType={mealType}
                onMealTypeChange={setMealType}
                onSubmitItems={handleSubmitQuickMeal}
                onApplyTemplate={handleApplyTemplate}
                onDeleteTemplate={deleteMealTemplate}
                onRequestAddCustomFood={handleRequestAddCustomFood}
              />

              {/* Mobile-first Summary right below Quick Entry */}
              <div className="lg:hidden">
                <DailySummaryCard
                  idPrefix="mobile"
                  consumed={dailyConsumed}
                  goals={goals}
                  dayLabel={selectedDayShortLabel}
                  waterGlasses={selectedWaterGlasses}
                  onAdjustWater={(delta) => adjustWater(selectedDateKey, delta)}
                  onCopyDailyReport={handleCopyDailyReport}
                />
              </div>

              <TodayMealsList
                foods={foods}
                dayEntries={dayEntries}
                previousDayEntries={previousDayEntries}
                previousDayLabel={previousDayLabel}
                onDeleteEntry={handleDeleteEntry}
                onUpdateEntry={updateEntry}
                onRepeatEntries={handleRepeatEntries}
                onSaveTemplate={handleSaveTemplate}
              />
            </div>

            {/* Desktop Sticky Sidebar: Daily Calorie Ring, Macros & Water */}
            <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20">
              <DailySummaryCard
                idPrefix="desktop"
                consumed={dailyConsumed}
                goals={goals}
                dayLabel={selectedDayShortLabel}
                waterGlasses={selectedWaterGlasses}
                onAdjustWater={(delta) => adjustWater(selectedDateKey, delta)}
                onCopyDailyReport={handleCopyDailyReport}
              />
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <Suspense
            fallback={
              <div className="card-surface rounded-2xl p-8 text-center text-xs text-zinc-400">
                در حال بارگذاری نمودار روند و وزن...
              </div>
            }
          >
            <WeeklyTrendsTab
              entries={entries}
              goals={goals}
              weights={weights}
              streakDays={streakDays}
              onSelectDate={handleSelectDateFromTrends}
              onUpsertWeight={(dk, w) => {
                upsertWeight(dk, w)
                showToast(`وزن ${formatFaNumber(w, 1)} کیلوگرم ثبت شد`)
              }}
              onDeleteWeight={deleteWeight}
            />
          </Suspense>
        )}

        {activeTab === 'foods' && (
          <FoodDatabaseTab
            foods={foods}
            prefillNewFoodName={prefillNewFoodName}
            onConsumePrefillName={() => setPrefillNewFoodName(null)}
            onAddFood={handleAddFood}
            onUpdateFood={handleUpdateFood}
            onDeleteFood={handleDeleteFood}
            onQuickUseFood={handleQuickUseFood}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            goals={goals}
            foodsCount={foods.length}
            entriesCount={entries.length}
            theme={theme}
            lastBackupAt={lastBackupAt}
            persistenceState={persistenceState}
            pwaStatus={pwaStatus}
            onThemeChange={setTheme}
            onUpdateGoals={(next) => {
              updateGoals(next)
              showToast('اهداف روزانه به‌روزرسانی شد')
            }}
            onExportJson={exportBackupJson}
            onExportCsv={exportEntriesCsv}
            onImportJson={importBackupJson}
            onResetDefaultFoods={resetDefaultFoods}
            onClearAllEntries={() => {
              clearAllEntries()
              showToast('تاریخچه وعده‌ها پاک شد')
            }}
          />
        )}

        {/* Concise Educational & Local-Privacy Footer */}
        <footer className="mt-8 pt-4 border-t border-[#1E1E22] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
            <span>
              ارزش‌های غذایی تقریبی هستند · ابزار آموزشی (جایگزین پزشک نیست) · داده‌ها فقط روی
              دستگاه شما می‌ماند.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="text-emerald-400 hover:underline font-medium shrink-0"
          >
            حریم خصوصی، منابع و مجوز MIT
          </button>
        </footer>
      </main>

      {/* Actionable Toast Notification (with Undo on delete) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="app-toast"
          className="fixed z-40 bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 max-w-[92vw] rounded-xl bg-[#1E1E22] border border-[#34343D] px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-100 shadow-2xl animate-fade-up flex items-center gap-3"
        >
          <span>{toast.message}</span>
          {toast.undoEntry && (
            <button
              type="button"
              id="toast-undo-btn"
              onClick={handleUndoDelete}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/18 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs px-2.5 py-1 shrink-0 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>بازگردانی</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="منوی اصلی موبایل"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#111113]/92 backdrop-blur-xl border-t border-[#26262A]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-2">
          {NAV_ITEMS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                id={`mobile-nav-${tab.id}`}
                data-nav-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                  active ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div
                  className={`px-3 py-1 rounded-full transition-colors ${
                    active ? 'bg-emerald-500/14' : ''
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className={`text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default App
