import * as React from "react"

import { CostResultSection } from "@/components/cost-result-section"
import { CostSummaryBar } from "@/components/cost-summary-bar"
import { ModelEditorTable } from "@/components/model-editor-table"
import { ModelImportDialog } from "@/components/model-import-dialog"
import { ScenarioFields } from "@/components/scenario-fields"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useModelImports } from "@/hooks/use-model-imports"
import { useModelStore } from "@/hooks/use-model-store"
import { useScenario } from "@/hooks/use-scenario"
import { modelDedupeKey } from "@/lib/model-key"
import { rankModelCosts } from "@/lib/pricing"
import { MODEL_PROVIDERS } from "@/lib/providers"
import { createBackup, parseBackup } from "@/lib/storage"
import type { Model, ModelCostRange } from "@/lib/types"
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
    restoreModel,
    replaceModels,
    toggleModel,
    clearModels,
    importModels,
  } = useModelStore()
  const { scenario, setField, replaceScenario, usageRange } = useScenario()
  const exchangeRate = useExchangeRate()
  const imports = useModelImports(MODEL_PROVIDERS, exchangeRate)
  const { toast } = useToast()

  const [importOpen, setImportOpen] = React.useState(false)
  const [focusId, setFocusId] = React.useState<string | null>(null)
  const backupInputRef = React.useRef<HTMLInputElement>(null)

  const scenarioErrors = React.useMemo(
    () => validateScenario(scenario),
    [scenario]
  )
  const modelErrors = React.useMemo(() => validateModels(models), [models])
  const messages = React.useMemo(
    () => collectMessages(scenarioErrors, modelErrors),
    [scenarioErrors, modelErrors]
  )

  const draftCount = React.useMemo(
    () => models.filter((model) => model.draft).length,
    [models]
  )
  const hasActiveModels = models.some((model) => !model.draft)
  const existingKeys = React.useMemo(
    () => new Set(models.map(modelDedupeKey)),
    [models]
  )

  // 输入暂时不合法时保留上一条有效结果，避免用户删空价格准备重输时整页闪空。
  const validResults = React.useMemo<ModelCostRange[] | null>(
    () =>
      hasNoErrors(scenarioErrors, modelErrors)
        ? rankModelCosts(models, usageRange)
        : null,
    [models, usageRange, scenarioErrors, modelErrors]
  )
  const lastValidRef = React.useRef<ModelCostRange[]>([])

  React.useEffect(() => {
    if (validResults) lastValidRef.current = validResults
  }, [validResults])

  const enabledIds = React.useMemo(
    () =>
      new Set(
        models
          .filter((model) => model.enabled && !model.draft)
          .map((model) => model.id)
      ),
    [models]
  )
  // 规则默认禁止渲染期读 ref；这里是有意的「上一条有效结果」缓存，
  // 只在输入暂时不合法时用于过渡展示，不参与任何派生状态写入。
  // 该文件的 react/refs 已在 .oxlintrc.json 中关闭。
  const lastValidResults = lastValidRef.current
  const results =
    validResults ?? lastValidResults.filter((item) => enabledIds.has(item.id))
  const stale = validResults === null && results.length > 0

  function handleAddModel() {
    setFocusId(addModel())
  }

  function handleOpenImport() {
    // 打开前重置各选项卡的搜索/勾选，并懒加载当前提供商。
    imports.open()
    setImportOpen(true)
  }

  function handleImport(incoming: Model[]) {
    const added = importModels(incoming)
    const skipped = incoming.length - added

    if (added === 0 && skipped > 0) {
      toast({ message: `这 ${skipped} 个模型已在列表中，未重复添加。` })
    } else if (skipped > 0) {
      toast({
        message: `已导入 ${added} 个模型，跳过 ${skipped} 个已存在的模型。`,
      })
    } else {
      toast({ message: `已导入 ${added} 个模型。` })
    }
    return added
  }

  function handleRemove(id: string) {
    const index = models.findIndex((model) => model.id === id)
    const model = models[index]
    if (!model) return

    removeModel(id)
    toast({
      message: `已删除「${model.name || "未命名模型"}」`,
      action: {
        label: "撤销",
        onClick: () => restoreModel(model, index),
      },
    })
  }

  function handleClear() {
    if (models.length === 0) return
    const snapshot = models
    clearModels()
    toast({
      message: `已清空全部 ${snapshot.length} 个模型`,
      action: {
        label: "撤销",
        onClick: () => replaceModels(snapshot),
      },
    })
  }

  function handleExport() {
    const blob = new Blob([createBackup(models, scenario)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `tokime-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    toast({ message: `已导出 ${models.length} 个模型的备份。` })
  }

  async function handleRestoreFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const parsed = parseBackup(await file.text())
    if (!parsed) {
      toast({
        message: "备份文件无法解析，请选择 Tokime 导出的 JSON 文件。",
      })
      return
    }

    const previousModels = models
    const previousScenario = scenario
    replaceModels(parsed.models)
    replaceScenario(parsed.scenario)
    toast({
      message: `已恢复 ${parsed.models.length} 个模型与场景设置`,
      action: {
        label: "撤销",
        onClick: () => {
          replaceModels(previousModels)
          replaceScenario(previousScenario)
        },
      },
    })
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
        <p className="mt-1 text-xs text-muted-foreground">
          全部数据只保存在本机浏览器；清理浏览器数据前可导出备份。
        </p>
      </header>

      <CostSummaryBar results={results} stale={stale} />

      {messages.length > 0 ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:items-start">
        <Card className="min-w-0">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>用量与模型</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="h-9 sm:h-8"
                  onClick={handleAddModel}
                >
                  添加模型
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 sm:h-8"
                  onClick={handleOpenImport}
                >
                  导入模型
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8"
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
                  onRemove={handleRemove}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1 py-8 text-center text-sm text-muted-foreground">
                <p>
                  还没有模型，点击「添加模型」手动填写，或「导入模型」从
                  OpenRouter / OFox 选择。
                </p>
                <p className="text-xs">
                  新添加的模型会先作为草稿，填完名称与三项价格后自动参与比较。
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                建议定期导出备份，避免清理浏览器数据后丢失模型。
              </p>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                >
                  导出备份
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => backupInputRef.current?.click()}
                >
                  恢复备份
                </Button>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto">
          <CostResultSection
            results={results}
            usageRange={usageRange}
            hasModels={hasActiveModels}
            stale={stale}
            draftCount={draftCount}
          />
        </div>
      </div>

      <ModelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        source={imports}
        existingKeys={existingKeys}
        onImport={handleImport}
      />
    </main>
  )
}
