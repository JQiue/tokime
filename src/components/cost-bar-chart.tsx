import * as React from "react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"

import { createModelTick } from "@/components/model-axis-tick"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { buildIntervalData, type IntervalDatum } from "@/lib/chart-data"
import { formatMoney, formatMoneyCompact, formatRange } from "@/lib/format"
import type { ModelCostRange } from "@/lib/types"

const chartConfig = {
  span: { label: "成本区间", color: "var(--chart-1)" },
} satisfies ChartConfig

const ROW_HEIGHT = 56
const MIN_HEIGHT = 300

export interface CostBarChartProps {
  results: ModelCostRange[]
}

export function CostBarChart({ results }: CostBarChartProps) {
  const data = React.useMemo(() => buildIntervalData(results), [results])
  const renderTick = React.useMemo(() => createModelTick(data), [data])
  const height = Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT)

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <BarChart data={data} layout="vertical" margin={{ right: 24 }}>
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatMoneyCompact(value)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={176}
            interval={0}
            tick={renderTick}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => {
                  const datum = payload?.[0]?.payload as
                    | IntervalDatum
                    | undefined
                  if (!datum) return null
                  return (
                    <span className="flex items-center gap-1.5">
                      {datum.name}
                      {datum.source ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {datum.source}
                        </span>
                      ) : null}
                    </span>
                  )
                }}
                formatter={(value, _name, item) => {
                  const datum = item.payload as IntervalDatum | undefined
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {chartConfig.span.label}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {datum
                          ? formatRange(
                              datum.bestCost,
                              datum.worstCost,
                              formatMoney
                            )
                          : formatMoney(Number(value))}
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {/* 透明底座 + 区间跨度：把「最低 ～ 最高」画成一条浮动条。 */}
          <Bar
            dataKey="bestCost"
            stackId="range"
            fill="transparent"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />
          <Bar
            dataKey="span"
            stackId="range"
            fill="var(--color-span)"
            radius={2}
            barSize={16}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">
        浮动条左端为区间最低成本，右端为最高成本；条越短，说明缓存命中率对该模型总成本的影响越小。
      </p>
    </div>
  )
}
