import { ArrowDown } from "lucide-react"

import { formatMoney } from "@/lib/format"
import type { ModelCostRange } from "@/lib/types"

export interface CostSummaryBarProps {
  results: ModelCostRange[]
  /** 当前输入有误、展示的是上一条有效结果。 */
  stale?: boolean
}

/**
 * 窄屏顶部常驻摘要：调整场景或价格时不用滚到底部就能看到最优结果变化。
 * 宽屏改为左右分栏，本组件隐藏。
 */
export function CostSummaryBar({ results, stale }: CostSummaryBarProps) {
  const best = results[0]
  if (!best) return null

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">
            {stale
              ? "上次有效结果 · 当前输入待修正"
              : `当前最优 · ${results.length} 个模型`}
          </p>
          <p className="flex items-baseline gap-2 truncate text-sm">
            <span className="truncate font-medium">{best.name}</span>
            {best.source ? (
              <span className="truncate text-xs text-muted-foreground">
                {best.source}
              </span>
            ) : null}
            <span className="ml-auto shrink-0 font-mono font-medium tabular-nums">
              {best.worstCost > best.bestCost
                ? `${formatMoney(best.bestCost)} ～ ${formatMoney(best.worstCost)}`
                : formatMoney(best.bestCost)}
            </span>
          </p>
        </div>
        <a
          href="#results"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          查看结果
          <ArrowDown className="size-3" />
        </a>
      </div>
    </div>
  )
}
