import * as React from "react"

import { modelDedupeKey } from "@/lib/model-key"
import { createModelId, loadModels, saveModels } from "@/lib/storage"
import type { Model } from "@/lib/types"
import { isModelComplete } from "@/lib/validation"

export interface UseModelStoreResult {
  models: Model[]
  /** 新增一个空白草稿模型，返回其 id（供调用方聚焦输入框）。 */
  addModel: () => string
  updateModel: (id: string, patch: Partial<Omit<Model, "id">>) => void
  removeModel: (id: string) => void
  /** 撤销删除：把模型插回原来的位置。 */
  restoreModel: (model: Model, index: number) => void
  /** 整体替换（用于撤销清空、恢复备份）。 */
  replaceModels: (models: Model[]) => void
  toggleModel: (id: string, enabled: boolean) => void
  /** 清空全部模型。 */
  clearModels: () => void
  /** 合并导入的模型，已存在（按 sourceId / id）的会被跳过，返回实际新增数量。 */
  importModels: (incoming: Model[]) => number
}

/**
 * 模型列表状态。每次变更都会写入 localStorage（防抖 250ms，
 * 避免拖动滑块或连续输入时每个字符都同步写盘）。
 */
export function useModelStore(): UseModelStoreResult {
  const [models, setModels] = React.useState<Model[]>(loadModels)

  const latestRef = React.useRef(models)

  React.useEffect(() => {
    latestRef.current = models
  }, [models])

  React.useEffect(() => {
    const timer = window.setTimeout(() => saveModels(models), 250)
    return () => window.clearTimeout(timer)
  }, [models])

  // 卸载（或 StrictMode 重新挂载）前把最后一次变更落盘。
  React.useEffect(() => {
    return () => saveModels(latestRef.current)
  }, [])

  const addModel = React.useCallback(() => {
    const id = createModelId()
    setModels((prev) => [
      ...prev,
      {
        id,
        name: "新模型",
        normalPrice: "",
        cachedPrice: "",
        outputPrice: "",
        enabled: true,
        source: "手动",
        sourceId: "",
        draft: true,
      },
    ])
    return id
  }, [])

  const updateModel = React.useCallback(
    (id: string, patch: Partial<Omit<Model, "id">>) => {
      setModels((prev) =>
        prev.map((model) => {
          if (model.id !== id) return model
          const next = { ...model, ...patch }
          // 草稿填完名称与三项价格后自动转为正式模型。
          if (next.draft && isModelComplete(next)) {
            next.draft = false
          }
          return next
        })
      )
    },
    []
  )

  const removeModel = React.useCallback((id: string) => {
    setModels((prev) => prev.filter((model) => model.id !== id))
  }, [])

  const restoreModel = React.useCallback((model: Model, index: number) => {
    setModels((prev) => {
      if (prev.some((item) => item.id === model.id)) return prev
      const next = [...prev]
      next.splice(Math.min(Math.max(index, 0), next.length), 0, model)
      return next
    })
  }, [])

  const replaceModels = React.useCallback((next: Model[]) => {
    setModels(next)
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
      const existing = new Set(models.map(modelDedupeKey))
      const accepted: Model[] = []
      for (const model of incoming) {
        const key = modelDedupeKey(model)
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
    restoreModel,
    replaceModels,
    toggleModel,
    clearModels,
    importModels,
  }
}
