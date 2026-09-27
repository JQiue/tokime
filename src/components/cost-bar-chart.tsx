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
import { buildIntervalData } from "@/lib/chart-data"
import { formatMoney } from "@/lib/format"
import type { ModelCostRange } from "@/lib/types"

const chartConfig = {
  bestCost: { label: "区间最低", color: "var(--chart-1)" },
  worstCost: { label: "区间最高", color: "var(--chart-2)" },
} satisfies ChartConfig

function seriesLabel(key: string): string {
  return key in chartConfig
    ? chartConfig[key as keyof typeof chartConfig].label
    : key
}

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
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart data={data} layout="vertical" margin={{ right: 24 }}>
        <XAxis
          type="number"
          tickFormatter={(value: number) => formatMoney(value)}
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
                  (typeof data)[number] | undefined
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
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {seriesLabel(String(name))}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatMoney(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="bestCost"
          fill="var(--color-bestCost)"
          radius={2}
          barSize={14}
        />
        <Bar
          dataKey="worstCost"
          fill="var(--color-worstCost)"
          radius={2}
          barSize={14}
        />
      </BarChart>
    </ChartContainer>
  )
}
