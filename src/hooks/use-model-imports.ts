import * as React from "react"

import type { UseExchangeRateResult } from "@/hooks/use-exchange-rate"
import { fetchProviderModels, toModel } from "@/lib/model-source"
import { toNumber } from "@/lib/pricing"
import type { ModelProvider } from "@/lib/providers"
import type {
  ExchangeRateInfo,
  ExchangeRateStatus,
  Model,
  RemoteModel,
  RemoteModelStatus,
} from "@/lib/types"

/** 单个提供商在对话框里的独立视图状态。 */
interface ProviderEntry {
  status: RemoteModelStatus
  models: RemoteModel[]
  query: string
  /** 该提供商下已勾选的远端模型 id（不带 provider 前缀）。 */
  selectedIds: ReadonlySet<string>
}

/** 当前选项卡对外暴露的快照。 */
export interface ProviderTabView {
  provider: ModelProvider
  status: RemoteModelStatus
  /** 搜索过滤后的模型列表。 */
  filtered: RemoteModel[]
  /** 已加载的模型总数（不受搜索影响）。 */
  totalCount: number
  query: string
  selectedIds: ReadonlySet<string>
}

export interface UseModelImportsResult {
  providers: readonly ModelProvider[]
  activeId: string
  setActive: (id: string) => void
  active: ProviderTabView
  /** 打开对话框时调用：清空所有选项卡的搜索与勾选，并懒加载当前提供商。 */
  open: () => void
  /** 更新当前选项卡的搜索词。 */
  setQuery: (query: string) => void
  /** 勾选 / 取消当前选项卡中的某个模型。 */
  toggleSelected: (modelId: string) => void
  /** 跨全部提供商已勾选的总数。 */
  selectedCount: number
  usdCnyRate: string
  setUsdCnyRate: (rate: string) => void
  rateStatus: ExchangeRateStatus
  rateInfo: ExchangeRateInfo | null
  refreshRate: () => void
  /** 把全部提供商中已勾选的模型换算为应用内模型。 */
  buildSelectedModels: () => Model[]
}

function createEntries(
  providers: readonly ModelProvider[]
): Record<string, ProviderEntry> {
  const entries: Record<string, ProviderEntry> = {}
  for (const provider of providers) {
    entries[provider.id] = {
      status: "idle",
      models: [],
      query: "",
      selectedIds: new Set(),
    }
  }
  return entries
}

/**
 * 模型导入对话框的状态：多个提供商共用一个对话框、一份汇率。
 * 每个提供商各自维护加载 / 搜索 / 勾选，切换选项卡互不干扰；
 * 勾选是跨提供商的，因此可以一次性导入来自不同平台的模型。
 * 汇率由调用方注入共享，避免每个提供商重复抓取。
 * 请求通过 AbortController 管理，切换与卸载时取消。
 */
