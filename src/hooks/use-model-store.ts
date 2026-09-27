import * as React from "react"

import { createModelId, loadModels, saveModels } from "@/lib/storage"
import type { Model } from "@/lib/types"

/** 去重键：导入模型用 sourceId 标识，手动模型用自身 id。 */
function dedupeKey(model: Model): string {
  return model.sourceId || model.id
}

export interface UseModelStoreResult {
  models: Model[]
  /** 新增一个空白模型，返回其 id（供调用方聚焦输入框）。 */
  addModel: () => string
  updateModel: (id: string, patch: Partial<Omit<Model, "id">>) => void
  removeModel: (id: string) => void
  toggleModel: (id: string, enabled: boolean) => void
  /** 清空全部模型。 */
  clearModels: () => void
  /** 合并导入的模型，已存在（按 sourceId / id）的会被跳过，返回实际新增数量。 */
  importModels: (incoming: Model[]) => number
}

/**
 * 模型列表状态。每次变更都会写入 localStorage。
 */
export function useModelStore(): UseModelStoreResult {
  const [models, setModels] = React.useState<Model[]>(loadModels)

  React.useEffect(() => {
    saveModels(models)
  }, [models])

  const addModel = React.useCallback(() => {
    const id = createModelId()
    setModels((prev) => [
      ...prev,
      {
        id,
        name: "新模型",
        normalPrice: "0",
        cachedPrice: "0",
        outputPrice: "0",
        enabled: true,
        source: "手动",
        sourceId: "",
      },
    ])
    return id
  }, [])

  const updateModel = React.useCallback(
    (id: string, patch: Partial<Omit<Model, "id">>) => {
      setModels((prev) =>
        prev.map((model) => (model.id === id ? { ...model, ...patch } : model))
      )
    },
    []
  )

  const removeModel = React.useCallback((id: string) => {
    setModels((prev) => prev.filter((model) => model.id !== id))
  }, [])

  const toggleModel = React.useCallback((id: string, enabled: boolean) => {
    setModels((prev) =>
      prev.map((model) => (model.id === id ? { ...model, enabled } : model))
    )
  }, [])

  const clearModels = React.useCallback(() => {
    setModels([])
  }, [])

  const importModels = React.useCallback(
    (incoming: Model[]) => {
      const existing = new Set(models.map(dedupeKey))
      const accepted: Model[] = []
      for (const model of incoming) {
        const key = dedupeKey(model)
        if (existing.has(key)) continue
        existing.add(key)
        accepted.push(model)
      }

      if (accepted.length === 0) return 0
      setModels((prev) => [...prev, ...accepted])
      return accepted.length
    },
    [models]
  )

  return {
    models,
    addModel,
    updateModel,
    removeModel,
    toggleModel,
    clearModels,
    importModels,
  }
}
