import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts"

import { truncateByWidth } from "@/components/model-axis-tick"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { buildScanData, chartColor, seriesKey } from "@/lib/chart-data"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import type { ModelCostRange, UsageRange } from "@/lib/types"
import { cn } from "@/lib/utils"

const DEFAULT_SERIES = 8

const CHART_HEIGHT = 360

export interface CostScanChartProps {
  results: ModelCostRange[]
  usageRange: UsageRange
}

export function CostScanChart({ results, usageRange }: CostScanChartProps) {
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(results.slice(0, DEFAULT_SERIES).map((item) => item.id))
  )

  // 模型增删后，选中集合里可能残留已失效的 id；渲染时过滤即可。
  // 一个有效项都不剩时回退到前 8 个。这样无需在 effect 里 setState。
  const effectiveSelected = React.useMemo(() => {
    const valid = new Set(results.map((item) => item.id))
    const next = new Set([...selectedIds].filter((id) => valid.has(id)))
    if (next.size === 0) {
      results.slice(0, DEFAULT_SERIES).forEach((item) => next.add(item.id))
    }
    return next
  }, [results, selectedIds])

  const series = React.useMemo(
    () => results.filter((item) => effectiveSelected.has(item.id)),
    [results, effectiveSelected]
  )

  const { minRate, maxRate } = usageRange

  const hasBand = !(minRate === 0 && maxRate === 100)

  const colorIndex = React.useMemo(() => {
    const map = new Map<string, number>()
    results.forEach((item, index) => map.set(item.id, index))
    return map
  }, [results])

  const data = React.useMemo(
    () => buildScanData(series, usageRange),
    [series, usageRange]
  )

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    series.forEach((item, index) => {
      config[seriesKey(index)] = {
        label: item.source ? `${item.name}（${item.source}）` : item.name,
        color: chartColor(colorIndex.get(item.id) ?? index),
      }
    })
    return config
  }, [series, colorIndex])

  function toggleSeries(id: string) {
    const next = new Set(effectiveSelected)
    if (next.has(id)) {
      // 至少保留一条曲线。
      if (next.size === 1) return
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: CHART_HEIGHT }}
      >
        <LineChart data={data} margin={{ top: 8, right: 16 }}>
          <CartesianGrid vertical={false} />
          {/*
           * 阴影带标出用户设置的命中率区间。
           * 填充色用 `--border` 而不是 `--muted`：后者是 oklch(0.97)，
           * 叠在白卡片上几乎与底色无异，等于看不见；`--border`（oklch 0.922）
           * 才能和「区间外」拉开对比。
           */}
          {hasBand ? (
            <ReferenceArea
              x1={minRate}
              x2={maxRate}
              fill="var(--border)"
              // 必须显式给 1：recharts 的 ReferenceArea 默认 fillOpacity 是 0.5，
              // 半透明的 --border 叠在白卡片上会淡到与网格线同色，等于没画。
              fillOpacity={1}
              strokeOpacity={0}
            />
          ) : null}
          <XAxis
            type="number"
            dataKey="rate"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="number"
            width={76}
            tickFormatter={formatMoneyCompact}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(label) => `缓存命中率 ${String(label)}%`}
                formatter={(value, _name, item) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ background: item.color }}
                      />
                      {chartConfig[String(item.dataKey)]?.label ??
                        String(item.dataKey)}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatMoney(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          {series.map((item, index) => (
            <Line
              key={item.id}
              type="linear"
              dataKey={seriesKey(index)}
              stroke={chartColor(colorIndex.get(item.id) ?? index)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>

      {/*
       * 自绘图例：recharts 的图例放不下长模型名，这里自己排版并顺带标出来源。
       * 每个标签可点击切换，模型很多时也能看任意一条曲线。
       */}
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
        {results.map((item) => {
          const index = colorIndex.get(item.id) ?? 0
          const active = effectiveSelected.has(item.id)
          const label = item.source
            ? `${item.name}（${item.source}）`
            : item.name
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              title={active ? `隐藏 ${label}` : `显示 ${label}`}
              onClick={() => toggleSeries(item.id)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                active
                  ? "bg-background text-foreground hover:bg-muted"
                  : "text-muted-foreground opacity-60 hover:opacity-100"
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ background: chartColor(index) }}
              />
              <span className="truncate">{truncateByWidth(item.name, 24)}</span>
              {item.source ? (
                <span className="shrink-0 text-muted-foreground">
                  {truncateByWidth(item.source, 12)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {hasBand
          ? `横轴为缓存命中率，阴影带即当前设置的区间（${minRate}% ～ ${maxRate}%）；`
          : "横轴为缓存命中率；当前区间已是 0% ～ 100% 的完整范围，阴影带会盖满整张图，所以未绘制，拖动上方滑块缩小区间即可看到；"}
        任意两条曲线交叉的位置表示在该命中率下两个模型成本持平。当前显示{" "}
        {series.length} 条曲线
        {results.length > series.length
          ? `，另有 ${results.length - series.length} 个模型未选中，点击图例即可切换。`
          : "，点击图例可以隐藏或显示曲线。"}
      </p>
    </div>
  )
}
