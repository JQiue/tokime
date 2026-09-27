import * as React from "react"

import { Field, NumericInput } from "@/components/numeric-input"
import { Slider } from "@/components/ui/slider"
import { toPercentValue } from "@/lib/pricing"
import type { ScenarioErrors, ScenarioField, ScenarioState } from "@/lib/types"

export interface ScenarioFieldsProps {
  scenario: ScenarioState
  errors: ScenarioErrors
  onChange: (field: ScenarioField, value: string) => void
}

/** 滑块上方的标题行：左侧字段名，右侧当前取值。 */
function SliderLabelRow({
  label,
  labelId,
  value,
  invalid,
}: {
  label: string
  labelId?: string
  value: string
  invalid?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        id={labelId}
        className="text-sm font-medium"
        data-invalid={invalid ? "" : undefined}
      >
        {label}
      </span>
      <span className="text-sm text-muted-foreground tabular-nums">
        {value}
      </span>
    </div>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <span className="text-xs text-destructive">{error}</span>
}

/**
 * 单值百分比字段：只有滑块，当前取值直接展示在标题行右侧。
 * 滑块受控值必须是数组——Base UI 用引用相等判断变化，故需记忆化。
 * 步长 0.1% 足够精确，但逐格拖动/按键太慢，因此把 PageUp/PageDown
 * 与 Shift+方向键留给 largeStep（1%）。
 */
function PercentSliderField({
  label,
  value,
  error,
  onChange,
}: {
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const labelId = React.useId()
  const percent = toPercentValue(value)
  const sliderValue = React.useMemo(() => [percent], [percent])

  return (
    <div className="flex flex-col gap-1.5">
      <SliderLabelRow
        label={label}
        labelId={labelId}
        value={`${percent}%`}
        invalid={Boolean(error)}
      />
      <Slider
        aria-labelledby={labelId}
        className="min-w-32"
        value={sliderValue}
        onValueChange={(next) =>
          onChange(String(typeof next === "number" ? next : next[0]))
        }
        min={0}
        max={100}
        step={0.1}
        largeStep={1}
      />
      <FieldError error={error} />
    </div>
  )
}

/**
 * 区间百分比字段：滑块传两个值即渲染两个 thumb，分别代表下限与上限。
 * thumb 采用默认的 push 行为，拖动时不会互相穿越。
 */
function PercentRangeField({
  label,
  minValue,
  maxValue,
  minError,
  maxError,
  rangeError,
  onChange,
}: {
  label: string
  minValue: string
  maxValue: string
  minError?: string
  maxError?: string
  rangeError?: string
  onChange: (field: ScenarioField, value: string) => void
}) {
  const low = toPercentValue(minValue)
  const high = toPercentValue(maxValue)

  // 同上：区间滑块同样需要记忆化数组，否则拖动时会被反复重置。
  const sliderValue = React.useMemo(() => [low, high], [low, high])
  // 逐个 thumb 命名，让读屏能区分下限与上限。
  const thumbLabels = React.useMemo(
    () => [`${label}下限`, `${label}上限`],
    [label]
  )
  // 下限大于上限属于区间级错误，此时两个端点各自都是合法的。
  const invalid = Boolean(minError || maxError || rangeError)

  return (
    <div className="flex flex-col gap-1.5">
      <SliderLabelRow
        label={label}
        value={`${low}% ～ ${high}%`}
        invalid={invalid}
      />
      <Slider
        aria-label={label}
        className="min-w-32"
        value={sliderValue}
        thumbLabels={thumbLabels}
        onValueChange={(next) => {
          if (typeof next === "number") return
          onChange("cacheHitRateMin", String(next[0]))
          onChange("cacheHitRateMax", String(next[1]))
        }}
        min={0}
        max={100}
        step={0.1}
        largeStep={1}
      />
      <FieldError error={minError ?? maxError ?? rangeError} />
    </div>
  )
}

/** 用量场景输入：总 Token 精确输入，输入占比与缓存命中率用滑块调节。 */
export function ScenarioFields({
  scenario,
  errors,
  onChange,
}: ScenarioFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="总 Token" error={errors.totalTokens}>
        <NumericInput
          ariaLabel="总 Token"
          value={scenario.totalTokens}
          onValueChange={(value) => onChange("totalTokens", value)}
          invalid={Boolean(errors.totalTokens)}
          step={1_000_000}
        />
      </Field>

      <PercentSliderField
        label="输入占比"
        value={scenario.inputRatio}
        error={errors.inputRatio}
        onChange={(value) => onChange("inputRatio", value)}
      />

      <PercentRangeField
        label="输入缓存命中率"
        minValue={scenario.cacheHitRateMin}
        maxValue={scenario.cacheHitRateMax}
        minError={errors.cacheHitRateMin}
        maxError={errors.cacheHitRateMax}
        rangeError={errors.cacheHitRateRange}
        onChange={onChange}
      />
    </div>
  )
}
