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

const MAX_SERIES = 8

const CHART_HEIGHT = 360

export interface CostScanChartProps {
  results: ModelCostRange[]
  usageRange: UsageRange
}

export function CostScanChart({ results, usageRange }: CostScanChartProps) {
  const series = React.useMemo(() => results.slice(0, MAX_SERIES), [results])
  const hiddenCount = results.length - series.length
  const data = React.useMemo(
    () => buildScanData(series, usageRange),
    [series, usageRange]
  )

  const { minRate, maxRate } = usageRange

  const hasBand = !(minRate === 0 && maxRate === 100)

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    series.forEach((item, index) => {
      config[seriesKey(index)] = {
        label: item.source ? `${item.name}（${item.source}）` : item.name,
        color: chartColor(index),
      }
    })
    return config
  }, [series])

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
              stroke={chartColor(index)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ChartContainer>

      {/* 自绘图例：recharts 的图例放不下 8 个长模型名，这里自己排版并顺带标出来源。 */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {series.map((item, index) => (
          <li key={item.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ background: chartColor(index) }}
            />
            <span
              className="text-foreground"
              title={item.source ? `${item.name}（${item.source}）` : item.name}
            >
              {truncateByWidth(item.name, 24)}
            </span>
            {item.source ? (
              <span className="text-muted-foreground">
                {truncateByWidth(item.source, 12)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        {hasBand
          ? `横轴为缓存命中率，阴影带即当前设置的区间（${minRate}% ～ ${maxRate}%）；`
          : "横轴为缓存命中率；当前区间已是 0% ～ 100% 的完整范围，阴影带会盖满整张图，所以未绘制，拖动上方滑块缩小区间即可看到；"}
        两条线交叉的位置表示在该命中率下 两者成本持平。
        {hiddenCount > 0
          ? ` 另有 ${hiddenCount} 个模型未显示，此处只画最坏情况最低的 ${MAX_SERIES} 个。`
          : null}
      </p>
    </div>
  )
}
