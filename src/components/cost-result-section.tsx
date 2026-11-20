import * as React from "react"

import { CostBarChart } from "@/components/cost-bar-chart"
import { CostDeltaChart } from "@/components/cost-delta-chart"
import { CostRankingTable } from "@/components/cost-ranking-table"
import { CostScanChart } from "@/components/cost-scan-chart"
import { CostScatterChart } from "@/components/cost-scatter-chart"
import { CostStructureChart } from "@/components/cost-structure-chart"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatMoney } from "@/lib/format"
import type { ModelCostRange, UsageRange } from "@/lib/types"

const CHART_VIEWS = [
  { value: "interval", label: "区间对比" },
  { value: "scan", label: "命中率曲线" },
  { value: "structure", label: "成本结构" },
  { value: "delta", label: "相对差额" },
  { value: "scatter", label: "价格分布" },
] as const

type ChartView = (typeof CHART_VIEWS)[number]["value"]

export interface CostResultSectionProps {
  results: ModelCostRange[]
  usageRange: UsageRange
  hasModels: boolean
  /** 当前输入有校验错误，results 是上一条有效结果。 */
  stale?: boolean
  /** 尚未填完价格的草稿模型数量。 */
  draftCount?: number
}

export function CostResultSection({
  results,
  usageRange,
  hasModels,
  stale = false,
  draftCount = 0,
}: CostResultSectionProps) {
  const best = results[0]
  const [chartView, setChartView] = React.useState<ChartView>("interval")

  let subtitle = "还没有可比较的模型。"
  if (stale) {
    subtitle = "当前输入不完整，以下为最近一次有效结果。"
  } else if (results.length > 0) {
    subtitle = `已比较 ${results.length} 个模型，按命中率区间的最坏情况排序`
  } else if (hasModels) {
    subtitle = "修正上方提示后查看比较结果。"
  }

  let emptyText = "至少需要一个启用的有效模型才能比较成本。"
  if (!hasModels && draftCount > 0) {
    emptyText = "填写草稿模型的名称与三项价格后，即可开始比较。"
  } else if (!hasModels) {
    emptyText = "还没有模型，先添加或导入一个。"
  }

  return (
    <Card id="results" className="scroll-mt-16 gap-0 overflow-hidden py-0">
      <Tabs defaultValue="ranking" className="gap-0">
        <CardHeader className="border-b py-(--card-spacing)">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-3">
              <TabsList>
                <TabsTrigger value="ranking">成本排名</TabsTrigger>
                <TabsTrigger value="chart">图表</TabsTrigger>
              </TabsList>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="block text-xs font-medium text-muted-foreground">
                当前最优（最坏情况最低）
                {best ? ` · ${best.name}` : " · 等待输入"}
                {/* 同名模型可能来自不同渠道，摘要里也要标出来源。 */}
                {best?.source ? `（${best.source}）` : null}
              </span>
              <div className="mt-1 flex items-baseline gap-2 sm:justify-end">
                <strong className="text-3xl font-bold tabular-nums">
                  {best ? formatMoney(best.bestCost) : "¥--"}
                </strong>
                {best && best.worstCost > best.bestCost ? (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    ～ {formatMoney(best.worstCost)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {results.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {emptyText}
            </p>
          ) : (
            <>
              <TabsContent value="ranking">
                <CostRankingTable results={results} usageRange={usageRange} />
              </TabsContent>
              <TabsContent value="chart" className="px-6 py-4">
                {results.length < 2 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    只有 1
                    个模型，图表暂时没有对比意义。再添加一个模型后即可查看区间、结构与价格分布。
                  </p>
                ) : (
                  <Tabs
                    value={chartView}
                    onValueChange={(value) => setChartView(value as ChartView)}
                    className="gap-4"
                  >
                    <div className="max-w-full overflow-x-auto pb-0.5">
                      <TabsList className="w-max">
                        {CHART_VIEWS.map((view) => (
                          <TabsTrigger key={view.value} value={view.value}>
                            {view.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    <TabsContent value="interval">
                      <CostBarChart results={results} />
                    </TabsContent>
                    <TabsContent value="scan">
                      <CostScanChart
                        results={results}
                        usageRange={usageRange}
                      />
                    </TabsContent>
                    <TabsContent value="structure">
                      <CostStructureChart results={results} />
                    </TabsContent>
                    <TabsContent value="delta">
                      <CostDeltaChart results={results} />
                    </TabsContent>
                    <TabsContent value="scatter">
                      <CostScatterChart results={results} />
                    </TabsContent>
                  </Tabs>
                )}
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
    </Card>
  )
}
