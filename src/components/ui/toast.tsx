import * as React from "react"

import { cn } from "@/lib/utils"

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastOptions {
  message: string
  action?: ToastAction
  /** 自动关闭时间，默认 5 秒；带撤销操作时建议 8 秒。 */
  duration?: number
}

interface ToastState extends ToastOptions {
  id: number
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a <ToastProvider />")
  }
  return context
}

/**
 * 轻量 toast：用于「已导入 / 已删除」等操作结果和撤销入口。
 * 同一时间只展示一条，新的会替换旧的。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = React.useState<ToastState | null>(null)
  const idRef = React.useRef(0)

  const toast = React.useCallback((options: ToastOptions) => {
    idRef.current += 1
    setCurrent({ ...options, id: idRef.current })
  }, [])

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={current} onDismiss={() => setCurrent(null)} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastState | null
  onDismiss: () => void
}) {
  React.useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(
      onDismiss,
      toast.duration ?? (toast.action ? 8000 : 5000)
    )
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="status"
        className={cn(
          "pointer-events-auto flex max-w-md items-center gap-3 rounded-lg bg-foreground px-3.5 py-2.5 text-sm text-background shadow-lg",
          "animate-in fade-in-0 slide-in-from-bottom-2"
        )}
      >
        <span className="min-w-0 break-words">{toast.message}</span>
        {toast.action ? (
          <button
            type="button"
            className="shrink-0 font-medium underline underline-offset-3 hover:opacity-80"
            onClick={() => {
              toast.action?.onClick()
              onDismiss()
            }}
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
    </div>
  )
}
