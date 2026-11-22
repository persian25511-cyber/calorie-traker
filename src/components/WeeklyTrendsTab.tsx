import { BarChart3, Flame, Target, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LoggedFoodEntry, UserGoals } from '../types/nutrition'
import { formatFaNumber, getLastNDays } from '../utils/persianFormat'

interface WeeklyTrendsTabProps {
  entries: LoggedFoodEntry[]
  goals: UserGoals
  streakDays: number
  onSelectDate: (dateKey: string) => void
}

interface DayChartPoint {
  dateKey: string
  weekday: string
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

function WeeklyChartTooltip({ active, payload, goalKcal }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const diff = point.kcal - goalKcal

  return (
    <div
      dir="rtl"
      className="rounded-xl bg-[#161618] border border-[#32323A] px-3.5 py-2.5 shadow-xl text-xs"
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
        <div className="mt-1.5 pt-1.5 border-t border-[#26262A] flex items-center gap-3 text-[11px] tabular-nums-fa">
          <span className="text-sky-400">پ: {formatFaNumber(point.protein, 1)}گ</span>
          <span className="text-amber-400">ک: {formatFaNumber(point.carbs, 1)}گ</span>
          <span className="text-rose-400">چ: {formatFaNumber(point.fat, 1)}گ</span>
        </div>
      )}
      <div className="mt-1 text-[10px] text-zinc-500 tabular-nums-fa">
        {point.kcal === 0
          ? 'ثبتی انجام نشده'
          : diff > 0
            ? `${formatFaNumber(diff)} کالری بیشتر از هدف`
            : `${formatFaNumber(Math.abs(diff))} کالری کمتر از هدف`}
      </div>
    </div>
  )
}

export function WeeklyTrendsTab({
  entries,
  goals,
  streakDays,
  onSelectDate,
}: WeeklyTrendsTabProps) {
  const days = useMemo(() => getLastNDays(7), [])

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
        weekday: slot.isToday ? 'امروز' : slot.weekdayCompact,
        jalaliShort: slot.jalaliShort,
        jalaliFull: slot.jalaliFull,
        isToday: slot.isToday,
        kcal: Math.round(totals.kcal),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      }
    })
  }, [days, entries])

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
          <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums-fa">
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
          <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums-fa">
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
          <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums-fa">
            جمع هفته: {formatFaNumber(stats.totalKcal)}
          </div>
        </div>
      </div>

      {/* 7-Day Calorie Bar Chart */}
      <section className="card-surface rounded-2xl p-4 sm:p-5" aria-label="نمودار کالری ۷ روز اخیر">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">روند کالری ۷ روز اخیر</h2>
              <p className="text-[11px] text-zinc-400">
                برای مشاهده یا ویرایش وعده‌ها روی تاریخ هر روز بزنید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              در محدوده
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              بیش از هدف
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-amber-400" />
              خط هدف
            </span>
          </div>
        </div>

        {/* LTR wrapper keeps Recharts SVG axes and tooltips cleanly positioned */}
        <div dir="ltr" className="w-full h-64 sm:h-72" data-testid="weekly-bar-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 14, right: 8, left: -8, bottom: 4 }}
              barCategoryGap="24%"
            >
              <CartesianGrid stroke="#232329" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="weekday"
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Vazirmatn' }}
                dy={6}
              />
              <YAxis
                domain={[0, stats.maxAxisKcal]}
                axisLine={false}
                tickLine={false}
                width={46}
                tickFormatter={(val: number) => formatFaNumber(val)}
                tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'Vazirmatn' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.035)' }}
                content={<WeeklyChartTooltip goalKcal={goals.dailyKcal} />}
              />
              <ReferenceLine
                y={goals.dailyKcal}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
              <Bar
                dataKey="kcal"
                radius={[8, 8, 2, 2]}
                maxBarSize={38}
                animationDuration={350}
              >
                {chartData.map((entry) => {
                  const isOver = entry.kcal > goals.dailyKcal
                  let fill = '#2A2A31'
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

        {/* Clickable Jalali dates strip aligned directly under the LTR chart bars */}
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
              <div className={d.isToday ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                {d.jalaliShort}
              </div>
              <div className="text-zinc-300 font-medium mt-0.5">
                {d.kcal > 0 ? formatFaNumber(d.kcal) : '—'}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Weekly Macronutrient Percentage Breakdown */}
      <section className="card-surface rounded-2xl p-4 sm:p-5" aria-label="سهم درشت‌مغذی‌ها">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">ترکیب درشت‌مغذی‌های هفته</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              سهم درصدی هر درشت‌مغذی از کل کالری مصرفی
            </p>
          </div>
        </div>

        {!stats.hasMacroData ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            با ثبت اولین وعده، درصد پروتئین، کربوهیدرات و چربی شما در اینجا نمایش داده می‌شود.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Segmented Ratio Bar */}
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

            {/* Macro Cards */}
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
