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
  alignRight = false,
}: {
  label: string
  from: number
  to: number
  alignRight?: boolean
}) {
  return (
    <TableHead className={cn("whitespace-normal", alignRight && "text-right")}>
      <span className="block">{label}</span>
      <span className="block text-xs font-normal whitespace-normal text-muted-foreground">
        {from === to
          ? `${formatNumber(from)} Token`
          : `${formatNumber(from)} → ${formatNumber(to)} Token`}
      </span>
    </TableHead>
  )
}

function NotesText({
  saving,
  cacheImpact,
  className,
}: {
  saving: number
  cacheImpact: number
  className?: string
}) {
  const notes = [
    saving > 0 ? `较最高省 ${formatMoney(saving)}` : null,
    cacheImpact > 0 ? `缓存影响 ${formatMoney(cacheImpact)}` : null,
  ].filter((note): note is string => note !== null)

  if (notes.length === 0) return null
  return <span className={className}>{notes.join(" · ")}</span>
}

function RankBadge({ rank, isBest }: { rank: number; isBest: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        isBest ? "bg-chart-2/15 text-chart-2" : "bg-muted text-muted-foreground"
      )}
    >
      {rank}
    </span>
  )
}

export function CostRankingTable({
  results,
  usageRange,
}: CostRankingTableProps) {
  const highestWorstCost = results.at(-1)?.worstCost ?? 0

  return (
    <div className="@container">
      {/* 按容器宽度切换，而不是视口：右栏在 1280–1440 桌面下仍可能很窄。 */}
      {/* 窄容器：卡片式排名，保留成本明细并通过 details 收起 Token 明细。 */}
      <div className="divide-y @min-[950px]:hidden">
        {results.map((result, index) => {
          const isBest = index === 0
          const saving = highestWorstCost - result.worstCost

          return (
            <div
              key={result.id}
              className={cn(
                "flex flex-col gap-2 px-4 py-3",
                isBest && "bg-chart-2/5"
              )}
            >
              <div className="flex items-start gap-2.5">
                <RankBadge rank={index + 1} isBest={isBest} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={result.name}>
                    {result.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {result.source ? (
                      <span className="truncate">{result.source}</span>
                    ) : null}
                    {isBest ? (
                      <Badge variant="secondary" className="text-[10px]">
                        最坏情况最低
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  总成本区间
                </span>
                <span className="font-mono text-base font-bold tabular-nums">
                  {formatRange(result.bestCost, result.worstCost, formatMoney)}
                </span>
              </div>
              <NotesText
                saving={saving}
                cacheImpact={result.cacheImpact}
                className="text-right text-xs text-muted-foreground"
              />

              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs">
                <div className="min-w-0">
                  <span className="block text-muted-foreground">输入</span>
                  <span className="block text-[11px] leading-tight tabular-nums">
                    {formatRange(
                      result.atMinRate.normalInputCost,
                      result.atMaxRate.normalInputCost,
                      formatMoney
                    )}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-muted-foreground">缓存输入</span>
                  <span className="block text-[11px] leading-tight tabular-nums">
                    {formatRange(
                      result.atMinRate.cachedInputCost,
                      result.atMaxRate.cachedInputCost,
                      formatMoney
                    )}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-muted-foreground">输出</span>
                  <span className="block text-[11px] leading-tight tabular-nums">
                    {formatRange(
                      result.atMinRate.outputCost,
                      result.atMaxRate.outputCost,
                      formatMoney
                    )}
                  </span>
                </div>
              </div>

              <details className="text-xs text-muted-foreground">
                <summary className="w-fit cursor-pointer select-none hover:text-foreground">
                  Token 明细
                </summary>
                <dl className="mt-1.5 grid gap-1 tabular-nums">
                  <div className="flex justify-between gap-3">
                    <dt>输入</dt>
                    <dd>
                      {formatNumber(usageRange.atMinRate.normalInputTokens)} →{" "}
                      {formatNumber(usageRange.atMaxRate.normalInputTokens)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>缓存输入</dt>
                    <dd>
                      {formatNumber(usageRange.atMinRate.cachedInputTokens)} →{" "}
                      {formatNumber(usageRange.atMaxRate.cachedInputTokens)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>输出</dt>
                    <dd>{formatNumber(usageRange.atMaxRate.outputTokens)}</dd>
                  </div>
                </dl>
              </details>
            </div>
          )
        })}
      </div>

      {/* 宽容器：完整表格。 */}
      <div className="hidden @min-[950px]:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">排名</TableHead>
              <TableHead className="w-[22%]">模型</TableHead>
              <TokenHead
                label="输入"
                from={usageRange.atMinRate.normalInputTokens}
                to={usageRange.atMaxRate.normalInputTokens}
                alignRight
              />
              <TokenHead
                label="缓存输入"
                from={usageRange.atMinRate.cachedInputTokens}
                to={usageRange.atMaxRate.cachedInputTokens}
                alignRight
              />
              <TokenHead
                label="输出"
                from={usageRange.atMinRate.outputTokens}
                to={usageRange.atMaxRate.outputTokens}
                alignRight
              />
              <TableHead className="w-[22%] text-right">总成本区间</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {results.map((result, index) => {
              const isBest = index === 0
              const saving = highestWorstCost - result.worstCost

              return (
                <TableRow
                  key={result.id}
                  className={cn(isBest && "bg-chart-2/5 hover:bg-chart-2/10")}
                >
                  <TableCell
                    className={cn(
                      "font-bold tabular-nums",
                      isBest ? "text-chart-2" : "text-muted-foreground"
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

                  <TableCell className="text-right whitespace-normal text-muted-foreground tabular-nums">
                    {formatRange(
                      result.atMinRate.normalInputCost,
                      result.atMaxRate.normalInputCost,
                      formatMoney
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-normal text-muted-foreground tabular-nums">
                    {formatRange(
                      result.atMinRate.cachedInputCost,
                      result.atMaxRate.cachedInputCost,
                      formatMoney
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-normal text-muted-foreground tabular-nums">
                    {formatRange(
                      result.atMinRate.outputCost,
                      result.atMaxRate.outputCost,
                      formatMoney
                    )}
                  </TableCell>

                  <TableCell className="text-right font-bold whitespace-normal tabular-nums">
                    {formatRange(
                      result.bestCost,
                      result.worstCost,
                      formatMoney
                    )}
                    <NotesText
                      saving={saving}
                      cacheImpact={result.cacheImpact}
                      className="mt-1 block text-xs font-normal text-muted-foreground"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Token 列为缓存命中率下限 → 上限的变化；金额列为该区间内的最低 ～ 最高。
        「较最高省」是相对最坏情况最高的模型少花的金额。
      </p>
    </div>
  )
}
