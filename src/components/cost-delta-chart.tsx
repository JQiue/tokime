import * as React from "react"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import { createModelTick } from "@/components/model-axis-tick"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { buildDeltaData, chartColor } from "@/lib/chart-data"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import type { ModelCostRange } from "@/lib/types"

const chartConfig = {
  extraCost: { label: "多花", color: chartColor(4) },
} satisfies ChartConfig

const ROW_HEIGHT = 56
const MIN_HEIGHT = 300

export interface CostDeltaChartProps {
  results: ModelCostRange[]
}

export function CostDeltaChart({ results }: CostDeltaChartProps) {
  const data = React.useMemo(() => buildDeltaData(results), [results])
  const renderTick = React.useMemo(() => createModelTick(data), [data])
  const height = Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT)
  const baseline = results[0]

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <BarChart data={data} layout="vertical" margin={{ right: 72 }}>
          <XAxis
            type="number"
            tickFormatter={formatMoneyCompact}
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
                indicator="line"
                labelFormatter={(_label, payload) => {
                  const datum = payload?.[0]?.payload as
                    | (typeof data)[number]
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
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">相对最便宜</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {Number(value) === 0
                        ? "基准"
                        : `+${formatMoney(Number(value))}`}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="extraCost"
            fill="var(--color-extraCost)"
            radius={[0, 2, 2, 0]}
            barSize={18}
            // recharts 在动画结束前会隐藏 LabelList，而「柱尾金额」正是这张图的
            // 全部信息量：页面一旦处于后台（rAF 被节流）动画就永不结束，
            // 数字会一直不出现。这里干脆关掉动画。
            isAnimationActive={false}
          >
            {/* 直接把金额写在柱尾，免去逐个悬停。 */}
            <LabelList
              dataKey="extraCost"
              position="right"
              offset={6}
              className="fill-muted-foreground text-xs tabular-nums"
              formatter={(value) =>
                Number(value) === 0
                  ? ""
                  : `+${formatMoneyCompact(Number(value))}`
              }
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      <p className="text-xs text-muted-foreground">
        以
        {baseline
          ? `「${baseline.name}${baseline.source ? `（${baseline.source}）` : ""}」`
          : "最坏情况最低的模型"}
        为基准，柱长是其最坏情况下必须多花的金额（不含基准本身）。
      </p>
    </div>
  )
}
