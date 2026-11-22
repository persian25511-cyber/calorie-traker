import { Check, Copy, Droplets, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import type { MacroValues, UserGoals } from '../types/nutrition'
import { formatFaNumber } from '../utils/persianFormat'

interface DailySummaryCardProps {
  idPrefix?: string
  consumed: MacroValues
  goals: UserGoals
  dayLabel: string
  waterGlasses: number
  onAdjustWater: (delta: number) => void
  onCopyDailyReport: () => Promise<boolean>
}

export function DailySummaryCard({
  idPrefix = 'summary',
  consumed,
  goals,
  dayLabel,
  waterGlasses,
  onAdjustWater,
  onCopyDailyReport,
}: DailySummaryCardProps) {
  const [copied, setCopied] = useState(false)

  const ratio = goals.dailyKcal > 0 ? consumed.kcal / goals.dailyKcal : 0
  const clampedRatio = Math.min(1, Math.max(0, ratio))
  const remaining = goals.dailyKcal - consumed.kcal
  const isOver = remaining < 0

  const waterTarget = goals.waterGoalGlasses || 8
  const waterPct = Math.min(100, Math.round((waterGlasses / waterTarget) * 100))

  // SVG ring geometry
  const size = 164
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clampedRatio)

  const macros = [
    {
      id: 'protein',
      label: 'پروتئین',
      consumed: consumed.protein,
      target: goals.proteinGrams,
      barColor: 'bg-sky-400',
      textColor: 'text-sky-400',
      dotColor: 'bg-sky-400',
    },
    {
      id: 'carbs',
      label: 'کربوهیدرات',
      consumed: consumed.carbs,
      target: goals.carbsGrams,
      barColor: 'bg-amber-400',
      textColor: 'text-amber-400',
      dotColor: 'bg-amber-400',
    },
    {
      id: 'fat',
      label: 'چربی',
      consumed: consumed.fat,
      target: goals.fatGrams,
      barColor: 'bg-rose-400',
      textColor: 'text-rose-400',
      dotColor: 'bg-rose-400',
    },
  ]

  const handleCopy = async () => {
    const ok = await onCopyDailyReport()
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section
      aria-label="خلاصه کالری و درشت‌مغذی‌های روزانه"
      className="card-surface rounded-2xl p-4 sm:p-5"
      data-testid="daily-summary-card"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-100">تراز روزانه</h2>
          <span className="text-xs text-zinc-500">({dayLabel})</span>
        </div>
        <button
          type="button"
          id={`${idPrefix}-copy-daily-report-btn`}
          data-testid="copy-daily-report-btn"
          onClick={handleCopy}
          title="کپی خلاصه گزارش روزانه برای اشتراک‌گذاری"
          className="inline-flex items-center gap-1 rounded-lg bg-[#1E1E22] hover:bg-[#27272E] border border-[#2B2B32] px-2.5 py-1 text-[11px] text-zinc-300 hover:text-emerald-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">کپی شد</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>کپی گزارش</span>
            </>
          )}
        </button>
      </div>

      {/* Ring + Key Calorie Numbers */}
      <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-5">
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
            role="img"
            aria-label={`مصرف ${formatFaNumber(consumed.kcal)} از ${formatFaNumber(goals.dailyKcal)} کالری`}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#242429"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isOver ? '#EF4444' : '#10B981'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
            <span
              data-testid="consumed-kcal"
              className={`text-3xl font-extrabold tracking-tight tabular-nums-fa leading-none ${
                isOver ? 'text-rose-400' : 'text-zinc-50'
              }`}
            >
              {formatFaNumber(consumed.kcal)}
            </span>
            <span className="text-[11px] text-zinc-400 mt-1 tabular-nums-fa">
              از {formatFaNumber(goals.dailyKcal)} کالری
            </span>
            <span
              data-testid="remaining-kcal"
              className={`mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums-fa ${
                isOver
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-emerald-500/12 text-emerald-300'
              }`}
            >
              {isOver
                ? `${formatFaNumber(Math.abs(remaining))} بیش از هدف`
                : `${formatFaNumber(remaining)} مانده`}
            </span>
          </div>
        </div>

        {/* Compact Macro Progress Bars */}
        <div className="w-full space-y-3.5">
          {macros.map((m) => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0
            return (
              <div key={m.id} data-testid={`macro-bar-${m.id}`}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${m.dotColor}`} />
                    <span className="font-medium text-zinc-200">{m.label}</span>
                  </div>
                  <div className="tabular-nums-fa text-zinc-400">
                    <span className={`font-semibold ${m.textColor}`}>
                      {formatFaNumber(m.consumed, 1)}
                    </span>
                    <span className="mx-1 text-zinc-600">/</span>
                    <span>{formatFaNumber(m.target)} گرم</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#242429] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.barColor} transition-all duration-500 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Compact Daily Water Intake Tracker */}
      <div
        className="mt-4 pt-4 border-t border-[#222227]"
        data-testid="water-tracker"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-zinc-200">آب روزانه</span>
            <span
              data-testid="water-count"
              className="text-cyan-400 font-semibold tabular-nums-fa"
            >
              {formatFaNumber(waterGlasses)} / {formatFaNumber(waterTarget)} لیوان
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              id={`${idPrefix}-water-sub-btn`}
              data-testid="water-sub-btn"
              disabled={waterGlasses <= 0}
              onClick={() => onAdjustWater(-1)}
              aria-label="کاهش یک لیوان آب"
              className="w-7 h-7 rounded-lg bg-[#1E1E22] hover:bg-[#282830] disabled:opacity-35 text-zinc-300 flex items-center justify-center transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id={`${idPrefix}-water-add-btn`}
              data-testid="water-add-btn"
              onClick={() => onAdjustWater(1)}
              aria-label="افزودن یک لیوان آب"
              className="inline-flex items-center gap-1 h-7 rounded-lg bg-cyan-500/14 hover:bg-cyan-500/24 text-cyan-300 text-[11px] font-semibold px-2.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>۱ لیوان</span>
            </button>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-[#242429] overflow-hidden">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${waterPct}%` }}
          />
        </div>
      </div>
    </section>
  )
}
