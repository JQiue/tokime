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
}

export function CostResultSection({
  results,
  usageRange,
  hasModels,
}: CostResultSectionProps) {
  const best = results[0]
  const [chartView, setChartView] = React.useState<ChartView>("interval")

  let subtitle = "还没有可比较的模型。"
  if (results.length > 0) {
    subtitle = `已比较 ${results.length} 个模型，按命中率区间的最坏情况排序`
  } else if (hasModels) {
    subtitle = "修正上方提示后查看比较结果。"
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
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
                当前最优 · {best ? best.name : "等待输入"}
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
              至少需要一个启用的有效模型才能比较成本。
            </p>
          ) : (
            <>
              <TabsContent value="ranking">
                <CostRankingTable results={results} usageRange={usageRange} />
              </TabsContent>
              <TabsContent value="chart" className="px-6 py-4">
                <Tabs
                  value={chartView}
                  onValueChange={(value) => setChartView(value as ChartView)}
                  className="gap-4"
                >
                  <TabsList>
                    {CHART_VIEWS.map((view) => (
                      <TabsTrigger key={view.value} value={view.value}>
                        {view.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="interval">
                    <CostBarChart results={results} />
                  </TabsContent>
                  <TabsContent value="scan">
                    <CostScanChart results={results} usageRange={usageRange} />
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
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
    </Card>
  )
}
