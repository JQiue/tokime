import * as React from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { NumericInput } from "@/components/numeric-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UseModelImportsResult } from "@/hooks/use-model-imports"
import { exchangeRateStatusText } from "@/lib/exchange-rate"
import { formatUsdPerMillion } from "@/lib/format"
import { resolveCachedPrice } from "@/lib/model-source"
import { toNumber } from "@/lib/pricing"
import type { ModelProvider } from "@/lib/providers"
import type { Model } from "@/lib/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 80

export interface ModelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 来自 useModelImports 的多提供商状态（选项卡、搜索、跨平台勾选）。 */
  source: UseModelImportsResult
  /** 已在列表中的模型去重键，用于标记「已添加」并禁止重复选择。 */
  existingKeys: ReadonlySet<string>
  /** 返回实际新增的模型数量。 */
  onImport: (models: Model[]) => number
}

function remoteModelKey(provider: ModelProvider, modelId: string): string {
  return `${provider.label}:${modelId}`
}

function statusText(
  status: UseModelImportsResult["active"]["status"],
  total: number,
  label: string
) {
  if (status === "loading") return `正在加载 ${label} 模型...`
  if (status === "error") return `${label} 加载失败，请检查网络后重试。`
  if (status === "ready") return `已加载 ${total} 个可导入模型。`
  return "尚未加载模型。"
}

export function ModelImportDialog({
  open,
  onOpenChange,
  source,
  existingKeys,
  onImport,
}: ModelImportDialogProps) {
  const {
    providers,
    activeId,
    setActive,
    active,
    setQuery,
    toggleSelected,
    selectMany,
    clearSelection,
    selectionCounts,
    reload,
    selectedCount,
    usdCnyRate,
    setUsdCnyRate,
    rateStatus,
    rateInfo,
    refreshRate,
    buildSelectedModels,
  } = source

  const { provider, status, filtered, totalCount, query, selectedIds } = active

  // 切换提供商或搜索词后回到第一页。把分页状态和 key 绑在一起，
  // 无需在 effect 里 setState，也不会出现旧搜索的页码残留。
  const listKey = `${activeId}\u0000${query}`
  const [paging, setPaging] = React.useState({ key: listKey, limit: PAGE_SIZE })
  const visibleLimit = paging.key === listKey ? paging.limit : PAGE_SIZE

  const isExisting = React.useCallback(
    (modelId: string) => existingKeys.has(remoteModelKey(provider, modelId)),
    [existingKeys, provider]
  )

  const selectable = React.useMemo(
    () => filtered.filter((model) => !isExisting(model.id)),
    [filtered, isExisting]
  )
  const visible = filtered.slice(0, visibleLimit)
  const remaining = filtered.length - visible.length
  const allSelectableSelected =
    selectable.length > 0 &&
    selectable.every((model) => selectedIds.has(model.id))

  const rateValid = toNumber(usdCnyRate) > 0
  const canImport = selectedCount > 0 && rateValid
  const showEmpty = status === "ready" && filtered.length === 0
  const showSkeleton = status === "loading" && filtered.length === 0

  function handleImport() {
    if (!canImport) return
    onImport(buildSelectedModels())
    onOpenChange(false)
  }

  function handleToggleAll() {
    selectMany(
      selectable.map((model) => model.id),
      !allSelectableSelected
    )
  }

  const selectedBreakdown = providers
    .map((item) => ({
      label: item.label,
      count: selectionCounts[item.id] ?? 0,
    }))
    .filter((item) => item.count > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle>导入模型</DialogTitle>
          <DialogDescription>
            公开 Models API · 价格将按汇率换算为「元 / 1M Token」
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeId}
          onValueChange={(value) => setActive(String(value))}
        >
          <TabsList>
            {providers.map((item) => {
              const count = selectionCounts[item.id] ?? 0
              return (
                <TabsTrigger key={item.id} value={item.id}>
                  {item.label}
                  {count > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground tabular-nums">
                      {count}
                    </span>
                  ) : null}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

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

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {statusText(status, totalCount, provider.label)}
            {status === "ready" && filtered.length > 0
              ? ` 当前筛选 ${filtered.length} 个。`
              : null}
          </span>
          <div className="flex items-center gap-2">
            {status === "error" ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={reload}
              >
                重试
              </Button>
            ) : null}
            {status === "ready" && filtered.length > 0 ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={selectable.length === 0}
                onClick={handleToggleAll}
              >
                {allSelectableSelected ? "取消全选" : "全选当前结果"}
              </Button>
            ) : null}
            {provider.docsUrl ? (
              <a
                className="font-medium underline underline-offset-3 hover:text-foreground"
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                接口文档
              </a>
            ) : null}
          </div>
        </div>

        <ScrollArea className="h-[min(380px,36dvh)] min-h-32 rounded-lg border">
          {showSkeleton ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="h-9 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <span className="sr-only">选择</span>
                  </TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead className="w-[30%] text-right">
                    {provider.label} USD / 1M
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((model) => {
                  const exists = isExisting(model.id)
                  const selected = exists || selectedIds.has(model.id)
                  return (
                    <TableRow
                      key={model.id}
                      className={cn(
                        exists
                          ? "opacity-60"
                          : "cursor-pointer hover:bg-muted/50",
                        selected && !exists && "bg-muted/40"
                      )}
                      onClick={() => {
                        if (!exists) toggleSelected(model.id)
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          aria-label={`选择 ${model.name}`}
                          checked={selected}
                          disabled={exists}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => {
                            if (!exists) toggleSelected(model.id)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="block truncate font-medium"
                            title={model.name}
                          >
                            {model.name}
                          </span>
                          {exists ? (
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-[10px]"
                            >
                              已添加
                            </Badge>
                          ) : null}
                        </div>
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
                  )
                })}
              </TableBody>
            </Table>
          )}

          {showEmpty ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              没有匹配的可导入文本模型。
            </p>
          ) : null}

          {remaining > 0 ? (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() =>
                  setPaging({ key: listKey, limit: visibleLimit + PAGE_SIZE })
                }
              >
                显示更多（剩余 {remaining} 个，可继续搜索缩小范围）
              </Button>
            </div>
          ) : null}
        </ScrollArea>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <span className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <>
                已选择 {selectedCount} 个模型
                {selectedBreakdown.length > 0 ? (
                  <span className="text-xs">
                    （
                    {selectedBreakdown
                      .map((item) => `${item.label} ${item.count}`)
                      .join(" · ")}
                    ）
                  </span>
                ) : null}
              </>
            ) : (
              "未选择模型"
            )}
          </span>
          <div className="flex gap-2">
            {selectedCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={clearSelection}
              >
                清空选择
              </Button>
            ) : null}
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
