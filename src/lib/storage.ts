import { roundImportedPrice, toNumber } from "@/lib/pricing"
import type {
  ExchangeRateInfo,
  Model,
  ScenarioField,
  ScenarioState,
} from "@/lib/types"

export const MODEL_STORAGE_KEY = "token-cost-comparator:v3"
export const SCENARIO_STORAGE_KEY = "token-cost-comparator:v4:scenario"
export const EXCHANGE_RATE_STORAGE_KEY = "token-cost-comparator:v1:usd-cny"

/** 旧版本键名，仅用于一次性迁移，不会在迁移后被删除。 */
export const LEGACY_MODEL_STORAGE_KEYS = [
  "token-cost-comparator:v2",
  "token-cost-comparator:v1",
] as const
export const LEGACY_SCENARIO_STORAGE_KEYS = [
  "token-cost-comparator:v3:scenario",
  "token-cost-comparator:v1:scenario",
] as const

/** 旧 v1 数据的价格单位是「元 / 1K Token」，迁移时需放大 1000 倍。 */
const LEGACY_V1_PRICE_MULTIPLIER = 1000

const LEGACY_V1_KEY = "token-cost-comparator:v1"

export const DEFAULT_SCENARIO: ScenarioState = {
  totalTokens: "1000000000",
  inputRatio: "80",
  // 默认展示 0%~100% 的完整区间，一眼能看出缓存的全部影响范围。
  cacheHitRateMin: "0",
  cacheHitRateMax: "100",
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `model-${Math.random().toString(36).slice(2, 10)}`
}

/** 生成模型 ID（供新增模型使用）。 */
export function createModelId(): string {
  return createId()
}

/** 把存量价格规整为字符串；字符串原样保留，好让非法输入继续触发校验。 */
function toPriceString(value: unknown): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : ""
  }
  if (typeof value === "string") {
    return value
  }
  return ""
}

/**
 * 补齐缺省字段并规整类型。
 * 来自 OpenRouter 的模型价格统一取 4 位有效数字。
 */
export function normalizeModel(model: UnknownRecord): Model {
  const source = String(model.source || "手动")
  const sourceId = String(model.sourceId || "")
  const normalizePrice = (value: unknown) =>
    sourceId
      ? String(roundImportedPrice(toNumber(value)))
      : toPriceString(value)

  return {
    id: String(model.id || createId()),
    name: String(model.name || "未命名模型"),
    normalPrice: normalizePrice(model.normalPrice),
    cachedPrice: normalizePrice(model.cachedPrice),
    outputPrice: normalizePrice(model.outputPrice),
    enabled: model.enabled !== false,
    source,
    sourceId,
  }
}

/**
 * 规整存量模型列表。
 * 非数组（没有数据）返回 null 以触发回退；空数组是合法的「用户删光了」状态，
 * 必须原样返回，否则会在下次加载时把旧版本的键重新迁移回来。
 */
function normalizeModelList(value: unknown): Model[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(isRecord).map((model) => normalizeModel(model))
}

/**
 * 读取模型列表：v3 → v2 → v1（价格 ×1000）→ 空列表。
 * 迁移成功后会写入 v3，旧键保留以免不可逆地丢失用户数据。
 * 不再内置示例模型：模型价格变动频繁，预设值很快就会过时。
 */
export function loadModels(): Model[] {
  const current = normalizeModelList(readJson(MODEL_STORAGE_KEY))
  if (current) return current

  for (const key of LEGACY_MODEL_STORAGE_KEYS) {
    const legacy = normalizeModelList(readJson(key))
    if (!legacy) continue

    const migrated =
      key === LEGACY_V1_KEY
        ? legacy.map((model) => ({
            ...model,
            normalPrice: String(
              toNumber(model.normalPrice) * LEGACY_V1_PRICE_MULTIPLIER
            ),
            cachedPrice: String(
              toNumber(model.cachedPrice) * LEGACY_V1_PRICE_MULTIPLIER
            ),
            outputPrice: String(
              toNumber(model.outputPrice) * LEGACY_V1_PRICE_MULTIPLIER
            ),
          }))
        : legacy

    saveModels(migrated)
    return migrated
  }

  return []
}

export function saveModels(models: Model[]): void {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(models))
  } catch {
    // 隐私模式或配额耗尽时静默失败，不影响本次会话使用。
  }
}

/**
 * 读取场景字段。只取当前保留的四个字段，逐项回落到默认值。
 * 兼容旧的单值命中率：上下限取其同值，语义与旧版完全一致（区间宽度为 0）。
 */
export function loadScenario(): ScenarioState {
  let raw = readJson(SCENARIO_STORAGE_KEY)
  if (!isRecord(raw)) {
    for (const key of LEGACY_SCENARIO_STORAGE_KEYS) {
      const legacy = readJson(key)
      if (isRecord(legacy)) {
        raw = legacy
        break
      }
    }
  }

  const scenario: ScenarioState = { ...DEFAULT_SCENARIO }
  if (!isRecord(raw)) return scenario

  const fields: ScenarioField[] = [
    "totalTokens",
    "inputRatio",
    "cacheHitRateMin",
    "cacheHitRateMax",
  ]
  for (const field of fields) {
    const value = raw[field]
    if (typeof value === "string" && value !== "") {
      scenario[field] = value
    }
  }

  const legacyRate = raw.cacheHitRate
  if (typeof legacyRate === "string" && legacyRate !== "") {
    if (raw.cacheHitRateMin === undefined) scenario.cacheHitRateMin = legacyRate
    if (raw.cacheHitRateMax === undefined) scenario.cacheHitRateMax = legacyRate
  }

  return scenario
}

export function saveScenario(scenario: ScenarioState): void {
  try {
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario))
  } catch {
    // 同上。
  }
}

/**
 * 读取上次成功抓取的汇率。字段不全或数值非法时返回 null，
 * 由调用方回落到默认汇率而不是把一个坏值写进价格。
 */
export function loadExchangeRate(): ExchangeRateInfo | null {
  const raw = readJson(EXCHANGE_RATE_STORAGE_KEY)
  if (!isRecord(raw)) return null
  if (typeof raw.rate !== "string" || raw.rate === "") return null
  if (toNumber(raw.rate) <= 0) return null

  return {
    rate: raw.rate,
    source: typeof raw.source === "string" ? raw.source : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    fetchedAt: toNumber(raw.fetchedAt),
  }
}

export function saveExchangeRate(info: ExchangeRateInfo): void {
  try {
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, JSON.stringify(info))
  } catch {
    // 同上。
  }
}
