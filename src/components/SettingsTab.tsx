import {
  Calculator,
  Check,
  ChevronDown,
  Download,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { UserGoals } from '../types/nutrition'
import {
  ACTIVITY_LEVEL_LABELS,
  WEIGHT_GOAL_LABELS,
  calculateRecommendedGoals,
  type ActivityLevel,
  type BiologicalSex,
  type WeightGoal,
} from '../utils/calorieCalculator'
import { formatFaNumber, getLocalDateKey, toAsciiDigits } from '../utils/persianFormat'
import type { PwaStatus } from '../utils/pwa'

interface SettingsTabProps {
  goals: UserGoals
  foodsCount: number
  entriesCount: number
  pwaStatus: PwaStatus
  onUpdateGoals: (goals: UserGoals) => void
  onExportJson: () => string
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

export function SettingsTab({
  goals,
  foodsCount,
  entriesCount,
  pwaStatus,
  onUpdateGoals,
  onExportJson,
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

  // Smart Persian TDEE Calculator state
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

  const tdeePreview = useMemo(() => {
    return calculateRecommendedGoals({
      sex,
      ageYears: parseIntInput(age, 30),
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

  const handleExport = () => {
    const json = onExportJson()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kalorishomar-backup-${getLocalDateKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setBackupMessage({
      type: 'success',
      text: 'فایل پشتیبان با موفقیت دانلود شد.',
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
      {/* Smart Persian TDEE Goal Calculator */}
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
              <h2 className="text-sm font-bold text-zinc-100">
                محاسبه‌گر هوشمند کالری و درشت‌مغذی (TDEE)
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                بر اساس قد، وزن، سن و سطح فعالیت هدف دقیق روزانه را محاسبه کنید
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
            className="px-4 sm:px-5 pb-5 pt-2 border-t border-[#222227] space-y-4 animate-fade-up"
          >
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
                  سن (سال)
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

            {/* Live Calculation Output */}
            <div className="card-elevated rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 tabular-nums-fa">
                <div className="text-xs text-zinc-400">
                  پیشنهاد علمی برای شما (BMR: {formatFaNumber(tdeePreview.bmr)} · TDEE:{' '}
                  {formatFaNumber(tdeePreview.tdee)}):
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span
                    data-testid="tdee-recommended-kcal"
                    className="text-base font-extrabold text-emerald-400"
                  >
                    {formatFaNumber(tdeePreview.recommendedGoals.dailyKcal)} کالری
                  </span>
                  <span className="text-sky-400">
                    پروتئین {formatFaNumber(tdeePreview.recommendedGoals.proteinGrams)}گ
                  </span>
                  <span className="text-amber-400">
                    کربوهیدرات {formatFaNumber(tdeePreview.recommendedGoals.carbsGrams)}گ
                  </span>
                  <span className="text-rose-400">
                    چربی {formatFaNumber(tdeePreview.recommendedGoals.fatGrams)}گ
                  </span>
                  <span className="text-cyan-400">
                    آب {formatFaNumber(tdeePreview.recommendedGoals.waterGoalGlasses)} لیوان
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="apply-tdee-goals-btn"
                onClick={() => {
                  syncInputsAndSave(tdeePreview.recommendedGoals)
                  setCalcOpen(false)
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051B11] font-bold text-xs px-4 py-2.5 transition-colors"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>اعمال به اهداف روزانه</span>
              </button>
            </div>
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

        {/* Presets */}
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

      {/* Local-first Backup & Restore */}
      <section className="card-surface rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/12 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">پشتیبان‌گیری و انتقال اطلاعات (JSON)</h2>
            <p className="text-[11px] text-zinc-400 tabular-nums-fa">
              تمام داده‌ها فقط در دستگاه شما ذخیره می‌شوند ({formatFaNumber(foodsCount)} غذا ·{' '}
              {formatFaNumber(entriesCount)} وعده ثبت‌شده)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          <button
            type="button"
            id="export-json-btn"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-4 py-3 text-xs sm:text-sm font-semibold text-zinc-100 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>خروجی فایل پشتیبان (JSON)</span>
          </button>

          <button
            type="button"
            id="import-json-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2E2E35] px-4 py-3 text-xs sm:text-sm font-semibold text-zinc-100 transition-colors"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>بازیابی از فایل پشتیبان</span>
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
                  {pwaStatus.isOnline ? 'آماده اجرا بدون اینترنت' : 'در حال اجرا در حالت آفلاین'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {pwaStatus.isInstalled
                  ? 'برنامه با موفقیت روی دستگاه شما نصب شده است و بدون اینترنت نیز کار می‌کند.'
                  : 'کالری‌شمار روزمره کاملاً آفلاین و سبک است. در آیفون از منوی Share گزینه Add to Home Screen و در اندروید یا کروم دکمه نصب را بزنید.'}
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
          <div className="text-xs text-zinc-300">پاک کردن تمام وعده‌ها و گزارش آب ثبت‌شده</div>
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
