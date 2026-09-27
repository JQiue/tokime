import { usdPerMillion } from "@/lib/format"
import { roundImportedPrice } from "@/lib/pricing"
import { providerModelsUrl, type ModelProvider } from "@/lib/providers"
import { normalizeModel } from "@/lib/storage"
import type { Model, RemoteModel } from "@/lib/types"

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

/**
 * 是否为文本输出模型。
 * OpenRouter 在请求时已按 output_modalities=text 过滤，但部分兼容平台
 * （如 OFox）会忽略该参数并返回视频 / 图像模型，因此在客户端再兜底一次。
 * 结构缺失时保守保留，避免误杀。
 */
function isTextOutputModel(value: Record<string, unknown>): boolean {
  const architecture = value.architecture
  if (!isRecord(architecture)) return true
  const outputs = architecture.output_modalities
  if (!Array.isArray(outputs)) return true
  return outputs.includes("text")
}

function toRemoteModel(value: unknown): RemoteModel | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || typeof value.name !== "string") return null
  if (!hasUsablePricing(value.pricing)) return null
  if (!isTextOutputModel(value)) return null

  const pricing = value.pricing as RemoteModel["pricing"]
  return { id: value.id, name: value.name, pricing }
}

/**
 * 拉取某个提供商可导入的文本模型列表。
 * 传入 AbortSignal 以便卸载时取消请求（StrictMode 下会触发两次挂载）。
 */
export async function fetchProviderModels(
  provider: ModelProvider,
  signal?: AbortSignal
): Promise<RemoteModel[]> {
  const response = await fetch(providerModelsUrl(provider), { signal })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.data)) return []

  return body.data
    .map((item) => toRemoteModel(item))
    .filter((model): model is RemoteModel => model !== null)
}

/** 把远端条目换算成应用内的模型（价格按汇率折算为元 / 1M Token）。 */
export function toModel(
  model: RemoteModel,
  usdCnyRate: number,
  provider: ModelProvider
): Model {
  const cachedPrice = model.pricing.input_cache_read ?? model.pricing.prompt

  return normalizeModel({
    id: `${provider.id}:${model.id}`,
    name: model.name,
    normalPrice: roundImportedPrice(
      usdPerMillion(model.pricing.prompt) * usdCnyRate
    ),
    cachedPrice: roundImportedPrice(usdPerMillion(cachedPrice) * usdCnyRate),
    outputPrice: roundImportedPrice(
      usdPerMillion(model.pricing.completion) * usdCnyRate
    ),
    source: provider.label,
    sourceId: model.id,
    enabled: true,
  })
}

export function resolveCachedPrice(model: RemoteModel): string | number {
  return model.pricing.input_cache_read ?? model.pricing.prompt
}
