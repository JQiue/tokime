import { TokenCostComparator } from "@/components/token-cost-comparator"
import { ToastProvider } from "@/components/ui/toast"

export function App() {
  return (
    <ToastProvider>
      <TokenCostComparator />
    </ToastProvider>
  )
}

export default App
