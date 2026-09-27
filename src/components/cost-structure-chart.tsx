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
import {
  buildStructureData,
  chartColor,
  type StructureEnd,
} from "@/lib/chart-data"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import type { ModelCostRange } from "@/lib/types"
import { cn } from "@/lib/utils"

const chartConfig = {
  normalInputCost: { label: "输入", color: chartColor(0) },
  cachedInputCost: { label: "缓存输入", color: chartColor(1) },
  outputCost: { label: "输出", color: chartColor(2) },
} satisfies ChartConfig

/** 按 dataKey 取系列标签，避免和 chartConfig 里的文案重复维护。 */
function seriesLabel(key: string): string {
  return key in chartConfig
    ? chartConfig[key as keyof typeof chartConfig].label
    : key
}

const ROW_HEIGHT = 56
const MIN_HEIGHT = 300

/** 堆叠口径选项。文案给的是「情况」而不是「端点」，更贴近用户关心的东西。 */
const END_OPTIONS = [
  { value: "max", label: "最坏情况", hint: "命中率区间上限" },
  { value: "min", label: "最好情况", hint: "命中率区间下限" },
] as const

export interface CostStructureChartProps {
  /** 已按最坏情况总成本升序排列的成本区间。 */
  results: ModelCostRange[]
}

export function CostStructureChart({ results }: CostStructureChartProps) {
  const [end, setEnd] = React.useState<StructureEnd>("max")

  const data = React.useMemo(
    () => buildStructureData(results, end),
    [results, end]
  )
  const renderTick = React.useMemo(() => createModelTick(data), [data])
  const height = Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT)

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="堆叠口径"
        className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-[3px]"
      >
        {END_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={end === option.value}
            title={option.hint}
            onClick={() => setEnd(option.value)}
            className={cn(
              "rounded-md px-2.5 py-0.5 text-sm font-medium transition-colors",
              end === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <BarChart data={data} layout="vertical" margin={{ right: 24 }}>
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
            dataKey="normalInputCost"
            stackId="cost"
            fill="var(--color-normalInputCost)"
            barSize={18}
          />
          <Bar
            dataKey="cachedInputCost"
            stackId="cost"
            fill="var(--color-cachedInputCost)"
            barSize={18}
          />
          <Bar
            dataKey="outputCost"
            stackId="cost"
            fill="var(--color-outputCost)"
            // 堆叠条只有最外侧一段需要圆角，否则内部会出现刀口。
            radius={[0, 2, 2, 0]}
            barSize={18}
          />
        </BarChart>
      </ChartContainer>

      <p className="text-xs text-muted-foreground">
        按「{END_OPTIONS.find((option) => option.value === end)?.label}
        」的口径拆解；切换口径可以看到缓存在两种极端下的成本转移。
      </p>
    </div>
  )
}