export function useModelImports(
  providers: readonly ModelProvider[],
  exchangeRate: UseExchangeRateResult
): UseModelImportsResult {
  const [activeId, setActiveId] = React.useState(() => providers[0].id)
  const [entries, setEntries] = React.useState<Record<string, ProviderEntry>>(
    () => createEntries(providers)
  )

  const abortRefs = React.useRef<Record<string, AbortController | null>>({})

  // 供事件回调读取最新值，避免把 entries / activeId 放进依赖里反复重建回调。
  // 在 effect 里同步，而不是渲染期直接赋值。
  const entriesRef = React.useRef(entries)
  const activeIdRef = React.useRef(activeId)
  React.useEffect(() => {
    entriesRef.current = entries
  }, [entries])
  React.useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const load = React.useCallback((provider: ModelProvider) => {
    abortRefs.current[provider.id]?.abort()
    const controller = new AbortController()
    abortRefs.current[provider.id] = controller

    setEntries((prev) => ({
      ...prev,
      [provider.id]: { ...prev[provider.id], status: "loading" },
    }))
    fetchProviderModels(provider, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setEntries((prev) => ({
          ...prev,
          [provider.id]: { ...prev[provider.id], models: list, status: "ready" },
        }))
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setEntries((prev) => ({
          ...prev,
          [provider.id]: { ...prev[provider.id], status: "error" },
        }))
      })
  }, [])

  React.useEffect(() => {
    // 复制到局部变量：cleanup 运行时 abortRefs.current 可能已被替换。
    const controllers = abortRefs.current
    return () => {
      for (const controller of Object.values(controllers)) {
        controller?.abort()
      }
    }
  }, [])

  /** 首次切到某提供商时按需拉取；已有数据或正在加载则跳过。 */
  const ensureLoaded = React.useCallback(
    (provider: ModelProvider) => {
      const entry = entriesRef.current[provider.id]
      if (entry && entry.models.length === 0 && entry.status !== "loading") {
        load(provider)
      }
    },
    [load]
  )

  const setActive = React.useCallback(
    (id: string) => {
      setActiveId(id)
      const provider = providers.find((item) => item.id === id)
      if (provider) ensureLoaded(provider)
    },
    [providers, ensureLoaded]
  )

  const open = React.useCallback(() => {
    // 每次打开都清空所有选项卡的搜索与勾选，避免上次的残留让人困惑。
    setEntries((prev) => {
      const next: Record<string, ProviderEntry> = {}
      for (const [id, entry] of Object.entries(prev)) {
        next[id] = { ...entry, query: "", selectedIds: new Set() }
      }
      return next
    })
    const provider =
      providers.find((item) => item.id === activeIdRef.current) ?? providers[0]
    ensureLoaded(provider)
  }, [providers, ensureLoaded])

  const setQuery = React.useCallback((query: string) => {
    const id = activeIdRef.current
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], query } }))
  }, [])

  const toggleSelected = React.useCallback((modelId: string) => {
    const id = activeIdRef.current
    setEntries((prev) => {
      const entry = prev[id]
      const selectedIds = new Set(entry.selectedIds)
      if (selectedIds.has(modelId)) {
        selectedIds.delete(modelId)
      } else {
        selectedIds.add(modelId)
      }
      return { ...prev, [id]: { ...entry, selectedIds } }
    })
  }, [])

  const activeProvider =
    providers.find((item) => item.id === activeId) ?? providers[0]
  const activeEntry = entries[activeProvider.id] ?? {
    status: "idle" as const,
    models: [],
    query: "",
    selectedIds: new Set<string>(),
  }

  const filtered = React.useMemo(() => {
    const keyword = activeEntry.query.trim().toLowerCase()
    if (!keyword) return activeEntry.models
    return activeEntry.models.filter((model) =>
      `${model.name} ${model.id}`.toLowerCase().includes(keyword)
    )
  }, [activeEntry.models, activeEntry.query])

  const selectedCount = React.useMemo(() => {
    let total = 0
    for (const entry of Object.values(entries)) {
      total += entry.selectedIds.size
    }
    return total
  }, [entries])

  const rate = exchangeRate.rate

  const buildSelectedModels = React.useCallback((): Model[] => {
    const parsedRate = toNumber(rate)
    if (parsedRate <= 0) return []
    const result: Model[] = []
    for (const provider of providers) {
      const entry = entries[provider.id]
      if (!entry || entry.selectedIds.size === 0) continue
      for (const model of entry.models) {
        if (entry.selectedIds.has(model.id)) {
          result.push(toModel(model, parsedRate, provider))
        }
      }
    }
    return result
  }, [providers, entries, rate])

  return {
    providers,
    activeId,
    setActive,
    active: {
      provider: activeProvider,
      status: activeEntry.status,
      filtered,
      totalCount: activeEntry.models.length,
      query: activeEntry.query,
      selectedIds: activeEntry.selectedIds,
    },
    open,
    setQuery,
    toggleSelected,
    selectedCount,
    usdCnyRate: exchangeRate.rate,
    setUsdCnyRate: exchangeRate.setRate,
    rateStatus: exchangeRate.status,
    rateInfo: exchangeRate.info,
    refreshRate: exchangeRate.refresh,
    buildSelectedModels,
  }
}
