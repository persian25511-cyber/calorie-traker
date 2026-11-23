import {
  AlertTriangle,
  Calculator,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Lock,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { NUTRITION_DATA_SOURCES } from '../data/iranianFoods'
import type { ThemeMode, UserGoals } from '../types/nutrition'
import {
  ACTIVITY_LEVEL_LABELS,
  HEALTH_DISCLAIMERS,
  MIN_CALCULATOR_AGE,
  WEIGHT_GOAL_LABELS,
  evaluateTdeeGoals,
  type ActivityLevel,
  type BiologicalSex,
  type WeightGoal,
} from '../utils/calorieCalculator'
import { formatFaNumber, formatJalaliDate, getLocalDateKey, toAsciiDigits } from '../utils/persianFormat'
import type { PwaStatus } from '../utils/pwa'

interface SettingsTabProps {
  goals: UserGoals
  foodsCount: number
  entriesCount: number
  theme: ThemeMode
  lastBackupAt: number | null
  persistenceState: 'checking' | 'persisted' | 'not_persisted' | 'unsupported'
  pwaStatus: PwaStatus
  onThemeChange: (next: ThemeMode) => void
  onUpdateGoals: (goals: UserGoals) => void
  onExportJson: () => string
  onExportCsv: () => string
  onImportJson: (
    raw: string,
  ) => { ok: boolean; error?: string; stats?: { foods: number; entries: number } }
  onResetDefaultFoods: () => void
  onClearAllEntries: () => void
}

const GOAL_PRESETS: Array<{ label: string; sub: string; goals: UserGoals }> = [
  {
    label: 'کاهش وزن',
    sub: '۱٬۶۰۰ کالری',
    goals: { dailyKcal: 1600, proteinGrams: 115, carbsGrams: 160, fatGrams: 55, waterGoalGlasses: 8 },
  },
  {
    label: 'تثبیت وزن',
    sub: '۲٬۰۰۰ کالری',
    goals: { dailyKcal: 2000, proteinGrams: 120, carbsGrams: 230, fatGrams: 65, waterGoalGlasses: 8 },
  },
  {
    label: 'افزایش حجم',
    sub: '۲٬۵۰۰ کالری',
    goals: {
      dailyKcal: 2500,
      proteinGrams: 155,
      carbsGrams: 300,
      fatGrams: 75,
      waterGoalGlasses: 10,
    },
  },
]

function parseIntInput(val: string, fallback: number): number {
  const num = Number(toAsciiDigits(val).trim())
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback
}

function parseRawAge(val: string): number {
  const cleaned = toAsciiDigits(val).trim()
  if (!cleaned) return 0
  const num = Number(cleaned)
  return Number.isFinite(num) ? Math.round(num) : 0
}

export function SettingsTab({
  goals,
  foodsCount,
  entriesCount,
  theme,
  lastBackupAt,
  persistenceState,
  pwaStatus,
  onThemeChange,
  onUpdateGoals,
  onExportJson,
  onExportCsv,
  onImportJson,
  onResetDefaultFoods,
  onClearAllEntries,
}: SettingsTabProps) {
  const [kcalInput, setKcalInput] = useState(String(goals.dailyKcal))
  const [proteinInput, setProteinInput] = useState(String(goals.proteinGrams))
  const [carbsInput, setCarbsInput] = useState(String(goals.carbsGrams))
  const [fatInput, setFatInput] = useState(String(goals.fatGrams))
  const [waterInput, setWaterInput] = useState(String(goals.waterGoalGlasses))
  const [savedNotice, setSavedNotice] = useState(false)

  // Smart Persian TDEE Calculator state (strictly 18+)
  const [calcOpen, setCalcOpen] = useState(false)
  const [sex, setSex] = useState<BiologicalSex>('male')
  const [age, setAge] = useState('30')
  const [height, setHeight] = useState('175')
  const [weight, setWeight] = useState('75')
  const [activity, setActivity] = useState<ActivityLevel>('light')
  const [weightGoal, setWeightGoal] = useState<WeightGoal>('lose')

  const [backupMessage, setBackupMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmResetFoods, setConfirmResetFoods] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const tdeeEvaluation = useMemo(() => {
    return evaluateTdeeGoals({
      sex,
      ageYears: parseRawAge(age),
      heightCm: parseIntInput(height, 175),
      weightKg: parseIntInput(weight, 75),
      activity,
      goal: weightGoal,
    })
  }, [sex, age, height, weight, activity, weightGoal])

  const syncInputsAndSave = (next: UserGoals) => {
    setKcalInput(String(next.dailyKcal))
    setProteinInput(String(next.proteinGrams))
    setCarbsInput(String(next.carbsGrams))
    setFatInput(String(next.fatGrams))
    setWaterInput(String(next.waterGoalGlasses))
    onUpdateGoals(next)
    setSavedNotice(true)
    window.setTimeout(() => setSavedNotice(false), 2400)
  }

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault()
    syncInputsAndSave({
      dailyKcal: parseIntInput(kcalInput, goals.dailyKcal),
      proteinGrams: parseIntInput(proteinInput, goals.proteinGrams),
      carbsGrams: parseIntInput(carbsInput, goals.carbsGrams),
      fatGrams: parseIntInput(fatInput, goals.fatGrams),
      waterGoalGlasses: parseIntInput(waterInput, goals.waterGoalGlasses),
    })
  }

  const triggerDownload = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportJson = () => {
    triggerDownload(
      onExportJson(),
      'application/json;charset=utf-8',
      `kalorishomar-backup-${getLocalDateKey()}.json`,
    )
    setBackupMessage({
      type: 'success',
      text: 'فایل پشتیبان کامل (JSON) با موفقیت دانلود شد.',
    })
  }

  const handleExportCsv = () => {
    if (entriesCount === 0) {
      setBackupMessage({
        type: 'error',
        text: 'هنوز وعده‌ای برای خروجی CSV ثبت نشده است.',
      })
      return
    }
    triggerDownload(
      onExportCsv(),
      'text/csv;charset=utf-8',
      `kalorishomar-meals-${getLocalDateKey()}.csv`,
    )
    setBackupMessage({
      type: 'success',
      text: 'فایل اکسل (CSV) وعده‌های شما با موفقیت دانلود شد.',
    })
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const res = onImportJson(text)
      if (res.ok && res.stats) {
        setBackupMessage({
          type: 'success',
          text: `بازیابی انجام شد: ${formatFaNumber(res.stats.foods)} غذا و ${formatFaNumber(res.stats.entries)} وعده.`,
        })
      } else {
        setBackupMessage({
          type: 'error',
          text: res.error ?? 'خطا در بازیابی فایل پشتیبان.',
        })
      }
    } catch {
      setBackupMessage({
        type: 'error',
        text: 'امکان خواندن فایل انتخاب‌شده وجود ندارد.',
      })
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4 animate-fade-up" data-testid="settings-tab">
      {/* Smart Persian TDEE Goal Calculator (Strictly 18+ with Health Disclaimers) */}
      <section className="card-surface rounded-2xl overflow-hidden">
        <button
          type="button"
          id="toggle-tdee-calculator-btn"
          onClick={() => setCalcOpen((o) => !o)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-right hover:bg-[#1B1B1F] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-400 shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-zinc-100">
                  محاسبه‌گر هوشمند کالری و درشت‌مغذی (TDEE)
                </h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300">
                  بزرگسالان +۱۸
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                برآورد تقریبی نیاز روزانه بر پایه فرمول Mifflin-St Jeor (ابزار آموزشی)
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
              calcOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {calcOpen && (
          <div
            data-testid="tdee-calculator-panel"
            className="px-4 sm:px-5 pb-5 pt-3 border-t border-[#222227] space-y-4 animate-fade-up"
          >
            {/* Mandatory Health Disclaimer & Special Groups Warning */}
            <div
              data-testid="health-disclaimer-banner"
              className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-3 text-xs space-y-1.5 leading-relaxed"
            >
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>سلب مسئولیت سلامت و محدودیت سنی (+۱۸)</span>
              </div>
              <p className="text-zinc-300">{HEALTH_DISCLAIMERS.educationalNotice}</p>
              <p className="text-zinc-400">{HEALTH_DISCLAIMERS.specialGroupsWarning}</p>
            </div>

            {/* Sex + Body metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="block text-[11px] text-zinc-400 mb-1.5">جنسیت</span>
                <div className="grid grid-cols-2 rounded-xl bg-[#0C0C0D] p-1 border border-[#2C2C33]">
                  <button
                    type="button"
                    onClick={() => setSex('male')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sex === 'male'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    مرد
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('female')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sex === 'female'
                        ? 'bg-emerald-500 text-[#051B11] font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    زن
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="tdee-age-input" className="block text-[11px] text-zinc-400 mb-1.5">
                  سن (حداقل {formatFaNumber(MIN_CALCULATOR_AGE)} سال)
                </label>
                <input
                  id="tdee-age-input"
                  type="text"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                />
              </div>

              <div>
                <label
                  htmlFor="tdee-height-input"
                  className="block text-[11px] text-zinc-400 mb-1.5"
                >
                  قد (سانتی‌متر)
                </label>
                <input
                  id="tdee-height-input"
                  type="text"
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                />
              </div>

              <div>
                <label
                  htmlFor="tdee-weight-input"
                  className="block text-[11px] text-zinc-400 mb-1.5"
                >
                  وزن (کیلوگرم)
                </label>
                <input
                  id="tdee-weight-input"
                  type="text"
                  inputMode="numeric"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2 text-sm text-zinc-100 tabular-nums-fa"
                />
              </div>
            </div>

            {/* Activity & Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tdee-activity-select"
                  className="block text-[11px] text-zinc-400 mb-1.5"
                >
                  میزان فعالیت هفتگی
                </label>
                <select
                  id="tdee-activity-select"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                  className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-xs sm:text-sm text-zinc-100"
                >
                  {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map((level) => (
                    <option key={level} value={level}>
                      {ACTIVITY_LEVEL_LABELS[level].title} — {ACTIVITY_LEVEL_LABELS[level].hint}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] text-zinc-400 mb-1.5">هدف تغذیه‌ای</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(WEIGHT_GOAL_LABELS) as WeightGoal[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setWeightGoal(g)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                        weightGoal === g
                          ? 'bg-emerald-500/14 border-emerald-500/45 text-emerald-300 font-semibold'
                          : 'bg-[#1E1E22] border-[#2A2A31] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {g === 'lose' ? 'کاهش وزن' : g === 'maintain' ? 'تثبیت' : 'افزایش'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Strict 18+ Age Gate or Live Calculation Output */}
            {!tdeeEvaluation.ok ? (
              <div
                data-testid="tdee-underage-block"
                className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3.5 text-xs text-rose-300 leading-relaxed"
              >
                {tdeeEvaluation.error}
              </div>
            ) : (
              <div className="card-elevated rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 tabular-nums-fa">
                  <div className="text-xs text-zinc-400">
                    برآورد تقریبی برای شما (BMR: {formatFaNumber(tdeeEvaluation.result.bmr)} · TDEE:{' '}
                    {formatFaNumber(tdeeEvaluation.result.tdee)}):
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span
                      data-testid="tdee-recommended-kcal"
                      className="text-base font-extrabold text-emerald-400"
                    >
                      {formatFaNumber(tdeeEvaluation.result.recommendedGoals.dailyKcal)} کالری
                    </span>
                    <span className="text-sky-400">
                      پروتئین {formatFaNumber(tdeeEvaluation.result.recommendedGoals.proteinGrams)}گ
                    </span>
                    <span className="text-amber-400">
                      کربوهیدرات {formatFaNumber(tdeeEvaluation.result.recommendedGoals.carbsGrams)}گ
                    </span>
                    <span className="text-rose-400">
                      چربی {formatFaNumber(tdeeEvaluation.result.recommendedGoals.fatGrams)}گ
                    </span>
                    <span className="text-cyan-400">
                      آب {formatFaNumber(tdeeEvaluation.result.recommendedGoals.waterGoalGlasses)}{' '}
                      لیوان
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="apply-tdee-goals-btn"
                  onClick={() => {
                    syncInputsAndSave(tdeeEvaluation.result.recommendedGoals)
                    setCalcOpen(false)
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs px-4 py-2.5 transition-colors"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>اعمال به اهداف روزانه</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Daily Goals Manual Editor */}
      <section className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">اهداف روزانه کالری و درشت‌مغذی‌ها</h2>
            <p className="text-[11px] text-zinc-400">
              مقادیر زیر را می‌توانید به صورت دستی یا با الگوهای آماده تنظیم کنید
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {GOAL_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => syncInputsAndSave(p.goals)}
              className={`rounded-xl border px-3 py-2 text-right transition-colors ${
                goals.dailyKcal === p.goals.dailyKcal
                  ? 'bg-emerald-500/12 border-emerald-500/40 text-zinc-100'
                  : 'bg-[#1E1E22] border-[#2A2A31] text-zinc-300 hover:bg-[#25252B]'
              }`}
            >
              <div className="text-xs font-semibold">{p.label}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">{p.sub}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveGoals} className="space-y-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label htmlFor="goal-kcal-input" className="block text-xs text-emerald-400 mb-1.5">
                کالری روزانه
              </label>
              <input
                id="goal-kcal-input"
                type="text"
                inputMode="numeric"
                value={kcalInput}
                onChange={(e) => setKcalInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-emerald-500/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-protein-input" className="block text-xs text-sky-400 mb-1.5">
                پروتئین (گرم)
              </label>
              <input
                id="goal-protein-input"
                type="text"
                inputMode="numeric"
                value={proteinInput}
                onChange={(e) => setProteinInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-sky-400/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-carbs-input" className="block text-xs text-amber-400 mb-1.5">
                کربوهیدرات (گرم)
              </label>
              <input
                id="goal-carbs-input"
                type="text"
                inputMode="numeric"
                value={carbsInput}
                onChange={(e) => setCarbsInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-amber-400/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div>
              <label htmlFor="goal-fat-input" className="block text-xs text-rose-400 mb-1.5">
                چربی (گرم)
              </label>
              <input
                id="goal-fat-input"
                type="text"
                inputMode="numeric"
                value={fatInput}
                onChange={(e) => setFatInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-rose-400/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="goal-water-input" className="block text-xs text-cyan-400 mb-1.5">
                آب (لیوان)
              </label>
              <input
                id="goal-water-input"
                type="text"
                inputMode="numeric"
                value={waterInput}
                onChange={(e) => setWaterInput(e.target.value)}
                className="w-full rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-cyan-400/70 focus:outline-none px-3 py-2.5 text-sm text-zinc-100 tabular-nums-fa"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-emerald-400">
              {savedNotice ? 'اهداف روزانه ذخیره شد.' : ''}
            </span>
            <button
              type="submit"
              id="save-goals-btn"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-sm px-5 py-2.5 transition-colors"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>ذخیره اهداف</span>
            </button>
          </div>
        </form>
      </section>

      {/* Appearance Theme Switcher (Dark default + optional Light mode) */}
      <section className="card-surface rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-100">ظاهر برنامه</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            حالت تاریک پیش‌فرض برای مطالعه راحت شبانه؛ حالت روشن برای نور روز
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A]">
          <button
            type="button"
            id="theme-dark-btn"
            onClick={() => onThemeChange('dark')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-emerald-500 text-[#051B11] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>تاریک</span>
          </button>
          <button
            type="button"
            id="theme-light-btn"
            onClick={() => onThemeChange('light')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              theme === 'light'
                ? 'bg-emerald-500 text-[#051B11] font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>روشن</span>
          </button>
        </div>
      </section>

      {/* Local-first Backup (JSON + CSV) & Storage Persistence Status */}
      <section className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/12 flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">پشتیبان‌گیری و خروجی داده‌ها</h2>
              <p className="text-[11px] text-zinc-400 tabular-nums-fa">
                {formatFaNumber(foodsCount)} غذا · {formatFaNumber(entriesCount)} وعده ثبت‌شده
                {lastBackupAt
                  ? ` · آخرین پشتیبان: ${formatJalaliDate(new Date(lastBackupAt), 'short')}`
                  : ' · هنوز پشتیبان نگرفته‌اید'}
              </p>
            </div>
          </div>

          <span
            data-testid="storage-persistence-badge"
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              persistenceState === 'persisted'
                ? 'bg-emerald-500/12 text-emerald-300'
                : 'bg-[#1E1E22] text-zinc-400'
            }`}
          >
            {persistenceState === 'persisted'
              ? 'حافظه پایدار مرورگر فعال'
              : 'پشتیبان‌گیری هفتگی توصیه می‌شود'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
          <button
            type="button"
            id="export-json-btn"
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-3.5 py-3 text-xs font-semibold text-zinc-100 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>خروجی پشتیبان (JSON)</span>
          </button>

          <button
            type="button"
            id="export-csv-btn"
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-3.5 py-3 text-xs font-semibold text-zinc-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>خروجی اکسل (CSV)</span>
          </button>

          <button
            type="button"
            id="import-json-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-3.5 py-3 text-xs font-semibold text-zinc-100 transition-colors"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>بازیابی از JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {backupMessage && (
          <div
            className={`mt-3 rounded-xl px-3.5 py-2.5 text-xs ${
              backupMessage.type === 'success'
                ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/25'
                : 'bg-rose-500/12 text-rose-300 border border-rose-500/25'
            }`}
          >
            {backupMessage.text}
          </div>
        )}
      </section>

      {/* PWA Install & Offline Status */}
      <section className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-[220px]">
            <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-zinc-100">نصب آفلاین روی موبایل (PWA)</h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    pwaStatus.isOnline
                      ? 'bg-emerald-500/12 text-emerald-300'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {pwaStatus.isOnline ? 'فونت و اجرا ۱۰۰٪ آفلاین' : 'در حال اجرا در حالت آفلاین'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {pwaStatus.isInstalled
                  ? 'برنامه روی دستگاه شما نصب شده است و بدون نیاز به اینترنت یا سرور خارجی کار می‌کند.'
                  : 'فونت وزیرمتن و تمام داده‌های برنامه به‌صورت محلی میزبانی می‌شوند. در آیفون از منوی Share گزینه Add to Home Screen و در اندروید یا کروم دکمه نصب را بزنید.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pwaStatus.hasUpdate && (
              <button
                type="button"
                onClick={pwaStatus.applyUpdate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-[#1A1202] font-bold text-xs px-3.5 py-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>به‌روزرسانی نسخه</span>
              </button>
            )}
            {pwaStatus.canInstall && (
              <button
                type="button"
                id="pwa-install-btn"
                onClick={() => void pwaStatus.promptInstall()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs px-4 py-2.5 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>نصب اپلیکیشن</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Privacy, Health Disclaimer, Nutrition Sources & MIT License */}
      <section
        id="privacy-and-health-section"
        data-testid="privacy-and-health-card"
        className="card-surface rounded-2xl p-4 sm:p-5 space-y-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              حریم خصوصی، منابع علمی و مجوز انتشار
            </h2>
            <p className="text-[11px] text-zinc-400">نسخه ۱.۰.۰ — متن‌باز با مجوز MIT</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
          <p>
            <strong className="text-zinc-100">حریم خصوصی ۱۰۰٪ محلی:</strong> تمام وعده‌ها، اهداف،
            وزن و غذاهای شخصی شما فقط در حافظه همین مرورگر (`localStorage`) ذخیره می‌شوند. هیچ
            ثبت‌نامی وجود ندارد، هیچ اطلاعاتی به سرور ارسال نمی‌شود و هیچ کوکی تبلیغاتی یا ردیابی
            استفاده نمی‌شود.
          </p>
          <p>
            <strong className="text-zinc-100">سلب مسئولیت پزشکی:</strong>{' '}
            {HEALTH_DISCLAIMERS.educationalNotice} {HEALTH_DISCLAIMERS.specialGroupsWarning}
          </p>
          <div>
            <strong className="text-zinc-100">منابع ارزش‌های غذایی (تقریبی):</strong>
            <ul className="list-disc list-inside text-zinc-400 mt-1 space-y-0.5">
              {NUTRITION_DATA_SOURCES.detailedSources.map((src) => (
                <li key={src}>{src}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Safe Reset Controls */}
      <section className="card-surface rounded-2xl p-4 sm:p-5 space-y-3">
        <h2 className="text-xs font-semibold text-zinc-400">مدیریت داده‌های محلی</h2>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="text-xs text-zinc-300">
            بازگردانی غذاهای پیش‌فرض (غذاهای شخصی حفظ می‌شوند)
          </div>
          {!confirmResetFoods ? (
            <button
              type="button"
              onClick={() => setConfirmResetFoods(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E1E22] hover:bg-[#27272D] border border-[#2C2C33] px-3 py-1.5 text-xs text-zinc-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازگردانی</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDefaultFoods()
                  setConfirmResetFoods(false)
                  setBackupMessage({
                    type: 'success',
                    text: 'بانک غذاهای پیش‌فرض بازگردانی شد.',
                  })
                }}
                className="rounded-xl bg-amber-500 text-[#1A1202] font-bold px-3 py-1.5 text-xs"
              >
                تایید بازگردانی
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetFoods(false)}
                className="rounded-xl bg-[#25252B] text-zinc-300 px-3 py-1.5 text-xs"
              >
                لغو
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#222227]">
          <div className="text-xs text-zinc-300">
            پاک کردن تمام وعده‌ها، گزارش آب و وزن‌های ثبت‌شده
          </div>
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 text-xs text-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاک‌سازی تاریخچه</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAllEntries()
                  setConfirmClear(false)
                }}
                className="rounded-xl bg-rose-500 text-white font-bold px-3 py-1.5 text-xs"
              >
                بله، پاک شود
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-xl bg-[#25252B] text-zinc-300 px-3 py-1.5 text-xs"
              >
                انصراف
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
