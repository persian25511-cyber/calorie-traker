import { useId, useState } from 'react'
import { formatFaNumber } from '../../utils/persianFormat'

export interface CalorieBarPoint {
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

interface CalorieBarChartProps {
  data: CalorieBarPoint[]
  goalKcal: number
  maxAxisKcal: number
  rangeDays: 7 | 30
  onSelectDate?: (dateKey: string) => void
}

/**
 * Lightweight, dependency-free responsive SVG Calorie Bar Chart (replaces 455 KB Recharts bundle).
 * Supports 7-day & 30-day modes, goal reference line, keyboard/touch tooltips, and click-to-jump.
 */
export function CalorieBarChart({
  data,
  goalKcal,
  maxAxisKcal,
  rangeDays,
  onSelectDate,
}: CalorieBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const W = 640
  const H = 240
  const padLeft = 48
  const padRight = 14
  const padTop = 18
  const padBottom = 32
  const plotW = W - padLeft - padRight
  const plotH = H - padTop - padBottom

  const safeMax = Math.max(maxAxisKcal, goalKcal, 500)
  const yTicks = [0, Math.round(safeMax / 2), safeMax]
  const yFor = (val: number) => padTop + plotH - Math.min(1, Math.max(0, val / safeMax)) * plotH
  const goalY = yFor(goalKcal)

  const count = Math.max(1, data.length)
  const slotW = plotW / count
  const barW = rangeDays === 7 ? Math.min(36, slotW * 0.56) : Math.min(13, slotW * 0.68)

  const activePoint = activeIndex !== null ? data[activeIndex] ?? null : null
  const activeDiff = activePoint ? activePoint.kcal - goalKcal : 0

  return (
    <div
      dir="ltr"
      className="relative w-full h-64 sm:h-72 select-none"
      data-testid="weekly-bar-chart"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full overflow-visible"
        role="img"
        aria-label="نمودار میله‌ای روند کالری"
      >
        {/* Horizontal Grid Lines & Y-Axis Ticks */}
        {yTicks.map((tick) => {
          const y = yFor(tick)
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={y}
                y2={y}
                stroke="var(--chart-grid)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="#A1A1AA"
                fontSize="11"
                fontFamily="Vazirmatn Variable, sans-serif"
              >
                {formatFaNumber(tick)}
              </text>
            </g>
          )
        })}

        {/* Daily Goal Dashed Reference Line */}
        <line
          x1={padLeft}
          x2={W - padRight}
          y1={goalY}
          y2={goalY}
          stroke="#F59E0B"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />

        {/* Bars & X-Axis Labels */}
        {data.map((entry, idx) => {
          const cx = padLeft + idx * slotW + slotW / 2
          const barH =
            entry.kcal > 0 ? Math.max(6, (Math.min(entry.kcal, safeMax) / safeMax) * plotH) : 4
          const y = padTop + plotH - barH
          const isOver = entry.kcal > goalKcal

          let fill = 'var(--chart-empty-bar)'
          if (entry.kcal > 0) {
            fill = isOver
              ? entry.isToday
                ? '#FBBF24'
                : '#D97706'
              : entry.isToday
                ? '#10B981'
                : '#059669'
          }

          const showLabel = rangeDays === 7 || idx % 5 === 0 || idx === count - 1
          const isHovered = activeIndex === idx

          return (
            <g
              key={entry.dateKey}
              className="cursor-pointer"
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => {
                setActiveIndex(idx)
                onSelectDate?.(entry.dateKey)
              }}
            >
              {/* Invisible full-height touch/hover column hit target */}
              <rect
                x={padLeft + idx * slotW}
                y={padTop}
                width={slotW}
                height={plotH}
                fill={isHovered ? 'rgba(16, 185, 129, 0.07)' : 'transparent'}
                rx="6"
              />
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={barH}
                rx={rangeDays === 7 ? 6 : 3}
                fill={fill}
              />
              {showLabel && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fill={entry.isToday ? '#34D399' : '#A1A1AA'}
                  fontSize="11"
                  fontWeight={entry.isToday ? '700' : '400'}
                  fontFamily="Vazirmatn Variable, sans-serif"
                >
                  {entry.axisLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Floating RTL Persian Tooltip */}
      {activePoint && (
        <div
          dir="rtl"
          className="pointer-events-none absolute top-2 right-3 z-10 rounded-xl bg-[var(--bg-surface)]/95 backdrop-blur border border-[var(--border-elevated)] px-3 py-2 shadow-xl text-xs"
        >
          <div className="font-semibold text-zinc-100 mb-0.5">
            {activePoint.isToday
              ? `امروز (${activePoint.jalaliShort})`
              : activePoint.jalaliFull}
          </div>
          <div className="flex items-center justify-between gap-3 tabular-nums-fa">
            <span className="text-zinc-400">کالری تقریبی:</span>
            <span
              className={`font-bold ${
                activePoint.kcal > goalKcal ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {formatFaNumber(activePoint.kcal)} کالری
            </span>
          </div>
          {activePoint.kcal > 0 && (
            <div className="mt-1 pt-1 border-t border-[#26262C] flex items-center gap-2.5 text-[11px] tabular-nums-fa">
              <span className="text-sky-400">پ: {formatFaNumber(activePoint.protein, 1)}گ</span>
              <span className="text-amber-400">ک: {formatFaNumber(activePoint.carbs, 1)}گ</span>
              <span className="text-rose-400">چ: {formatFaNumber(activePoint.fat, 1)}گ</span>
            </div>
          )}
          <div className="mt-0.5 text-[10px] text-zinc-400 tabular-nums-fa">
            {activePoint.kcal === 0
              ? 'بدون ثبت در این روز'
              : activeDiff > 0
                ? `${formatFaNumber(activeDiff)} کالری بالاتر از محدوده هدف`
                : `${formatFaNumber(Math.abs(activeDiff))} کالری کمتر از سقف هدف`}
          </div>
        </div>
      )}
    </div>
  )
}

export interface WeightLinePoint {
  dateKey: string
  weightKg: number
  jalaliShort: string
  jalaliFull: string
}

interface WeightLineChartProps {
  points: WeightLinePoint[]
}

/**
 * Lightweight, dependency-free SVG Weight Trend Line Chart with area fill & interactive dots.
 */
export function WeightLineChart({ points }: WeightLineChartProps) {
  const gradId = useId()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  if (points.length < 2) return null

  const W = 640
  const H = 175
  const padLeft = 46
  const padRight = 16
  const padTop = 16
  const padBottom = 28
  const plotW = W - padLeft - padRight
  const plotH = H - padTop - padBottom

  const weights = points.map((p) => p.weightKg)
  const minW = Math.floor(Math.min(...weights) - 1)
  const maxW = Math.ceil(Math.max(...weights) + 1)
  const span = Math.max(2, maxW - minW)

  const xFor = (idx: number) => padLeft + (idx / (points.length - 1)) * plotW
  const yFor = (val: number) => padTop + plotH - ((val - minW) / span) * plotH

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.weightKg), pt: p }))
  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${padTop + plotH} L ${coords[0].x.toFixed(1)} ${padTop + plotH} Z`

  const yTicks = [minW, Math.round(((minW + maxW) / 2) * 10) / 10, maxW]
  const activeCoord = activeIdx !== null ? coords[activeIdx] ?? null : null

  return (
    <div
      dir="ltr"
      className="relative w-full h-44 select-none"
      data-testid="weight-progress-chart"
      onMouseLeave={() => setActiveIdx(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full overflow-visible"
        role="img"
        aria-label="نمودار خطی روند وزن"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = yFor(tick)
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={y}
                y2={y}
                stroke="var(--chart-grid)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="#A1A1AA"
                fontSize="11"
                fontFamily="Vazirmatn Variable, sans-serif"
              >
                {formatFaNumber(tick, 1)}
              </text>
            </g>
          )
        })}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((c, idx) => {
          const showTick =
            points.length <= 7 || idx === 0 || idx === points.length - 1 || idx % 4 === 0
          return (
            <g
              key={c.pt.dateKey}
              className="cursor-pointer"
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={() => setActiveIdx(idx)}
            >
              <circle cx={c.x} cy={c.y} r={12} fill="transparent" />
              <circle
                cx={c.x}
                cy={c.y}
                r={activeIdx === idx ? 6 : 4}
                fill={activeIdx === idx ? '#7DD3FC' : '#38BDF8'}
              />
              {showTick && (
                <text
                  x={c.x}
                  y={H - 6}
                  textAnchor="middle"
                  fill="#A1A1AA"
                  fontSize="10.5"
                  fontFamily="Vazirmatn Variable, sans-serif"
                >
                  {c.pt.jalaliShort}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {activeCoord && (
        <div
          dir="rtl"
          className="pointer-events-none absolute top-2 right-3 rounded-xl bg-[var(--bg-surface)]/95 border border-[var(--border-elevated)] px-3 py-1.5 shadow-xl text-xs tabular-nums-fa"
        >
          <div className="text-zinc-400 text-[11px]">{activeCoord.pt.jalaliFull}</div>
          <div className="text-sky-400 font-bold">
            {formatFaNumber(activeCoord.pt.weightKg, 1)} کیلوگرم
          </div>
        </div>
      )}
    </div>
  )
}
