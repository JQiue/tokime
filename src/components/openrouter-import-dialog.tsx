import { Loader2, RefreshCw } from "lucide-react"

import { NumericInput } from "@/components/numeric-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { UseOpenRouterModelsResult } from "@/hooks/use-openrouter-models"
import { exchangeRateStatusText } from "@/lib/exchange-rate"
import { formatUsdPerMillion } from "@/lib/format"
import { resolveCachedPrice } from "@/lib/openrouter"
import { toNumber } from "@/lib/pricing"
import type { Model } from "@/lib/types"

export interface OpenRouterImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 来自 useOpenRouterModels 的列表 / 搜索 / 勾选状态。 */
  source: UseOpenRouterModelsResult
  /** 返回实际新增的模型数量。 */
  onImport: (models: Model[]) => number
}

function statusText(
  status: UseOpenRouterModelsResult["status"],
  total: number
) {
  if (status === "loading") return "正在加载 OpenRouter 模型..."
  if (status === "error") return "加载失败，请检查网络后重试。"
  if (status === "ready") return `已加载 ${total} 个可导入模型。`
  return "尚未加载模型。"
}

export function OpenRouterImportDialog({
  open,
  onOpenChange,
  source,
  onImport,
}: OpenRouterImportDialogProps) {
  const {
    status,
    filtered,
    totalCount,
    query,
    setQuery,
    usdCnyRate,
    setUsdCnyRate,
    rateStatus,
    rateInfo,
    refreshRate,
    selectedIds,
    toggleSelected,
    buildSelectedModels,
  } = source

  const selectedCount = selectedIds.size
  const rateValid = toNumber(usdCnyRate) > 0
  const canImport = selectedCount > 0 && rateValid
  const showEmpty = status === "ready" && filtered.length === 0

  function handleImport() {
    if (!canImport) return
    onImport(buildSelectedModels())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>从 OpenRouter 导入</DialogTitle>
          <DialogDescription>
            公开 Models API · 价格将按汇率换算为「元 / 1M Token」
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">筛选模型</span>
            <Input
              type="search"
              autoComplete="off"
              placeholder="名称或模型 ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">美元兑人民币</span>
            <div className="flex items-center gap-1.5">
              <NumericInput
                ariaLabel="美元兑人民币汇率"
                value={usdCnyRate}
                onValueChange={setUsdCnyRate}
                invalid={!rateValid}
                step={0.0001}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                aria-label="刷新实时汇率"
                title="从免费接口重新获取实时汇率"
                disabled={rateStatus === "loading"}
                onClick={refreshRate}
              >
                {rateStatus === "loading" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
              </Button>
            </div>
            {!rateValid ? (
              <span className="text-xs text-destructive">
                请输入大于 0 的汇率。
              </span>
            ) : (
              <span
                className="text-xs text-muted-foreground"
                title={
                  rateInfo?.updatedAt
                    ? `数据时间：${rateInfo.updatedAt}`
                    : undefined
                }
              >
                {exchangeRateStatusText(
                  rateStatus,
                  rateInfo?.source ?? "",
                  rateValid && rateStatus !== "loading"
                )}
                {rateInfo?.updatedAt ? ` · ${rateInfo.updatedAt}` : null}
              </span>
            )}
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            {statusText(status, totalCount)}
          </span>
          <a
            className="font-medium underline underline-offset-3 hover:text-foreground"
            href="https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties"
            target="_blank"
            rel="noopener noreferrer"
          >
            接口文档
          </a>
        </div>

        <ScrollArea className="h-[380px] rounded-lg border">
          <Table className="table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <span className="sr-only">选择</span>
                </TableHead>
                <TableHead>模型</TableHead>
                <TableHead className="w-[30%] text-right">
                  OpenRouter USD / 1M
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      aria-label={`选择 ${model.name}`}
                      checked={selectedIds.has(model.id)}
                      onChange={() => toggleSelected(model.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className="block truncate font-medium"
                      title={model.name}
                    >
                      {model.name}
                    </span>
                    <span
                      className="block truncate text-xs text-muted-foreground"
                      title={model.id}
                    >
                      {model.id}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    <span className="block">
                      入 {formatUsdPerMillion(model.pricing.prompt)}
                    </span>
                    <span className="block">
                      缓存 {formatUsdPerMillion(resolveCachedPrice(model))}
                    </span>
                    <span className="block">
                      出 {formatUsdPerMillion(model.pricing.completion)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {showEmpty ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              没有匹配的可导入文本模型。
            </p>
          ) : null}
        </ScrollArea>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <span className="text-sm text-muted-foreground">
            {selectedCount > 0
              ? `已选择 ${selectedCount} 个模型`
              : "未选择模型"}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="button" disabled={!canImport} onClick={handleImport}>
              导入所选
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
