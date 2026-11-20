import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface NumericInputProps {
  /** 原始字符串值，允许为空。 */
  value: string
  onValueChange: (value: string) => void
  /** 输入框内的单位后缀，如 "%"。 */
  suffix?: string
  /** 校验失败时置为 true，渲染 aria-invalid 样式。 */
  invalid?: boolean
  /** 失焦时给整数部分加千分位，聚焦编辑时显示原始值。 */
  grouped?: boolean
  ariaLabel?: string
  className?: string
}

/** 只给合法数字的整数部分加千分位，保留小数原样。 */
function groupDigits(value: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value
  const [integer, fraction] = value.split(".")
  const negative = integer.startsWith("-")
  const digits = negative ? integer.slice(1) : integer
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${negative ? "-" : ""}${grouped}${fraction === undefined ? "" : `.${fraction}`}`
}

/**
 * 数字输入框。
 * 值以字符串受控——这样用户可以正常清空输入框，
 * 而不会像直接绑定 number 那样在删除字符时被强制回填。
 * 用 text + inputMode 替代 number，避免窄单元格里出现占位的 spinner，
 * 也避免页面滚动时鼠标滚轮误改已聚焦的价格。
 */
export function NumericInput({
  value,
  onValueChange,
  suffix,
  invalid = false,
  grouped = false,
  ariaLabel,
  className,
}: NumericInputProps) {
  const [focused, setFocused] = React.useState(false)
  const display = grouped && !focused ? groupDigits(value) : value

  const input = (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      onChange={(event) => onValueChange(event.target.value.replace(/,/g, ""))}
      className={cn("tabular-nums", suffix ? "pr-8" : undefined, className)}
    />
  )

  if (!suffix) return input

  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
        {suffix}
      </span>
    </div>
  )
}
