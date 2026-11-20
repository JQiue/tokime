import * as React from "react"

import { deriveUsageRange, toNumber } from "@/lib/pricing"
import { loadScenario, saveScenario } from "@/lib/storage"
import type { ScenarioField, ScenarioState, UsageRange } from "@/lib/types"

export interface UseScenarioResult {
  /** 四个输入字段的原始字符串值。 */
  scenario: ScenarioState
  /** 更新单个字段。 */
  setField: (field: ScenarioField, value: string) => void
  /** 整体替换（用于恢复备份）。 */
  replaceScenario: (scenario: ScenarioState) => void
  /** 由四个字段推导出的用量区间（非法值时按夹取后的结果计算）。 */
  usageRange: UsageRange
}

/**
 * 场景输入状态。字段以字符串保存，允许输入框被清空。
 * 变更后防抖写入 localStorage，避免拖动滑块时每一帧都同步写盘。
 */
export function useScenario(): UseScenarioResult {
  const [scenario, setScenario] = React.useState<ScenarioState>(loadScenario)

  const latestRef = React.useRef(scenario)

  React.useEffect(() => {
    latestRef.current = scenario
  }, [scenario])

  React.useEffect(() => {
    const timer = window.setTimeout(() => saveScenario(scenario), 250)
    return () => window.clearTimeout(timer)
  }, [scenario])

  React.useEffect(() => {
    return () => saveScenario(latestRef.current)
  }, [])

  const setField = React.useCallback((field: ScenarioField, value: string) => {
    setScenario((prev) =>
      prev[field] === value ? prev : { ...prev, [field]: value }
    )
  }, [])

  const replaceScenario = React.useCallback((next: ScenarioState) => {
    setScenario(next)
  }, [])

  const usageRange = React.useMemo<UsageRange>(
    () =>
      deriveUsageRange(
        toNumber(scenario.totalTokens),
        toNumber(scenario.inputRatio),
        toNumber(scenario.cacheHitRateMin),
        toNumber(scenario.cacheHitRateMax)
      ),
    [scenario]
  )

  return { scenario, setField, replaceScenario, usageRange }
}
