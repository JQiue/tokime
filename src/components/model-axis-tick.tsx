import type { ReactNode } from "react"
import type { YAxisTickContentProps } from "recharts"

import type { AxisLabelItem } from "@/lib/chart-data"

/** 类别轴两行标签各自的最大显示宽度，单位为半角字符数，超出则截断。 */
const NAME_MAX_WIDTH = 26
const SOURCE_MAX_WIDTH = 16

/** 粗略判断全角字符：中日韩文字与全角标号都落在 0x2E80 之后。 */
function isWideChar(char: string): boolean {
  return (char.codePointAt(0) ?? 0) >= 0x2e80
}

/**
 * 按「显示宽度」截断。
 * 若按字符数截断，同样 10 个字的中英文模型名宽度会差一倍。
 */
export function truncateByWidth(text: string, maxWidth: number): string {
  let width = 0
  let result = ""
  for (const char of text) {
    width += isWideChar(char) ? 2 : 1
    if (width > maxWidth) return `${result}…`
    result += char
  }
  return result
}

/**
 * 生成类别轴刻度：第一行模型名，第二行来源。
 * 同一模型在不同渠道价格往往不同，只显示名字无法分辨是哪一条。
 * 截断后仍可通过原生 tooltip 看到全名。
 */
export function createModelTick(
  items: readonly AxisLabelItem[]
): (props: YAxisTickContentProps) => ReactNode {
  return function ModelTick({ x, y, payload }: YAxisTickContentProps) {
    const item = items[payload?.index ?? -1]
    if (!item) return <g />

    return (
      <text x={x} y={y} textAnchor="end" className="text-xs">
        <title>
          {item.source ? `${item.name}（${item.source}）` : item.name}
        </title>
        <tspan x={x} dy="-0.25em" fill="var(--foreground)">
          {truncateByWidth(item.name, NAME_MAX_WIDTH)}
        </tspan>
        {item.source ? (
          <tspan x={x} dy="1.25em" fill="var(--muted-foreground)">
            {truncateByWidth(item.source, SOURCE_MAX_WIDTH)}
          </tspan>
        ) : null}
      </text>
    )
  }
}
