const numberFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
})

/** 千分位数字，最多 2 位小数。 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/**
 * 人民币金额。常规金额固定保留 2 位小数——百分比步长精确到 0.1% 后
 * 成本会算出任意位数的小数，若按原值渲染会让同一列出现 2/3/4 位混排；
 * 只有小于 1 分的金额才放宽到 4 位，避免小额成本被四舍五入成 ¥0.00。
 * 非有限值时返回占位符。
 */
export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "¥--"
  return `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) >= 0.01 ? 2 : 4,
  })}`
}

/**
 * 坐标轴刻度用的紧凑金额。
 * 轴上空间有限，`¥8,921,000.00` 这种全精度数字会互相重叠。
 */
export function formatMoneyCompact(value: number): string {
  if (!Number.isFinite(value)) return "¥--"
  const abs = Math.abs(value)
  if (abs >= 10_000) {
    const wan = value / 10_000
    return `¥${wan.toLocaleString("zh-CN", {
      maximumFractionDigits: Math.abs(wan) < 100 ? 1 : 0,
    })}万`
  }
  if (abs >= 1000) return `¥${Math.round(value).toLocaleString("zh-CN")}`
  if (abs >= 1) {
    // 1~1000 之间的刻度用 3 位有效数字：直接取整会让 1.05 和 1.4
    // 都变成「¥1」，同一根轴上出现两个一模一样的刻度。
    return `¥${value.toLocaleString("zh-CN", {
      maximumSignificantDigits: 3,
    })}`
  }
  return formatMoney(value)
}

/**
 * 区间文案。两端数值相等时只渲染一个值，
 * 避免出现「¥1.00 ～ ¥1.00」这种噪音。
 */
export function formatRange(
  a: number,
  b: number,
  format: (value: number) => string
): string {
  const low = Math.min(a, b)
  const high = Math.max(a, b)
  return low === high ? format(low) : `${format(low)} ～ ${format(high)}`
}

/** 把 OpenRouter 的「美元 / 1 Token」换算为「美元 / 1M Token」并格式化。 */
export function formatUsdPerMillion(value: string | number): string {
  return `$${usdPerMillion(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`
}

/** 把「美元 / 1 Token」换算为「美元 / 1M Token」。 */
export function usdPerMillion(value: string | number): number {
  return Number(value) * 1_000_000
}
