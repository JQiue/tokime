import type { ExchangeRateInfo, ExchangeRateStatus } from "@/lib/types"

/**
 * 免费汇率接口，按顺序尝试，前一个失败则用下一个。
 * 两个都已经过 CORS 实测可被浏览器直接请求，且都不需要 API Key。
 * 注意：api.frankfurter.app 与 api.frankfurter.dev 不是同一个站点，
 * 前者不返回 CORS 头，浏览器下会被拦截，因此只用 .dev 域名。
 */
const PROVIDERS: {
  name: string
  url: string
  parse: (body: unknown) => { rate: number; updatedAt: string } | null
}[] = [
  {
    name: "exchangerate-api.com",
    url: "https://open.er-api.com/v6/latest/USD",
    parse: (body) => {
      if (!isRecord(body)) return null
      // 该接口用 result: "success" 表示成功，失败时也会返回 200。
      if (body.result !== "success") return null
      const rate = readPositive(rateAt(body, "CNY"))
      if (rate === null) return null
      return {
        rate,
        updatedAt:
          typeof body.time_last_update_utc === "string"
            ? body.time_last_update_utc
            : "",
      }
    },
  },
  {
    name: "frankfurter.dev",
    url: "https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY",
    parse: (body) => {
      if (!isRecord(body)) return null
      const rate = readPositive(rateAt(body, "CNY"))
      if (rate === null) return null
      return {
        rate,
        updatedAt: typeof body.date === "string" ? body.date : "",
      }
    },
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function rateAt(body: Record<string, unknown>, code: string): unknown {
  const rates = body.rates
  return isRecord(rates) ? rates[code] : undefined
}

function readPositive(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

/**
 * 依次请求各提供方，返回第一个成功的结果。
 * 全部失败时抛错，由调用方决定是否保留缓存值。
 */
export async function fetchUsdCnyRate(
  signal?: AbortSignal
): Promise<ExchangeRateInfo> {
  let lastError: unknown = null

  for (const provider of PROVIDERS) {
    try {
      const response = await fetch(provider.url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const parsed = provider.parse(await response.json())
      if (!parsed) throw new Error("无法解析响应")

      return {
        rate: String(parsed.rate),
        source: provider.name,
        updatedAt: parsed.updatedAt,
        fetchedAt: Date.now(),
      }
    } catch (error) {
      // 用户主动取消时没必要继续尝试下一个提供方。
      if (signal?.aborted) throw error
      lastError = error
    }
  }

  throw lastError ?? new Error("没有可用的汇率接口")
}

/**
 * 供界面显示的状态文案。
 * `hasCachedValue` 表示输入框里已经有一个可用的汇率（缓存值或用户手填），
 * 失败时据此区分"沿用旧值"和"需要手填"。
 */
export function exchangeRateStatusText(
  status: ExchangeRateStatus,
  source: string,
  hasCachedValue = false
): string {
  if (status === "loading") return "正在获取实时汇率..."
  if (status === "error") {
    return hasCachedValue
      ? "实时汇率获取失败，沿用当前汇率。"
      : "实时汇率获取失败，请手动填写。"
  }
  if (status === "ready") return `实时汇率 · 来源 ${source}`
  return "尚未获取汇率。"
}
