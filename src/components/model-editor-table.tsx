import * as React from "react"
import { Trash2 } from "lucide-react"

import { NumericInput } from "@/components/numeric-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Model, ModelErrors } from "@/lib/types"

const PRICE_UNIT = "元 / 1M"

export interface ModelEditorTableProps {
  models: Model[]
  errors: ModelErrors
  focusId?: string | null
  onUpdate: (id: string, patch: Partial<Omit<Model, "id">>) => void
  onToggle: (id: string, enabled: boolean) => void
  onRemove: (id: string) => void
}

/** 新增模型后聚焦名称并全选，直接输入即可替换「新模型」。 */
function ModelNameInput({
  model,
  invalid,
  focused,
  onUpdate,
}: {
  model: Model
  invalid: boolean
  focused: boolean
  onUpdate: ModelEditorTableProps["onUpdate"]
}) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!focused) return
    ref.current?.focus()
    ref.current?.select()
  }, [focused])

  return (
    <Input
      ref={ref}
      aria-label="模型名称"
      aria-invalid={invalid || undefined}
      placeholder="模型名称"
      className="min-w-0 flex-1"
      value={model.name}
      onChange={(event) => onUpdate(model.id, { name: event.target.value })}
    />
  )
}

function PriceField({
  label,
  modelId,
  field,
  value,
  invalid,
  onUpdate,
}: {
  label: string
  modelId: string
  field: "normalPrice" | "cachedPrice" | "outputPrice"
  value: string
  invalid: boolean
  onUpdate: ModelEditorTableProps["onUpdate"]
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <NumericInput
        ariaLabel={`${label}价格`}
        invalid={invalid}
        grouped
        className="min-w-0 text-right"
        value={value}
        onValueChange={(next) => onUpdate(modelId, { [field]: next })}
      />
    </label>
  )
}

export function ModelEditorTable({
  models,
  errors,
  focusId,
  onUpdate,
  onToggle,
  onRemove,
}: ModelEditorTableProps) {
  return (
    <>
      {/* 窄屏：卡片式编辑，避免 6 列表格把价格输入压到不可读。 */}
      <div className="divide-y md:hidden">
        {models.map((model) => {
          const error = errors.byId[model.id]
          return (
            <div key={model.id} className="flex flex-col gap-3 p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  aria-label="参与比较"
                  className="shrink-0"
                  checked={model.enabled}
                  onCheckedChange={(checked) => onToggle(model.id, checked)}
                />
                <ModelNameInput
                  model={model}
                  invalid={Boolean(error?.name)}
                  focused={model.id === focusId}
                  onUpdate={onUpdate}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`删除 ${model.name || "未命名模型"}`}
                  title="删除模型"
                  className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRemove(model.id)}
                >
                  <Trash2 />
                </Button>
              </div>

              <Input
                aria-label="模型来源"
                placeholder="来源，如 OpenRouter"
                className="min-w-0"
                value={model.source}
                onChange={(event) =>
                  onUpdate(model.id, { source: event.target.value })
                }
              />

              <div className="grid grid-cols-3 gap-2">
                <PriceField
                  label="输入"
                  modelId={model.id}
                  field="normalPrice"
                  value={model.normalPrice}
                  invalid={Boolean(error?.price)}
                  onUpdate={onUpdate}
                />
                <PriceField
                  label="缓存输入"
                  modelId={model.id}
                  field="cachedPrice"
                  value={model.cachedPrice}
                  invalid={Boolean(error?.price)}
                  onUpdate={onUpdate}
                />
                <PriceField
                  label="输出"
                  modelId={model.id}
                  field="outputPrice"
                  value={model.outputPrice}
                  invalid={Boolean(error?.price)}
                  onUpdate={onUpdate}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                价格单位：{PRICE_UNIT} Token
              </p>
              {error?.name || error?.price ? (
                <p className="text-xs text-destructive">
                  {error.name ?? error.price}
                </p>
              ) : null}
              {model.draft ? (
                <Badge variant="outline" className="w-fit">
                  草稿 · 填完名称与三项价格后参与比较
                </Badge>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* 桌面端：紧凑表格。 */}
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[26%]">模型</TableHead>
              <TableHead className="w-[16%]">来源</TableHead>
              <TableHead className="w-[15%]">
                输入
                <span className="block text-xs font-normal text-muted-foreground">
                  {PRICE_UNIT}
                </span>
              </TableHead>
              <TableHead className="w-[15%]">
                缓存输入
                <span className="block text-xs font-normal text-muted-foreground">
                  {PRICE_UNIT}
                </span>
              </TableHead>
              <TableHead className="w-[15%]">
                输出
                <span className="block text-xs font-normal text-muted-foreground">
                  {PRICE_UNIT}
                </span>
              </TableHead>
              <TableHead className="w-[13%] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {models.map((model) => {
              const error = errors.byId[model.id]
              return (
                <TableRow key={model.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          aria-label="参与比较"
                          className="shrink-0"
                          checked={model.enabled}
                          onCheckedChange={(checked) =>
                            onToggle(model.id, checked)
                          }
                        />
                        <ModelNameInput
                          model={model}
                          invalid={Boolean(error?.name)}
                          focused={model.id === focusId}
                          onUpdate={onUpdate}
                        />
                      </div>
                      {model.draft ? (
                        <Badge
                          variant="outline"
                          className="w-fit text-[10px] font-normal text-muted-foreground"
                        >
                          草稿
                        </Badge>
                      ) : null}
                      {error?.name || error?.price ? (
                        <p className="text-xs text-destructive">
                          {error.name ?? error.price}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Input
                      aria-label="模型来源"
                      placeholder="来源"
                      className="min-w-0"
                      value={model.source}
                      onChange={(event) =>
                        onUpdate(model.id, { source: event.target.value })
                      }
                    />
                  </TableCell>

                  <TableCell className="px-2">
                    <NumericInput
                      ariaLabel="输入价格"
                      invalid={Boolean(error?.price)}
                      grouped
                      className="min-w-0 text-right"
                      value={model.normalPrice}
                      onValueChange={(value) =>
                        onUpdate(model.id, { normalPrice: value })
                      }
                    />
                  </TableCell>

                  <TableCell className="px-2">
                    <NumericInput
                      ariaLabel="缓存输入价格"
                      invalid={Boolean(error?.price)}
                      grouped
                      className="min-w-0 text-right"
                      value={model.cachedPrice}
                      onValueChange={(value) =>
                        onUpdate(model.id, { cachedPrice: value })
                      }
                    />
                  </TableCell>

                  <TableCell className="px-2">
                    <NumericInput
                      ariaLabel="输出价格"
                      invalid={Boolean(error?.price)}
                      grouped
                      className="min-w-0 text-right"
                      value={model.outputPrice}
                      onValueChange={(value) =>
                        onUpdate(model.id, { outputPrice: value })
                      }
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`删除 ${model.name || "未命名模型"}`}
                      title="删除模型"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onRemove(model.id)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
