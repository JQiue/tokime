import { Trash2 } from "lucide-react"

import { NumericInput } from "@/components/numeric-input"
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

const PRICE_UNIT_HINT = "单位：元 / 1M Token"

export interface ModelEditorTableProps {
  models: Model[]
  errors: ModelErrors
  focusId?: string | null
  onUpdate: (id: string, patch: Partial<Omit<Model, "id">>) => void
  onToggle: (id: string, enabled: boolean) => void
  onRemove: (id: string) => void
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
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[26%]">模型</TableHead>
          <TableHead className="w-[16%]">来源</TableHead>
          <TableHead className="w-[15%]" title={PRICE_UNIT_HINT}>
            输入
          </TableHead>
          <TableHead className="w-[15%]" title={PRICE_UNIT_HINT}>
            缓存输入
          </TableHead>
          <TableHead className="w-[15%]" title={PRICE_UNIT_HINT}>
            输出
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
                      onCheckedChange={(checked) => onToggle(model.id, checked)}
                    />
                    <Input
                      aria-label="模型名称"
                      aria-invalid={error?.name ? true : undefined}
                      placeholder="模型名称"
                      className="min-w-0 flex-1"
                      value={model.name}
                      autoFocus={model.id === focusId}
                      onChange={(event) =>
                        onUpdate(model.id, { name: event.target.value })
                      }
                    />
                  </div>
                  {error?.name ? (
                    <p className="text-xs text-destructive">{error.name}</p>
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
                  className="min-w-0"
                  step={0.0001}
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
                  className="min-w-0"
                  step={0.0001}
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
                  className="min-w-0"
                  step={0.0001}
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
  )
}
