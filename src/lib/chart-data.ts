import { totalCostAtRate } from "@/lib/pricing"
import type { ModelCostRange, UsageRange } from "@/lib/types"

/**
 * 图表配色。
 * 主题里的 --chart-3/4/5 是同一色相的灰色阶，多序列时区分不开，
 * 所以折线 / 堆叠这类需要多个可辨识颜色的图单独用这一组。
 */
const CHART_COLORS = [
  "oklch(0.62 0.17 258)", // 蓝
  "oklch(0.58 0.13 165)", // 青绿
  "oklch(0.65 0.16 85)", // 琥珀
  "oklch(0.56 0.2 300)", // 紫
  "oklch(0.6 0.19 25)", // 砖红
  "oklch(0.55 0.14 210)", // 天蓝
  "oklch(0.6 0.18 350)", // 品红
  "oklch(0.5 0.12 130)", // 橄榄
] as const

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * 折线图的 dataKey。
 * 不能拿模型 ID 当 dataKey：recharts 会把点号当路径分隔符解析，
 * 而 OpenRouter 的 ID 长这样 `openai/gpt-5.6-luna`。
 */
export function seriesKey(index: number): string {
  return `s${index}`
}

/** 类别轴一行标签需要的信息。 */
export interface AxisLabelItem {
  name: string
  source: string
}

/** 区间对比柱图：用浮动条表示「最低 ～ 最高」的成本区间。 */
export interface IntervalDatum {
  id: string
  name: string
  source: string
  bestCost: number
  worstCost: number
  /** 区间跨度，浮动条的实际长度。 */
  span: number
}

export function buildIntervalData(
  results: readonly ModelCostRange[]
): IntervalDatum[] {
  return results.map((result) => ({
    id: result.id,
    name: result.name,
    source: result.source,
    bestCost: result.bestCost,
    worstCost: result.worstCost,
    span: Math.max(0, result.worstCost - result.bestCost),
  }))
}

/** 命中率扫描曲线的取样点：`rate` 为命中率，`s0`/`s1`… 为各序列成本。 */
export type ScanDatum = Record<string, number>

/** 取样步长（百分点）。 */
const SCAN_STEP = 5

/**
 * 命中率扫描曲线的取样点。
 * 成本对命中率线性，理论上两个端点就够画出整条直线；
 * 这里仍按固定步长取样，好让 tooltip 能停在任意刻度上。
 */
export function buildScanData(
  series: readonly ModelCostRange[],
  usageRange: UsageRange
): ScanDatum[] {
  const data: ScanDatum[] = []
  for (let rate = 0; rate <= 100; rate += SCAN_STEP) {
    const datum: ScanDatum = { rate }
    series.forEach((item, index) => {
      datum[seriesKey(index)] = totalCostAtRate(
        item.atMinRate,
        usageRange,
        rate
      )
    })
    data.push(datum)
  }
  return data
}

/** 堆叠图取区间哪一端的成本结构。 */
export type StructureEnd = "min" | "max"

/** 成本结构堆叠图的数据项。 */
export interface StructureDatum {
  id: string
  name: string
  source: string
  normalInputCost: number
  cachedInputCost: number
  outputCost: number
  totalCost: number
}

export function buildStructureData(
  results: readonly ModelCostRange[],
  end: StructureEnd
): StructureDatum[] {
  return results.map((result) => {
    const breakdown = end === "min" ? result.atMinRate : result.atMaxRate
    return {
      id: result.id,
      name: result.name,
      source: result.source,
      normalInputCost: breakdown.normalInputCost,
      cachedInputCost: breakdown.cachedInputCost,
      outputCost: breakdown.outputCost,
      totalCost: breakdown.totalCost,
    }
  })
}

/** 相对差额图的数据项。 */
export interface DeltaDatum {
  id: string
  name: string
  source: string
  extraCost: number
}

/**
 * 相对差额：以最坏情况最低的模型为基准，其余模型要多花多少。
 * results 已按最坏情况升序排列，因此第一个元素的差额恒为 0。
 */
export function buildDeltaData(
  results: readonly ModelCostRange[]
): DeltaDatum[] {
  const baseline = results[0]?.worstCost ?? 0
  return results.map((result) => ({
    id: result.id,
    name: result.name,
    source: result.source,
    extraCost: Math.max(0, result.worstCost - baseline),
  }))
}

/** 散点图上某个坐标处的一个模型。 */
export interface ScatterMember {
  id: string
  name: string
  source: string
  /** 该坐标上各模型的缓存价可能不同，所以它属于成员而非组。 */
  cachedPrice: number
  worstCost: number
  /** 是否为全表最坏情况最低的模型。 */
  isBest: boolean
}

/** 价格散点图的数据项。坐标相同的模型已被合并成一项。 */
export interface ScatterDatum {
  /** 组内第一个模型的 id，仅用作图元的稳定 key。 */
  id: string
  /** 这个坐标上有几个模型。> 1 时说明它们价格完全相同。 */
  count: number
  normalPrice: number
  outputPrice: number
  /**
   * 组内最大的最坏情况成本。
   * 气泡大小代表「这个价位最贵能贵到多少」，取最大值更保守；
   * 若取最小值，一个组里混着贵模型时会被气泡尺寸掩盖。
   */
  worstCost: number
  /** 组内是否包含全表最优模型，用于决定气泡是否高亮。 */
  containsBest: boolean
  members: ScatterMember[]
}

export function buildScatterData(
  results: readonly ModelCostRange[]
): ScatterDatum[] {
  const bestId = results[0]?.id
  const groups = new Map<string, ScatterDatum>()

  for (const result of results) {
    const normalPrice = result.atMinRate.normalPrice
    const outputPrice = result.atMinRate.outputPrice
    const isBest = result.id === bestId
    const member: ScatterMember = {
      id: result.id,
      name: result.name,
      source: result.source,
      cachedPrice: result.atMinRate.cachedPrice,
      worstCost: result.worstCost,
      isBest,
    }

    // results 已按最坏情况升序排列，因此 Map 的插入顺序就是组的展示顺序。
    const key = `${normalPrice}|${outputPrice}`
    const group = groups.get(key)
    if (!group) {
      groups.set(key, {
        id: result.id,
        count: 1,
        normalPrice,
        outputPrice,
        worstCost: result.worstCost,
        containsBest: isBest,
        members: [member],
      })
      continue
    }

    group.count += 1
    group.members.push(member)
    group.worstCost = Math.max(group.worstCost, result.worstCost)
    group.containsBest ||= isBest
  }

  return [...groups.values()]
}
