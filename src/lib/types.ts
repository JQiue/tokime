/** 价格单位统一为「元 / 1M Token」。 */

/**
 * 用户维护的一个待比较模型。
 * 价格以字符串保存：既允许输入框被清空（清空属于校验错误而非 0），
 * 也避免受控 `type="number"` 直接绑 number 时无法删除字符的问题。
 */
export interface Model {
  id: string
  name: string
  /** 普通输入价格（元 / 1M Token） */
  normalPrice: string
  /** 缓存输入价格（元 / 1M Token） */
  cachedPrice: string
  /** 输出价格（元 / 1M Token） */
  outputPrice: string
  enabled: boolean
  /** 展示用来源文案，如「手动」「OpenRouter」 */
  source: string
  /** 来自 OpenRouter 时为该平台的模型 ID，手动创建时为空串 */
  sourceId: string
}

/** 模型的数值化视图，供成本计算使用。 */
export interface PricedModel {
  normalPrice: number
  cachedPrice: number
  outputPrice: number
}

/** 参与比较的模型附加分项成本后的结果。 */
export interface CostBreakdown extends PricedModel {
  /** 对应模型 ID，用于列表 key */
  id: string
  name: string
  normalInputCost: number
  cachedInputCost: number
  outputCost: number
  totalCost: number
}

/** 由总 Token / 输入占比 / 缓存命中率推导出的 Token 切分。 */
export interface UsageSplit {
  normalInputTokens: number
  cachedInputTokens: number
  outputTokens: number
}

/** 缓存命中率区间两端各自对应的 Token 切分。 */
export interface UsageRange {
  /** 由「总 Token × 输入占比」拆出的输入 Token（区间两端相同）。 */
  inputTokens: number
  /** 输出 Token（区间两端相同）。 */
  outputTokens: number
  /** 规整后的命中率区间下限（0~100），用于图表标注区间范围。 */
  minRate: number
  /** 规整后的命中率区间上限（0~100）。 */
  maxRate: number
  /** 命中率下限：缓存命中更少，普通输入成本更高 */
  atMinRate: UsageSplit
  /** 命中率上限：缓存命中更多，缓存输入成本更高 */
  atMaxRate: UsageSplit
}

/** 单个模型在命中率区间内取到的成本区间。 */
export interface ModelCostRange {
  /** 对应模型 ID，用于列表 key */
  id: string
  name: string
  /** 展示用来源文案。同名模型来自不同渠道时靠它区分。 */
  source: string
  atMinRate: CostBreakdown
  atMaxRate: CostBreakdown
  /** 区间内较低的总成本 */
  bestCost: number
  /** 区间内较高的总成本 */
  worstCost: number
  /** 区间跨度，即缓存命中率对总成本的最大影响 */
  cacheImpact: number
}

/** 场景输入字段名。全部以字符串保存，以允许输入框被清空。 */
export type ScenarioField =
  "totalTokens" | "inputRatio" | "cacheHitRateMin" | "cacheHitRateMax"

/** 场景输入状态。 */
export type ScenarioState = Record<ScenarioField, string>

/** 场景校验错误。cacheHitRateRange 是「下限大于上限」的跨字段错误。 */
export interface ScenarioErrors {
  totalTokens?: string
  inputRatio?: string
  cacheHitRateMin?: string
  cacheHitRateMax?: string
  cacheHitRateRange?: string
}

/** 模型级校验错误。 */
export interface ModelError {
  name?: string
  price?: string
}

/** 模型校验结果：general 为全局错误，byId 为按模型 ID 索引的字段错误。 */
export interface ModelErrors {
  general: string[]
  byId: Record<string, ModelError>
}

/** OpenRouter 返回的模型条目（仅取用到的字段）。 */
export interface OpenRouterModel {
  id: string
  name: string
  pricing: {
    prompt: string | number
    completion: string | number
    input_cache_read?: string | number | null
  }
}

/** OpenRouter 模型列表的加载状态。 */
export type OpenRouterStatus = "idle" | "loading" | "ready" | "error"

/** 一次成功的汇率抓取结果（rate 以字符串保存，便于直接受控输入框）。 */
export interface ExchangeRateInfo {
  rate: string
  /** 数据提供方名称，用于界面标注来源。 */
  source: string
  /** 提供方给出的汇率日期 / 时间，可能为空串。 */
  updatedAt: string
  /** 本地抓取成功的时间戳，用于判断缓存是否过期。 */
  fetchedAt: number
}

/** 实时汇率的加载状态。 */
export type ExchangeRateStatus = "idle" | "loading" | "ready" | "error"
