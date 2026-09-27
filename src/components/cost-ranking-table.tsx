import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoney, formatNumber, formatRange } from "@/lib/format"
import type { ModelCostRange, UsageRange } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface CostRankingTableProps {
  results: ModelCostRange[]
  usageRange: UsageRange
}

function TokenHead({
  label,
  from,
  to,
}: {
  label: string
  from: number
  to: number
}) {
  return (
    <TableHead>
      <span className="block">{label}</span>
      <span className="block text-xs font-normal text-muted-foreground">
        {from === to
          ? `${formatNumber(from)} Token`
          : `${formatNumber(from)} → ${formatNumber(to)} Token`}
      </span>
    </TableHead>
  )
}

export function CostRankingTable({
  results,
  usageRange,
}: CostRankingTableProps) {
  const highestWorstCost = results.at(-1)?.worstCost ?? 0

  return (
    <div>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">排名</TableHead>
            <TableHead className="w-[22%]">模型</TableHead>
            <TokenHead
              label="输入"
              from={usageRange.atMinRate.normalInputTokens}
              to={usageRange.atMaxRate.normalInputTokens}
            />
            <TokenHead
              label="缓存输入"
              from={usageRange.atMinRate.cachedInputTokens}
              to={usageRange.atMaxRate.cachedInputTokens}
            />
            <TokenHead
              label="输出"
              from={usageRange.atMinRate.outputTokens}
              to={usageRange.atMaxRate.outputTokens}
            />
            <TableHead className="w-[22%]">总成本区间</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {results.map((result, index) => {
            const isBest = index === 0
            const saving = highestWorstCost - result.worstCost

            const notes = [
              saving > 0 ? `省 ${formatMoney(saving)}` : null,
              result.cacheImpact > 0
                ? `缓存影响 ${formatMoney(result.cacheImpact)}`
                : null,
            ].filter((note): note is string => note !== null)

            return (
              <TableRow
                key={result.id}
                className={cn(isBest && "bg-emerald-50 hover:bg-emerald-100")}
              >
                <TableCell
                  className={cn(
                    "font-bold",
                    isBest ? "text-emerald-700" : "text-muted-foreground"
                  )}
                >
                  {index + 1}
                </TableCell>

                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <span className="block truncate" title={result.name}>
                      {result.name}
                    </span>
                    {/* 同名模型可能来自不同渠道，来源单独占一行。 */}
                    {result.source || isBest ? (
                      <span className="flex flex-wrap items-center gap-1.5 text-xs">
                        {result.source ? (
                          <span
                            className="truncate text-muted-foreground"
                            title={result.source}
                          >
                            {result.source}
                          </span>
                        ) : null}
                        {isBest ? (
                          <Badge variant="secondary" className="text-xs">
                            最坏情况最低
                          </Badge>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {formatRange(
                    result.atMinRate.normalInputCost,
                    result.atMaxRate.normalInputCost,
                    formatMoney
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRange(
                    result.atMinRate.cachedInputCost,
                    result.atMaxRate.cachedInputCost,
                    formatMoney
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRange(
                    result.atMinRate.outputCost,
                    result.atMaxRate.outputCost,
                    formatMoney
                  )}
                </TableCell>

                <TableCell className="font-bold">
                  {formatRange(result.bestCost, result.worstCost, formatMoney)}
                  {notes.length > 0 ? (
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {notes.join(" · ")}
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Token 列为缓存命中率下限 → 上限的变化；金额列为该区间内的最低 ～ 最高。
      </p>
    </div>
  )
}
