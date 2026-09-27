import * as React from "react"
import {
  CartesianGrid,
  Cell,
  LabelList,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipContentProps,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  buildScatterData,
  chartColor,
  type ScatterDatum,
} from "@/lib/chart-data"
import { formatMoney, formatMoneyCompact } from "@/lib/format"
import type { ModelCostRange } from "@/lib/types"
import { cn } from "@/lib/utils"

const chartConfig = {
  worstCost: { label: "最坏情况", color: chartColor(0) },
} satisfies ChartConfig

const CHART_HEIGHT = 380

const Z_RANGE: [number, number] = [70, 520]

export interface CostScatterChartProps {
  results: ModelCostRange[]
}

export function CostScatterChart({ results }: CostScatterChartProps) {
  const data = React.useMemo(() => buildScatterData(results), [results])
  const mergedGroups = data.filter((datum) => datum.count > 1).length

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: CHART_HEIGHT }}
      >
        <ScatterChart margin={{ top: 12, right: 24, bottom: 8 }}>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="normalPrice"
            name="输入价"
            tickFormatter={formatMoneyCompact}
            tickLine={false}
            axisLine={false}
            label={{
              value: "输入价格（元 / 1M）",
              position: "insideBottom",
              offset: -4,
              className: "fill-muted-foreground text-xs",
            }}
          />
          <YAxis
            type="number"
            dataKey="outputPrice"
            name="输出价"
            width={76}
            tickFormatter={formatMoneyCompact}
            tickLine={false}
            axisLine={false}
            label={{
              value: "输出价格（元 / 1M）",
              angle: -90,
              position: "insideLeft",
              className: "fill-muted-foreground text-xs",
            }}
          />
          <ZAxis type="number" dataKey="worstCost" range={Z_RANGE} />
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={ScatterTooltipContent}
          />
          {/*
           * 一个 Scatter 承载全部点，靠 Cell 逐个上色：含最优模型的那组单独高亮。
           * 关闭动画：recharts 在入场动画结束前不渲染 LabelList，
           * 而页面处于后台时 rAF 会被节流、动画永不结束，×N 角标就永远不出现。
           */}
          <Scatter
            name="模型"
            data={data}
            fill={chartColor(0)}
            isAnimationActive={false}
          >
            {data.map((datum) => (
              <Cell
                key={datum.id}
                fill={datum.containsBest ? "var(--chart-2)" : chartColor(0)}
                fillOpacity={datum.containsBest ? 0.85 : 0.5}
              />
            ))}
            {/* 坐标重合的模型已被合并，靠角标告知“一个点代表几个模型”。 */}
            <LabelList
              dataKey="count"
              position="top"
              offset={4}
              className="fill-muted-foreground text-[10px] font-medium"
              formatter={(value) =>
                Number(value) > 1 ? `×${String(value)}` : ""
              }
            />
          </Scatter>
        </ScatterChart>
      </ChartContainer>

      <p className="text-xs text-muted-foreground">
        气泡大小表示最坏情况总成本，
        <span className="mx-1 inline-flex items-center gap-1">
          <span
            className="size-2.5 rounded-full"
            style={{ background: "var(--chart-2)", opacity: 0.85 }}
          />
          最坏情况最低
        </span>
        。越靠左下角价格越便宜；输入与输出轴的位置差异说明价格结构不同。
        {mergedGroups > 0
          ? ` 带 ×N 的气泡表示有 N 个模型价格完全相同，悬停可查看全部。`
          : null}
      </p>
    </div>
  )
}

function ScatterTooltipContent({ active, payload }: TooltipContentProps) {
  const datum = payload?.[0]?.payload as ScatterDatum | undefined
  if (!active || !datum) return null

  if (datum.count === 1) {
    const [member] = datum.members
    return (
      <ScatterTooltipShell>
        <ScatterHeading name={member.name} source={member.source} />
        <ScatterRow label="输入" value={formatMoney(datum.normalPrice)} />
        <ScatterRow label="缓存输入" value={formatMoney(member.cachedPrice)} />
        <ScatterRow label="输出" value={formatMoney(datum.outputPrice)} />
        <ScatterRow
          label="最坏情况"
          value={formatMoney(member.worstCost)}
          strong
        />
      </ScatterTooltipShell>
    )
  }

  return (
    <ScatterTooltipShell>
      <div className="font-medium">{datum.count} 个模型价格完全相同</div>
      <ScatterRow label="输入" value={formatMoney(datum.normalPrice)} />
      <ScatterRow label="输出" value={formatMoney(datum.outputPrice)} />
      <div className="grid gap-1.5 border-t border-border/50 pt-1.5">
        {datum.members.map((member) => (
          <div key={member.id} className="grid gap-0.5">
            <ScatterHeading
              name={member.name}
              source={member.source}
              isBest={member.isBest}
            />
            <div className="flex items-center justify-between gap-3 text-muted-foreground">
              <span>缓存输入 {formatMoney(member.cachedPrice)}</span>
              <span className="font-mono text-foreground tabular-nums">
                {formatMoney(member.worstCost)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ScatterTooltipShell>
  )
}

/** tooltip 外框，样式与 `ChartTooltipContent` 保持一致。 */
function ScatterTooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid max-w-80 min-w-32 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
      )}
    >
      {children}
    </div>
  )
}

/** tooltip 里的模型名 + 来源，重合组里额外标出最优。 */
function ScatterHeading({
  name,
  source,
  isBest = false,
}: {
  name: string
  source: string
  isBest?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 font-medium">
      <span className="truncate" title={name}>
        {name}
      </span>
      {source ? (
        <span className="shrink-0 font-normal text-muted-foreground">
          {source}
        </span>
      ) : null}
      {isBest ? (
        <span className="shrink-0 rounded-sm bg-secondary px-1 text-[10px] font-normal text-secondary-foreground">
          最优
        </span>
      ) : null}
    </div>
  )
}

/** 散点 tooltip 里的一行「标签 —— 金额」。 */
function ScatterRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? "font-mono font-medium text-foreground tabular-nums"
            : "font-mono tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  )
}
