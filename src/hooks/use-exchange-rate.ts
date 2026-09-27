import * as React from "react"

import { fetchUsdCnyRate } from "@/lib/exchange-rate"
import { DEFAULT_USD_CNY_RATE } from "@/lib/openrouter"
import { loadExchangeRate, saveExchangeRate } from "@/lib/storage"
import type { ExchangeRateInfo, ExchangeRateStatus } from "@/lib/types"

export interface UseExchangeRateResult {
  /** 当前汇率字符串，可直接绑定输入框。 */
  rate: string
  setRate: (rate: string) => void
  status: ExchangeRateStatus
  /** 数据来源与更新时间，用于界面标注。 */
  info: ExchangeRateInfo | null
  /** 手动重新抓取。 */
  refresh: () => void
}

/**
 * 美元兑人民币汇率。
 * 初次渲染立刻用本地缓存（缺失则用默认值）显示，同时后台抓取实时值；
 * 抓取成功后写入缓存。用户手动改过汇率后不再被自动抓取覆盖。
 */
export function useExchangeRate(): UseExchangeRateResult {
  const cached = React.useMemo(() => loadExchangeRate(), [])
  const [rate, setRateState] = React.useState(
    () => cached?.rate ?? DEFAULT_USD_CNY_RATE
  )
  const [info, setInfo] = React.useState<ExchangeRateInfo | null>(cached)
  // 初始即为 loading：挂载时必定发起一次抓取，这样 effect 里就不必
  // 同步 setState（否则会触发级联渲染）。
  const [status, setStatus] = React.useState<ExchangeRateStatus>("loading")

  // 用户是否手动改过：改过就不再被自动抓取覆盖。
  const editedRef = React.useRef(false)
  const abortRef = React.useRef<AbortController | null>(null)

  /** 中断上一次请求并开启新的 AbortController；本身不碰 state。 */
  const startRequest = React.useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return controller
  }, [])

  /** 写入一次抓取结果。 */
  const applyRate = React.useCallback((next: ExchangeRateInfo) => {
    setInfo(next)
    setStatus("ready")
    // 抓取失败时会保留缓存值，因此只有成功才写盘。
    saveExchangeRate(next)
    if (!editedRef.current) {
      setRateState(next.rate)
    }
  }, [])

  // 挂载后自动抓取。setState 只出现在 promise 回调里，不同步执行，
  // 因此不会造成级联渲染。
  React.useEffect(() => {
    const controller = startRequest()
    fetchUsdCnyRate(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) applyRate(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error")
      })
    return () => {
      controller.abort()
    }
  }, [startRequest, applyRate])

  const setRate = React.useCallback((next: string) => {
    editedRef.current = true
    setRateState(next)
  }, [])

  const refresh = React.useCallback(() => {
    // 手动刷新视为放弃本地手改值，让新汇率覆盖输入框。
    editedRef.current = false
    const controller = startRequest()
    setStatus("loading")
    fetchUsdCnyRate(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) applyRate(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error")
      })
  }, [startRequest, applyRate])

  return { rate, setRate, status, info, refresh }
}
