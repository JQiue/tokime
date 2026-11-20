import type { Model } from "@/lib/types"

/**
 * 模型去重键：导入模型用「来源 + sourceId」标识，手动模型用自身 id。
 * 带上来源是为了让不同平台返回的同名 ID（如 openai/gpt-4.1）互不冲突。
 */
export function modelDedupeKey(
  model: Pick<Model, "source" | "sourceId" | "id">
): string {
  return model.sourceId ? `${model.source}:${model.sourceId}` : model.id
}
