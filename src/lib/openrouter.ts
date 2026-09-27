import { usdPerMillion } from "@/lib/format"
import { roundImportedPrice } from "@/lib/pricing"
import { normalizeModel } from "@/lib/storage"
import type { Model, OpenRouterModel } from "@/lib/types"

export const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models?output_modalities=text&limit=1000&sort=most-popular"

export const DEFAULT_USD_CNY_RATE = "7.2"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** 价格字段是否可解析为数字。 */
export function hasUsablePricing(pricing: unknown): boolean {
  if (!isRecord(pricing)) return false
  return (
    Number.isFinite(Number(pricing.prompt)) &&
    Number.isFinite(Number(pricing.completion))
  )
}

function toOpenRouterModel(value: unknown): OpenRouterModel | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || typeof value.name !== "string")
    return null
  if (!hasUsablePricing(value.pricing)) return null

  const pricing = value.pricing as OpenRouterModel["pricing"]
  return { id: value.id, name: value.name, pricing }
}

/**
 * 拉取可导入的文本模型列表。
 * 传入 AbortSignal 以便卸载时取消请求（StrictMode 下会触发两次挂载）。
 */
export async function fetchOpenRouterModels(
  signal?: AbortSignal
): Promise<OpenRouterModel[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, { signal })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.data)) return []

  return body.data
    .map((item) => toOpenRouterModel(item))
    .filter((model): model is OpenRouterModel => model !== null)
}

/** 把 OpenRouter 条目换算成应用内的模型（价格按汇率折算为元 / 1M Token）。 */
export function toModel(model: OpenRouterModel, usdCnyRate: number): Model {
  const cachedPrice = model.pricing.input_cache_read ?? model.pricing.prompt

  return normalizeModel({
    id: `openrouter:${model.id}`,
    name: model.name,
    normalPrice: roundImportedPrice(
      usdPerMillion(model.pricing.prompt) * usdCnyRate
    ),
    cachedPrice: roundImportedPrice(usdPerMillion(cachedPrice) * usdCnyRate),
    outputPrice: roundImportedPrice(
      usdPerMillion(model.pricing.completion) * usdCnyRate
    ),
    source: "OpenRouter",
    sourceId: model.id,
    enabled: true,
  })
}

export function resolveCachedPrice(model: OpenRouterModel): string | number {
  return model.pricing.input_cache_read ?? model.pricing.prompt
}
