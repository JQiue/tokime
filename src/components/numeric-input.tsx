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
  ariaLabel?: string
  className?: string
  min?: number
  max?: number
  step?: number
}

/**
 * 数字输入框。
 * 值以字符串受控——这样用户可以正常清空输入框，
 * 而不会像直接绑定 number 那样在删除字符时被强制回填。
 */
export function NumericInput({
  value,
  onValueChange,
  suffix,
  invalid = false,
  ariaLabel,
  className,
  min = 0,
  max,
  step,
}: NumericInputProps) {
  const input = (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      inputMode="decimal"
      value={value}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(suffix ? "pr-8" : undefined, className)}
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

/**
 * 场景字段用的行内表单项：标签 + 控件 + 错误文案。
 * 使用隐式 label 关联（输入框为 label 后代），免去 id 传递。
 */
export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  )
}
