import type {
  CostBreakdown,
  Model,
  ModelCostRange,
  PricedModel,
  UsageRange,
  UsageSplit,
} from "@/lib/types"

/** 把任意输入安全转换为有限数字，失败时返回 0。 */
export function toNumber(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/**
 * 把百分比字段的字符串解析成滑块的受控值。
 * 空值与非法值回落到 0，超出范围则夹取到 0~100；
 * 结果保留一位小数，避免滑块步长为 0.1 时累积出浮点误差。
 * 注意这里只服务 slider 的显示，校验仍然以原始字符串为准。
 */
export function toPercentValue(value: string): number {
  const clamped = Math.min(100, Math.max(0, toNumber(value)))
  return Math.round(clamped * 10) / 10
}

export function calculateTokenSplit(
  inputTokens: number,
  outputTokens: number,
  cacheHitRate: number
): UsageSplit {
  const safeRate = Math.min(100, Math.max(0, cacheHitRate)) / 100
  const safeInput = Math.max(0, inputTokens)
  const cachedInputTokens = safeInput * safeRate
  return {
    normalInputTokens: safeInput - cachedInputTokens,
    cachedInputTokens,
    outputTokens: Math.max(0, outputTokens),
  }
}

/**
 * 由「总 Token × 输入占比」拆出输入 / 输出，再把输入按命中率区间的两端
 * 各切分一次，得到成本区间的两个端点。
 * 这是本工具唯一的用量推导入口；两端顺序会被规整，调用方无需保证大小。
 */
export function deriveUsageRange(
  totalTokens: number,
  inputRatio: number,
  cacheHitRateMin: number,
  cacheHitRateMax: number
): UsageRange {
  const safeTotal = Math.max(0, totalTokens)
  const safeRatio = Math.min(100, Math.max(0, inputRatio)) / 100
  const inputTokens = safeTotal * safeRatio
  const outputTokens = safeTotal - inputTokens
  const lowerRate = Math.min(cacheHitRateMin, cacheHitRateMax)
  const upperRate = Math.max(cacheHitRateMin, cacheHitRateMax)
  return {
    inputTokens,
    outputTokens,
    minRate: lowerRate,
    maxRate: upperRate,
    atMinRate: calculateTokenSplit(inputTokens, outputTokens, lowerRate),
    atMaxRate: calculateTokenSplit(inputTokens, outputTokens, upperRate),
  }
}

/** 把状态中以字符串保存的价格解析为数值。 */
export function toPricedModel(model: Model): PricedModel {
  return {
    normalPrice: toNumber(model.normalPrice),
    cachedPrice: toNumber(model.cachedPrice),
    outputPrice: toNumber(model.outputPrice),
  }
}

/** 按价格与 Token 切分求总成本，供下面两个入口共用。 */
function sumCost(priced: PricedModel, split: UsageSplit): number {
  return (
    (split.normalInputTokens / 1_000_000) * priced.normalPrice +
    (split.cachedInputTokens / 1_000_000) * priced.cachedPrice +
    (split.outputTokens / 1_000_000) * priced.outputPrice
  )
}

/** 计算单个模型在给定用量下的成本明细。 */
export function calculateCost(model: Model, usage: UsageSplit): CostBreakdown {
  const priced = toPricedModel(model)
  const normalInputCost =
    (usage.normalInputTokens / 1_000_000) * priced.normalPrice
  const cachedInputCost =
    (usage.cachedInputTokens / 1_000_000) * priced.cachedPrice
  const outputCost = (usage.outputTokens / 1_000_000) * priced.outputPrice
  return {
    id: model.id,
    name: model.name,
    ...priced,
    normalInputCost,
    cachedInputCost,
    outputCost,
    totalCost: sumCost(priced, usage),
  }
}

/**
 * 在任意缓存命中率下重算总成本。
 * 成本对命中率是线性的，所以扫描曲线必然是一条直线；
 * 这里仍按定义重算而不是在两端之间做线性插值，避免额外引入浮点误差。
 */
export function totalCostAtRate(
  priced: PricedModel,
  usageRange: UsageRange,
  cacheHitRate: number
): number {
  return sumCost(
    priced,
    calculateTokenSplit(
      usageRange.inputTokens,
      usageRange.outputTokens,
      cacheHitRate
    )
  )
}

/**
 * 导入模型的价格按**有效数字**保留 4 位。
 * 不能按小数位数截断：便宜模型的价格可以低到 ¥0.001/1M，
 * `toFixed(2)` 会把它压成 ¥0.00；反过来对贵的模型保留 6 位小数，
 * 又远超源数据（OpenRouter 只给 1 位有效数字的美元 / token）的精度，
 * 属于虚假精度。按有效数字截断能自动适配数量级。
 */
export function roundImportedPrice(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Number(value.toPrecision(4))
}

/**
 * 把启用中的模型转换成成本区间，并按「最坏情况总成本」升序排列。
 * 之所以只按最坏情况排序：这样排在第一的模型在整个命中率区间内
 * 都不会比其它模型贵，是一个可解释的保证。
 */
export function rankModelCosts(
  models: Model[],
  usageRange: UsageRange
): ModelCostRange[] {
  return models
    .filter((model) => model.enabled)
    .map((model) => {
      const atMinRate = calculateCost(model, usageRange.atMinRate)
      const atMaxRate = calculateCost(model, usageRange.atMaxRate)
      const bestCost = Math.min(atMinRate.totalCost, atMaxRate.totalCost)
      const worstCost = Math.max(atMinRate.totalCost, atMaxRate.totalCost)
      return {
        id: model.id,
        name: model.name,
        source: model.source,
        atMinRate,
        atMaxRate,
        bestCost,
        worstCost,
        cacheImpact: worstCost - bestCost,
      }
    })
    .sort((a, b) => a.worstCost - b.worstCost)
}
