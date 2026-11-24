import { BarChart3, Flame, Plus, Scale, Target, Trash2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LoggedFoodEntry, UserGoals, WeightEntry } from '../types/nutrition'
import {
  dateFromKey,
  formatFaNumber,
  formatJalaliDate,
  getLastNDays,
  getLocalDateKey,
  toAsciiDigits,
} from '../utils/persianFormat'

interface WeeklyTrendsTabProps {
  entries: LoggedFoodEntry[]
  goals: UserGoals
  weights: WeightEntry[]
  streakDays: number
  todayKey?: string
  onSelectDate: (dateKey: string) => void
  onUpsertWeight: (dateKey: string, weightKg: number) => void
  onDeleteWeight: (dateKey: string) => void
}

interface DayChartPoint {
  dateKey: string
  axisLabel: string
  jalaliShort: string
  jalaliFull: string
  isToday: boolean
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: DayChartPoint }>
  goalKcal: number
}

function CalorieChartTooltip({ active, payload, goalKcal }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const diff = point.kcal - goalKcal

  return (
    <div
      dir="rtl"
      className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-elevated)] px-3.5 py-2.5 shadow-xl text-xs"
    >
      <div className="font-semibold text-zinc-100 mb-1">
        {point.isToday ? `امروز (${point.jalaliShort})` : point.jalaliFull}
      </div>
      <div className="flex items-center justify-between gap-4 tabular-nums-fa">
        <span className="text-zinc-400">کالری مصرفی:</span>
        <span
          className={`font-bold ${
            point.kcal > goalKcal ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {formatFaNumber(point.kcal)} کالری
        </span>
      </div>
      {point.kcal > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-[var(--border-subtle)] flex items-center gap-3 text-[11px] tabular-nums-fa">
          <span className="text-sky-400">پ: {formatFaNumber(point.protein, 1)}گ</span>
          <span className="text-amber-400">ک: {formatFaNumber(point.carbs, 1)}گ</span>
          <span className="text-rose-400">چ: {formatFaNumber(point.fat, 1)}گ</span>
        </div>
      )}
      <div className="mt-1 text-[10px] text-zinc-400 tabular-nums-fa">
        {point.kcal === 0
          ? 'ثبتی انجام نشده'
          : diff > 0
            ? `${formatFaNumber(diff)} کالری بیشتر از هدف`
            : `${formatFaNumber(Math.abs(diff))} کالری کمتر از هدف`}
      </div>
    </div>
  )
}

interface WeightTooltipProps {
  active?: boolean
  payload?: Array<{ payload: { jalaliFull: string; weightKg: number } }>
}

function WeightChartTooltip({ active, payload }: WeightTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const pt = payload[0].payload
  return (
    <div
      dir="rtl"
      className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-elevated)] px-3 py-2 shadow-xl text-xs tabular-nums-fa"
    >
      <div className="text-zinc-400 text-[11px]">{pt.jalaliFull}</div>
      <div className="text-sky-400 font-bold mt-0.5">{formatFaNumber(pt.weightKg, 1)} کیلوگرم</div>
    </div>
  )
}

export function WeeklyTrendsTab({
  entries,
  goals,
  weights,
  streakDays,
  todayKey = getLocalDateKey(),
  onSelectDate,
  onUpsertWeight,
  onDeleteWeight,
}: WeeklyTrendsTabProps) {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [weightInput, setWeightInput] = useState('')

  const days = useMemo(() => getLastNDays(rangeDays, dateFromKey(todayKey)), [rangeDays, todayKey])

  const chartData = useMemo<DayChartPoint[]>(() => {
    const totalsByDay = new Map<
      string,
      { kcal: number; protein: number; carbs: number; fat: number }
    >()

    for (const e of entries) {
      const curr = totalsByDay.get(e.dateKey) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      curr.kcal += e.kcal
      curr.protein += e.protein
      curr.carbs += e.carbs
      curr.fat += e.fat
      totalsByDay.set(e.dateKey, curr)
    }

    return days.map((slot) => {
      const totals = totalsByDay.get(slot.dateKey) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      return {
        dateKey: slot.dateKey,
        axisLabel:
          rangeDays === 7
            ? slot.isToday
              ? 'امروز'
              : slot.weekdayCompact
            : slot.jalaliShort,
        jalaliShort: slot.jalaliShort,
        jalaliFull: slot.jalaliFull,
        isToday: slot.isToday,
        kcal: Math.round(totals.kcal),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      }
    })
  }, [days, entries, rangeDays])

  const stats = useMemo(() => {
    const activeDays = chartData.filter((d) => d.kcal > 0)
    const divisor = activeDays.length > 0 ? activeDays.length : 1

    const totalKcal = chartData.reduce((s, d) => s + d.kcal, 0)
    const totalProtein = chartData.reduce((s, d) => s + d.protein, 0)
    const totalCarbs = chartData.reduce((s, d) => s + d.carbs, 0)
    const totalFat = chartData.reduce((s, d) => s + d.fat, 0)

    const avgKcal = activeDays.length > 0 ? Math.round(totalKcal / divisor) : 0
    const avgProtein = activeDays.length > 0 ? Math.round((totalProtein / divisor) * 10) / 10 : 0
    const avgCarbs = activeDays.length > 0 ? Math.round((totalCarbs / divisor) * 10) / 10 : 0
    const avgFat = activeDays.length > 0 ? Math.round((totalFat / divisor) * 10) / 10 : 0

    const withinGoalDays = activeDays.filter((d) => d.kcal <= goals.dailyKcal).length

    const proteinKcal = totalProtein * 4
    const carbsKcal = totalCarbs * 4
    const fatKcal = totalFat * 9
    const macroKcalSum = proteinKcal + carbsKcal + fatKcal

    const proteinPct = macroKcalSum > 0 ? Math.round((proteinKcal / macroKcalSum) * 100) : 0
    const carbsPct = macroKcalSum > 0 ? Math.round((carbsKcal / macroKcalSum) * 100) : 0
    const fatPct = macroKcalSum > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0

    const maxBarKcal = Math.max(
      goals.dailyKcal * 1.15,
      ...chartData.map((d) => d.kcal * 1.12),
      1000,
    )

    return {
      activeDaysCount: activeDays.length,
      totalKcal,
      avgKcal,
      avgProtein,
      avgCarbs,
      avgFat,
      withinGoalDays,
      proteinPct,
      carbsPct,
      fatPct,
      hasMacroData: macroKcalSum > 0,
      maxAxisKcal: Math.ceil(maxBarKcal / 250) * 250,
    }
  }, [chartData, goals.dailyKcal])

  const weightChartPoints = useMemo(() => {
    return weights.slice(-30).map((w) => {
      const d = dateFromKey(w.dateKey)
      return {
        dateKey: w.dateKey,
        weightKg: w.weightKg,
        jalaliShort: formatJalaliDate(d, 'short'),
        jalaliFull: formatJalaliDate(d, 'full'),
      }
    })
  }, [weights])

  const latestWeight = weightChartPoints[weightChartPoints.length - 1] ?? null
  const weightDelta =
    weightChartPoints.length >= 2
      ? Math.round(
          (weightChartPoints[weightChartPoints.length - 1].weightKg -
            weightChartPoints[0].weightKg) *
            10,
        ) / 10
      : null

  const handleSubmitWeight = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = Number(toAsciiDigits(weightInput).replace(/٫/g, '.').trim())
    if (!Number.isFinite(parsed) || parsed < 25 || parsed > 300) return
    onUpsertWeight(todayKey, parsed)
    setWeightInput('')
  }

  return (
    <div className="space-y-4 animate-fade-up" data-testid="weekly-trends-tab">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="card-surface rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400">
            <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>میانگین روزانه</span>
          </div>
          <div
            data-testid="weekly-avg-kcal"
            className="text-lg sm:text-2xl font-extrabold text-zinc-50 mt-1.5 tabular-nums-fa"
          >
            {formatFaNumber(stats.avgKcal)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
            کالری ({formatFaNumber(stats.activeDaysCount)} روز فعال)
          </div>
        </div>

        <div className="card-surface rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400">
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>هدف روزانه</span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-zinc-50 mt-1.5 tabular-nums-fa">
            {formatFaNumber(goals.dailyKcal)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
            {formatFaNumber(stats.withinGoalDays)} روز در محدوده
          </div>
        </div>

        <div className="card-surface rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-400">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>تداوم ثبت</span>
          </div>
          <div
            data-testid="weekly-streak-days"
            className="text-lg sm:text-2xl font-extrabold text-zinc-50 mt-1.5 tabular-nums-fa"
          >
            {formatFaNumber(streakDays)} روز
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
            جمع دوره: {formatFaNumber(stats.totalKcal)}
          </div>
        </div>
      </div>

      {/* 7-Day / 30-Day Calorie Bar Chart */}
      <section
        className="card-surface rounded-2xl p-4 sm:p-5"
        aria-label="نمودار کالری هفتگی و ماهانه"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                روند کالری {rangeDays === 7 ? '۷ روز اخیر' : '۳۰ روز اخیر (ماهانه)'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                برای مشاهده یا ویرایش وعده‌ها روی تاریخ هر روز بزنید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-[#0C0C0D] p-1 border border-[#26262A]">
              <button
                type="button"
                id="range-7d-btn"
                onClick={() => setRangeDays(7)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  rangeDays === 7
                    ? 'bg-emerald-500 text-[#051B11] font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ۷ روزه
              </button>
              <button
                type="button"
                id="range-30d-btn"
                onClick={() => setRangeDays(30)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  rangeDays === 30
                    ? 'bg-emerald-500 text-[#051B11] font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ۳۰ روزه
              </button>
            </div>
          </div>
        </div>

        {/* LTR wrapper keeps Recharts SVG axes and tooltips cleanly positioned */}
        <div dir="ltr" className="w-full h-64 sm:h-72" data-testid="weekly-bar-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 14, right: 8, left: -8, bottom: 4 }}
              barCategoryGap={rangeDays === 7 ? '24%' : '14%'}
            >
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="axisLabel"
                interval={rangeDays === 7 ? 0 : 4}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Vazirmatn Variable' }}
                dy={6}
              />
              <YAxis
                domain={[0, stats.maxAxisKcal]}
                axisLine={false}
                tickLine={false}
                width={46}
                tickFormatter={(val: number) => formatFaNumber(val)}
                tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Vazirmatn Variable' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }}
                content={<CalorieChartTooltip goalKcal={goals.dailyKcal} />}
              />
              <ReferenceLine
                y={goals.dailyKcal}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <Bar
                dataKey="kcal"
                radius={[6, 6, 2, 2]}
                maxBarSize={rangeDays === 7 ? 38 : 14}
                animationDuration={300}
              >
                {chartData.map((entry) => {
                  const isOver = entry.kcal > goals.dailyKcal
                  let fill = 'var(--chart-empty-bar)'
                  if (entry.kcal > 0) {
                    if (isOver) {
                      fill = entry.isToday ? '#F43F5E' : '#E11D48'
                    } else {
                      fill = entry.isToday ? '#10B981' : '#059669'
                    }
                  }
                  return <Cell key={entry.dateKey} fill={fill} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Clickable Jalali dates strip (7-day full row, or recent active days in 30-day mode) */}
        {rangeDays === 7 ? (
          <div
            dir="ltr"
            className="mt-3 pt-3 border-t border-[#222227] grid grid-cols-7 gap-1 text-center pl-10 pr-2"
          >
            {chartData.map((d) => (
              <button
                key={d.dateKey}
                type="button"
                dir="rtl"
                onClick={() => onSelectDate(d.dateKey)}
                title={`مشاهده گزارش ${d.jalaliFull}`}
                className="rounded-lg py-1 px-0.5 hover:bg-[#1E1E24] transition-colors text-[10px] sm:text-[11px] tabular-nums-fa"
              >
                <div className={d.isToday ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                  {d.jalaliShort}
                </div>
                <div className="text-zinc-200 font-medium mt-0.5">
                  {d.kcal > 0 ? formatFaNumber(d.kcal) : '—'}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-[#222227] flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {chartData
              .filter((d) => d.kcal > 0 || d.isToday)
              .reverse()
              .slice(0, 12)
              .map((d) => (
                <button
                  key={d.dateKey}
                  type="button"
                  onClick={() => onSelectDate(d.dateKey)}
                  className="shrink-0 rounded-xl bg-[#1E1E22] hover:bg-[#27272E] border border-[#2C2C33] px-2.5 py-1.5 text-[11px] tabular-nums-fa"
                >
                  <span className={d.isToday ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                    {d.jalaliShort}:
                  </span>{' '}
                  <span className="text-zinc-100 font-semibold">{formatFaNumber(d.kcal)}</span>
                </button>
              ))}
          </div>
        )}
      </section>

      {/* Weight Tracking & Progress Chart */}
      <section
        className="card-surface rounded-2xl p-4 sm:p-5 space-y-4"
        aria-label="ثبت وزن و نمودار پیشرفت"
        data-testid="weight-tracker-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/12 flex items-center justify-center text-sky-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">ثبت وزن و نمودار پیشرفت</h2>
              <p className="text-[11px] text-zinc-400">
                {latestWeight
                  ? `آخرین وزن: ${formatFaNumber(latestWeight.weightKg, 1)} کیلوگرم${
                      weightDelta !== null
                        ? ` (${weightDelta > 0 ? '+' : ''}${formatFaNumber(weightDelta, 1)} کیلوگرم تغییر)`
                        : ''
                    }`
                  : 'وزن خود را به‌صورت هفتگی یا روزانه ثبت کنید'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitWeight} className="flex items-center gap-2">
            <label htmlFor="weight-log-input" className="sr-only">
              وزن امروز به کیلوگرم
            </label>
            <input
              id="weight-log-input"
              type="text"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="وزن (مثلاً ۷۴٫۵)"
              className="w-32 rounded-xl bg-[#0C0C0D] border border-[#2C2C33] focus:border-sky-400/70 focus:outline-none px-3 py-2 text-xs text-zinc-100 tabular-nums-fa"
            />
            <button
              type="submit"
              id="save-weight-btn"
              className="inline-flex items-center gap-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-[#041824] font-bold text-xs px-3 py-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت وزن</span>
            </button>
          </form>
        </div>

        {weightChartPoints.length >= 2 && (
          <div dir="ltr" className="w-full h-44" data-testid="weight-progress-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartPoints} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="jalaliShort"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Vazirmatn Variable' }}
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => formatFaNumber(v, 1)}
                  tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Vazirmatn Variable' }}
                />
                <Tooltip content={<WeightChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38BDF8', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#7DD3FC' }}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {weightChartPoints.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {weightChartPoints
              .slice()
              .reverse()
              .slice(0, 6)
              .map((w) => (
                <div
                  key={w.dateKey}
                  data-testid="weight-entry-pill"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E1E22] border border-[#2B2B32] px-2.5 py-1.5 text-xs tabular-nums-fa"
                >
                  <span className="text-zinc-400">{w.jalaliShort}:</span>
                  <span className="font-bold text-sky-400">{formatFaNumber(w.weightKg, 1)} ک‌گ</span>
                  <button
                    type="button"
                    aria-label={`حذف وزن ${w.jalaliShort}`}
                    onClick={() => onDeleteWeight(w.dateKey)}
                    className="text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Macronutrient Percentage Breakdown */}
      <section className="card-surface rounded-2xl p-4 sm:p-5" aria-label="سهم درشت‌مغذی‌ها">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              ترکیب درشت‌مغذی‌های {rangeDays === 7 ? 'هفته' : 'ماه'}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              سهم درصدی هر درشت‌مغذی از کل کالری مصرفی (تقریبی)
            </p>
          </div>
        </div>

        {!stats.hasMacroData ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            با ثبت اولین وعده، درصد پروتئین، کربوهیدرات و چربی شما در اینجا نمایش داده می‌شود.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-[#242429]">
              <div
                style={{ width: `${stats.proteinPct}%` }}
                className="bg-sky-400 transition-all duration-500"
                title={`پروتئین ${formatFaNumber(stats.proteinPct)}٪`}
              />
              <div
                style={{ width: `${stats.carbsPct}%` }}
                className="bg-amber-400 transition-all duration-500"
                title={`کربوهیدرات ${formatFaNumber(stats.carbsPct)}٪`}
              />
              <div
                style={{ width: `${stats.fatPct}%` }}
                className="bg-rose-400 transition-all duration-500"
                title={`چربی ${formatFaNumber(stats.fatPct)}٪`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="card-elevated rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>پروتئین</span>
                </div>
                <div className="text-lg font-bold text-sky-400 mt-1 tabular-nums-fa">
                  {formatFaNumber(stats.proteinPct)}٪
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
                  میانگین {formatFaNumber(stats.avgProtein, 1)} گرم
                </div>
              </div>

              <div className="card-elevated rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>کربوهیدرات</span>
                </div>
                <div className="text-lg font-bold text-amber-400 mt-1 tabular-nums-fa">
                  {formatFaNumber(stats.carbsPct)}٪
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
                  میانگین {formatFaNumber(stats.avgCarbs, 1)} گرم
                </div>
              </div>

              <div className="card-elevated rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>چربی</span>
                </div>
                <div className="text-lg font-bold text-rose-400 mt-1 tabular-nums-fa">
                  {formatFaNumber(stats.fatPct)}٪
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 tabular-nums-fa">
                  میانگین {formatFaNumber(stats.avgFat, 1)} گرم
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
