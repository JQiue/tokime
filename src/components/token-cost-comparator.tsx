import * as React from "react"

import { CostResultSection } from "@/components/cost-result-section"
import { ModelEditorTable } from "@/components/model-editor-table"
import { ModelImportDialog } from "@/components/model-import-dialog"
import { ScenarioFields } from "@/components/scenario-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useModelImports } from "@/hooks/use-model-imports"
import { useModelStore } from "@/hooks/use-model-store"
import { useScenario } from "@/hooks/use-scenario"
import { rankModelCosts } from "@/lib/pricing"
import { MODEL_PROVIDERS } from "@/lib/providers"
import {
  collectMessages,
  hasNoErrors,
  validateModels,
  validateScenario,
} from "@/lib/validation"

export function TokenCostComparator() {
  const {
    models,
    addModel,
    updateModel,
    removeModel,
    toggleModel,
    clearModels,
    importModels,
  } = useModelStore()
  const { scenario, setField, usageRange } = useScenario()
  const exchangeRate = useExchangeRate()
  const imports = useModelImports(MODEL_PROVIDERS, exchangeRate)

  const [importOpen, setImportOpen] = React.useState(false)
  const [focusId, setFocusId] = React.useState<string | null>(null)

  const scenarioErrors = React.useMemo(
    () => validateScenario(scenario),
    [scenario]
  )
  const modelErrors = React.useMemo(() => validateModels(models), [models])
  const messages = React.useMemo(
    () => collectMessages(scenarioErrors, modelErrors),
    [scenarioErrors, modelErrors]
  )

  // 存在任何校验错误时清空结果，避免展示基于非法输入算出的数字。
  const results = React.useMemo(
    () =>
      hasNoErrors(scenarioErrors, modelErrors)
        ? rankModelCosts(models, usageRange)
        : [],
    [models, usageRange, scenarioErrors, modelErrors]
  )

  function handleAddModel() {
    setFocusId(addModel())
  }

  function handleOpenImport() {
    // 打开前重置各选项卡的搜索/勾选，并懒加载当前提供商。
    imports.open()
    setImportOpen(true)
  }

  function handleClear() {
    if (
      !window.confirm(
        `确定清空全部 ${models.length} 个模型吗？此操作不可撤销。`
      )
    ) {
      return
    }
    clearModels()
  }

  return (
    <main className="mx-auto min-h-svh max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 border-b pb-5">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Token 成本比价
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          按「总 Token × 输入占比 ×
          缓存命中率区间」拆解用量，比较各模型的成本区间。
        </p>
      </header>

      {messages.length > 0 ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>用量与模型</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleAddModel}>
                  添加模型
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenImport}
                >
                  导入模型
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  disabled={models.length === 0}
                  onClick={handleClear}
                >
                  清空全部
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <ScenarioFields
              scenario={scenario}
              errors={scenarioErrors}
              onChange={setField}
            />

            {models.length > 0 ? (
              <div className="rounded-lg border">
                <ModelEditorTable
                  models={models}
                  errors={modelErrors}
                  focusId={focusId}
                  onUpdate={updateModel}
                  onToggle={toggleModel}
                  onRemove={removeModel}
                />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                还没有模型，点击「添加模型」或「导入模型」。
              </p>
            )}
          </CardContent>
        </Card>

        <CostResultSection
          results={results}
          usageRange={usageRange}
          hasModels={models.length > 0}
        />
      </div>

      <ModelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        source={imports}
        onImport={importModels}
      />
    </main>
  )
}
