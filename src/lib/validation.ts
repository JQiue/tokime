import { toNumber } from "@/lib/pricing"
import type {
  Model,
  ModelError,
  ModelErrors,
  ScenarioErrors,
  ScenarioState,
} from "@/lib/types"

/** 字段是否为空或不是有限数字。 */
function isBlankOrInvalid(value: string): boolean {
  return value.trim() === "" || !Number.isFinite(Number(value))
}

/** 是否为合法的 0~100 百分比。 */
function isPercentInRange(value: string): boolean {
  if (isBlankOrInvalid(value)) return false
  const parsed = Number(value)
  return parsed >= 0 && parsed <= 100
}

/** 校验场景字段，返回按字段索引的错误消息。 */
export function validateScenario(scenario: ScenarioState): ScenarioErrors {
  const errors: ScenarioErrors = {}

  if (
    isBlankOrInvalid(scenario.totalTokens) ||
    toNumber(scenario.totalTokens) < 0
  ) {
    errors.totalTokens = "总 Token 必须是非负数字。"
  }

  if (!isPercentInRange(scenario.inputRatio)) {
    errors.inputRatio = "输入占比必须在 0% 到 100% 之间。"
  }

  const minValid = isPercentInRange(scenario.cacheHitRateMin)
  if (!minValid) {
    errors.cacheHitRateMin = "缓存命中率必须在 0% 到 100% 之间。"
  }

  const maxValid = isPercentInRange(scenario.cacheHitRateMax)
  if (!maxValid) {
    errors.cacheHitRateMax = "缓存命中率必须在 0% 到 100% 之间。"
  }

  // 两端各自合法时才判断顺序，避免同时抛出互相矛盾的提示。
  if (
    minValid &&
    maxValid &&
    Number(scenario.cacheHitRateMin) > Number(scenario.cacheHitRateMax)
  ) {
    errors.cacheHitRateRange = "缓存命中率的下限不能大于上限。"
  }

  return errors
}

/** 校验模型列表，返回全局错误与按模型 ID 索引的字段错误。 */
export function validateModels(models: Model[]): ModelErrors {
  const general: string[] = []
  const byId: Record<string, ModelError> = {}

  const enabledModels = models.filter((model) => model.enabled)
  if (enabledModels.length === 0) {
    // 一个模型都没有时不算错误：首次打开就是这个状态，
    // 模型列表区域已经有引导文案，弹红框反而像出错了。
    if (models.length > 0) {
      general.push("请至少启用一个模型参与比较。")
    }
    return { general, byId }
  }

  for (const model of enabledModels) {
    const error: ModelError = {}

    if (!model.name.trim()) {
      error.name = "模型名称不能为空。"
    }

    const prices = [model.normalPrice, model.cachedPrice, model.outputPrice]
    if (
      prices.some(isBlankOrInvalid) ||
      prices.some((price) => Number(price) < 0)
    ) {
      error.price = `${model.name || "未命名模型"} 的价格必须是非负数字。`
    }

    if (Object.keys(error).length > 0) {
      byId[model.id] = error
    }
  }

  return { general, byId }
}

/** 是否没有任何校验错误。 */
export function hasNoErrors(
  scenarioErrors: ScenarioErrors,
  modelErrors: ModelErrors
): boolean {
  return (
    Object.keys(scenarioErrors).length === 0 &&
    modelErrors.general.length === 0 &&
    Object.keys(modelErrors.byId).length === 0
  )
}

/** 汇总所有错误消息为可展示的字符串数组（去重）。 */
export function collectMessages(
  scenarioErrors: ScenarioErrors,
  modelErrors: ModelErrors
): string[] {
  const messages = [
    ...Object.values(scenarioErrors),
    ...modelErrors.general,
    ...Object.values(modelErrors.byId).flatMap((error) => Object.values(error)),
  ].filter((message): message is string => Boolean(message))

  return [...new Set(messages)]
}
