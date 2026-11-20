import * as React from "react"

import { NumericInput } from "@/components/numeric-input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { formatTokenAmount } from "@/lib/format"
import { toNumber, toPercentValue } from "@/lib/pricing"
import type { ScenarioErrors, ScenarioField, ScenarioState } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface ScenarioFieldsProps {
  scenario: ScenarioState
  errors: ScenarioErrors
  onChange: (field: ScenarioField, value: string) => void
}

const TOTAL_PRESETS = [
  { label: "100 万", value: 1_000_000 },
  { label: "1,000 万", value: 10_000_000 },
  { label: "1 亿", value: 100_000_000 },
  { label: "10 亿", value: 1_000_000_000 },
] as const

const RATIO_PRESETS = [50, 80, 90] as const

const CACHE_PRESETS = [
  { label: "0% ～ 100%", min: "0", max: "100" },
  { label: "50% ～ 100%", min: "50", max: "100" },
  { label: "80% ～ 100%", min: "80", max: "100" },
] as const

function PresetButton({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="xs"
      variant={active ? "secondary" : "outline"}
      className={cn(
        "h-7 px-2 text-xs font-normal",
        !active && "text-muted-foreground"
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/** 滑块上方的标题行：左侧字段名，右侧取值或精确输入框。 */
function SliderLabelRow({
  label,
  labelId,
  invalid,
  children,
}: {
  label: string
  labelId?: string
  invalid?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        id={labelId}
        className={cn(
          "text-sm font-medium",
          invalid ? "text-destructive" : undefined
        )}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <span className="text-xs text-destructive">{error}</span>
}

/**
 * 单值百分比字段：滑块 + 精确输入框。
 * 滑块受控值必须是数组——Base UI 用引用相等判断变化，故需记忆化。
 * 步长 0.1% 足够精确，但逐格拖动/按键太慢，因此把 PageUp/PageDown
 * 与 Shift+方向键留给 largeStep（1%）。
 */
function PercentSliderField({
  label,
  value,
  error,
  presets,
  onChange,
}: {
  label: string
  value: string
  error?: string
  presets: readonly number[]
  onChange: (value: string) => void
}) {
  const labelId = React.useId()
  const percent = toPercentValue(value)
  const sliderValue = React.useMemo(() => [percent], [percent])

  return (
    <div className="flex flex-col gap-1.5">
      <SliderLabelRow label={label} labelId={labelId} invalid={Boolean(error)}>
        <div className="w-20">
          <NumericInput
            ariaLabel={label}
            value={value}
            invalid={Boolean(error)}
            suffix="%"
            className="h-7 text-right"
            onValueChange={onChange}
          />
        </div>
      </SliderLabelRow>
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
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => (
          <PresetButton
            key={preset}
            active={percent === preset}
            onClick={() => onChange(String(preset))}
          >
            {preset}%
          </PresetButton>
        ))}
      </div>
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
      <SliderLabelRow label={label} invalid={invalid}>
        <span className="text-sm text-muted-foreground tabular-nums">
          {low}% ～ {high}%
        </span>
      </SliderLabelRow>
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
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">下限</span>
          <span className="min-w-0 flex-1">
            <NumericInput
              ariaLabel={`${label}下限`}
              value={minValue}
              invalid={Boolean(minError || rangeError)}
              suffix="%"
              className="h-7 min-w-0 text-right"
              onValueChange={(next) => onChange("cacheHitRateMin", next)}
            />
          </span>
        </label>
        <label className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">上限</span>
          <span className="min-w-0 flex-1">
            <NumericInput
              ariaLabel={`${label}上限`}
              value={maxValue}
              invalid={Boolean(maxError || rangeError)}
              suffix="%"
              className="h-7 min-w-0 text-right"
              onValueChange={(next) => onChange("cacheHitRateMax", next)}
            />
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {CACHE_PRESETS.map((preset) => (
          <PresetButton
            key={preset.label}
            active={low === Number(preset.min) && high === Number(preset.max)}
            onClick={() => {
              onChange("cacheHitRateMin", preset.min)
              onChange("cacheHitRateMax", preset.max)
            }}
          >
            {preset.label}
          </PresetButton>
        ))}
      </div>
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
  const total = toNumber(scenario.totalTokens)
  const hasTotal = scenario.totalTokens.trim() !== ""

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">总 Token</span>
          <NumericInput
            ariaLabel="总 Token"
            value={scenario.totalTokens}
            grouped
            invalid={Boolean(errors.totalTokens)}
            onValueChange={(value) => onChange("totalTokens", value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {TOTAL_PRESETS.map((preset) => (
            <PresetButton
              key={preset.value}
              active={hasTotal && total === preset.value}
              onClick={() => onChange("totalTokens", String(preset.value))}
            >
              {preset.label}
            </PresetButton>
          ))}
          {hasTotal && total > 0 ? (
            <span className="text-xs text-muted-foreground">
              = {formatTokenAmount(total)} Token
            </span>
          ) : null}
        </div>
        <FieldError error={errors.totalTokens} />
      </div>

      <PercentSliderField
        label="输入占比"
        value={scenario.inputRatio}
        error={errors.inputRatio}
        presets={RATIO_PRESETS}
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
