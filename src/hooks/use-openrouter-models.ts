import * as React from "react"

import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { fetchOpenRouterModels, toModel } from "@/lib/openrouter"
import { toNumber } from "@/lib/pricing"
import type {
  ExchangeRateInfo,
  ExchangeRateStatus,
  Model,
  OpenRouterModel,
  OpenRouterStatus,
} from "@/lib/types"

export interface UseOpenRouterModelsResult {
  status: OpenRouterStatus
  /** 搜索过滤后的模型列表。 */
  filtered: OpenRouterModel[]
  /** 已加载的模型总数（不受搜索影响）。 */
  totalCount: number
  query: string
  setQuery: (query: string) => void
  usdCnyRate: string
  setUsdCnyRate: (rate: string) => void
  /** 实时汇率的状态与来源，以及手动刷新入口。 */
  rateStatus: ExchangeRateStatus
  rateInfo: ExchangeRateInfo | null
  refreshRate: () => void
  selectedIds: ReadonlySet<string>
  toggleSelected: (id: string) => void
  /** 打开对话框时调用：重置搜索与勾选，并在需要时拉取列表。 */
  prepare: () => void
  /** 把当前勾选的模型换算为应用内模型。 */
  buildSelectedModels: () => Model[]
}

/**
 * OpenRouter 导入对话框的状态：列表加载、搜索、勾选与汇率。
 * 请求通过 AbortController 管理，卸载时取消。
 */
export function useOpenRouterModels(): UseOpenRouterModelsResult {
  const [status, setStatus] = React.useState<OpenRouterStatus>("idle")
  const [models, setModels] = React.useState<OpenRouterModel[]>([])
  const [query, setQuery] = React.useState("")
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const exchangeRate = useExchangeRate()
  const usdCnyRate = exchangeRate.rate
  const setUsdCnyRate = exchangeRate.setRate

  const abortRef = React.useRef<AbortController | null>(null)

  const load = React.useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus("loading")
    fetchOpenRouterModels(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setModels(list)
        setStatus("ready")
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setStatus("error")
      })
  }, [])

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const prepare = React.useCallback(() => {
    setQuery("")
    setSelectedIds(new Set())
    // 已有数据或正在加载时不重复请求。
    if (models.length === 0 && status !== "loading") {
      load()
    }
  }, [models.length, status, load])

  const toggleSelected = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const filtered = React.useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return models
    return models.filter((model) =>
      `${model.name} ${model.id}`.toLowerCase().includes(keyword)
    )
  }, [models, query])

  const buildSelectedModels = React.useCallback((): Model[] => {
    const rate = toNumber(usdCnyRate)
    if (rate <= 0 || selectedIds.size === 0) return []
    return models
      .filter((model) => selectedIds.has(model.id))
      .map((model) => toModel(model, rate))
  }, [models, selectedIds, usdCnyRate])

  return {
    status,
    filtered,
    totalCount: models.length,
    query,
    setQuery,
    usdCnyRate,
    setUsdCnyRate,
    rateStatus: exchangeRate.status,
    rateInfo: exchangeRate.info,
    refreshRate: exchangeRate.refresh,
    selectedIds,
    toggleSelected,
    prepare,
    buildSelectedModels,
  }
}
