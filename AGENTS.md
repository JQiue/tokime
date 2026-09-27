# AGENTS.md

本文件为 AI 编码代理提供本仓库的必备知识。项目内代码注释为中文，注释哲学是**记录「为什么」**（被否决的方案、边界情况），请延续这一风格。

## 项目概述

**Tokime** —— 纯前端 LLM Token 成本比价工具。用户输入总 Token、输入占比、缓存命中率区间，应用按「输入 / 缓存输入 / 输出」三分项拆解用量，计算各模型在区间内的成本范围并排序、绘图。

无后端、无路由、无测试、无 CI。全部状态在浏览器本地（localStorage + 内存）。

## 常用命令

```bash
npm run dev        # 启动 Vite 开发服务器
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint --fix
npm run format     # oxfmt
npm run build      # tsc -b && vite build  → 提交前务必通过
```

⚠️ **工具链不是 ESLint/Prettier**，而是 `oxlint`（`.oxlintrc.json`）+ `oxfmt`（`.oxfmtrc.json`）。格式化规则：无分号、双引号、2 空格、`printWidth: 80`、LF。修改代码后请运行 `npm run lint` 与 `npm run build` 验证。

## 验证约定

- 改完代码默认只跑 `npm run lint`、`npm run typecheck`、`npm run build`。
- **不要擅自运行无头 / 浏览器端到端测试**（Playwright、`npm run dev` 后自动点击等）。需要端到端验证时，**先征得用户同意**再动手。
- 项目目前没有测试框架与 CI（无 Vitest/Playwright 配置、无 `.github/`）。若引入测试，先与用户确认方案。

## 技术栈

React 19 · TypeScript 7（`verbatimModuleSyntax`）· Vite 8 · Tailwind v4（无 `tailwind.config.js`，主题在 `src/index.css` 的 `@theme`）· Recharts 3 · Base UI（`@base-ui/react`）+ shadcn 风格组件（`style: base-nova`）。

## 架构与数据流

```plain
src/main.tsx (StrictMode)
└─ App.tsx
   └─ TokenCostComparator  ← 唯一的状态编排容器，调用所有 hooks
      ├─ ScenarioFields        ← 场景输入（滑块）
      ├─ ModelEditorTable      ← 模型编辑表
      ├─ CostResultSection     ← 结果区（排名表 + 5 种图表 Tab）
      └─ ModelImportDialog ×2  ← 每个 provider 一个
```

**分层职责：**

- `src/components/` —— 展示与交互。`token-cost-comparator.tsx` 是唯一的「容器」，其余为展示型组件。
- `src/hooks/` —— 状态与副作用：`use-model-store`（模型 CRUD + 持久化）、`use-scenario`（场景字段）、`use-exchange-rate`（汇率）、`use-remote-models`（单 provider 远端列表）。
- `src/lib/` —— 纯逻辑，无 React：`pricing`（**计算核心**）、`validation`、`storage`、`model-source`、`providers`、`exchange-rate`、`format`、`chart-data`、`types`。

数据流：`useModelStore` + `useScenario` →（校验）→ `rankModelCosts(models, usageRange)` → `ModelCostRange[]` → 排名表 / `chart-data` 构建器 → Recharts。

## 关键约定（难以从代码表面推断，务必遵守）

### 1. 价格单位统一为「元 / 1M Token」

所有成本计算都除以 `1_000_000`（`pricing.ts` 的 `sumCost`）。远端来源给的是「美元 / 1 Token」，需 `usdPerMillion()`（×1e6）再乘汇率。历史 v1 数据是「元 / 1K Token」，迁移时 ×1000。

### 2. 所有用户可编辑的数值一律以 `string` 存储

`Model` 的三个价格、`ScenarioState` 全部字段、汇率都是 `string`。原因：允许输入框被清空，且避免受控 `type="number"` 绑 number 时无法删字符。**计算/校验时才 `toNumber()`**（非法 → 0）。**空字符串是「校验错误」，不是 0**（见 `validation.ts` 的 `isBlankOrInvalid`，必须先判断 `trim() === ""`，因为 `Number("") === 0` 是有限值）。

### 3. 存在任何校验错误时清空结果

`token-cost-comparator.tsx` 中 `results` 只在 `hasNoErrors(...)` 时计算，否则为 `[]`。这是刻意的：**绝不展示基于非法输入算出的数字**。不要「宽松处理」掉这个行为。

### 4. 排序只按 `worstCost` 升序

`rankModelCosts` 仅以「命中率区间内最坏情况成本」排序，因为这样能保证 `results[0]` 在整个区间内都不比其它模型贵——这是一个可解释的承诺。摘要「当前最优」、相对差额图基准、散点图高亮都依赖 `results[0]`。

### 5. `roundImportedPrice` 保留 4 位**有效数字**，不是 4 位小数

`toPrecision(4)`。用 `toFixed(2)` 会把 ¥0.001/1M 的廉价模型压成 ¥0.00；位数过多则是虚假精度。

### 6. 类型导入必须写 `import type`

`verbatimModuleSyntax: true` 会报错；`noUnusedLocals`/`noUnusedParameters` 也已开启。

### 7. `cn` 的来源有两条路径

- `src/components/ui/*` 直接 `import { cn } from "cn"`（npm 包 `cn`）。
- 业务组件用 `import { cn } from "@/lib/utils"`（`utils.ts` 只是 `export { cn } from "cn"`）。

两者是同一个函数。**不要「修正」成 clsx/tailwind-merge**。

### 8. provider 抽象与 OFox 的 CORS 限制

新增模型来源时，在 `src/lib/providers.ts` 注册 `ModelProvider`，复用 `model-source.ts` 的拉取/换算，无需新建文件。导入模型的 `id` 为 `${provider.id}:${modelId}`，去重键为 `${source}:${sourceId}`（不同平台同 ID 不冲突）。

**OFox（`api.ofox.io`）不返回 CORS 头，浏览器无法直连**。开发环境通过 `vite.config.ts` 的 `/ofox-proxy` 同源代理访问（前缀须与 `providers.ts` 的 `devProxyPrefix` 一致，仅在 `import.meta.env.DEV` 生效）。**生产构建下 OFox 导入会失败**——如需保留，必须自建代理。另：OFox 会忽略 `output_modalities=text` 查询参数，故 `model-source.ts` 有客户端兜底过滤（`isTextOutputModel`，结构缺失时保守保留）。

### 9. 汇率接口用 `api.frankfurter.dev`，不是 `.app`

两个是不同站点，`.app` 不返回 CORS 头。不要改回去。

### 10. localStorage 键与迁移

键名形如 `token-cost-comparator:v3`（模型）、`:v4:scenario`、`:v1:usd-cny`。模型迁移链 v3 → v2 → v1（×1000）；场景兼容旧的单值 `cacheHitRate`（上下限都设为该值）。

- **迁移后保留旧键**（避免不可逆丢数据），因此判断「有没有数据」必须区分 `null` 与 `[]`：`normalizeModelList` 对非数组返回 `null` 触发回退，对空数组原样返回。若让空数组也回退，会被下次加载时把旧键复活。
- 所有写操作 `try/catch` 静默失败（隐私模式/配额）。
- **不内置示例模型**（价格变动太快，预设必然过时）。

### 11. 副作用与 StrictMode

`main.tsx` 使用 `<StrictMode>`，会双挂载。网络请求一律用 `AbortController` + `if (controller.signal.aborted) return` 守卫，且 `setState` 只放在 promise 回调里（不放在 effect 体内同步执行）。不要移除这些 `signal` 管线。

### 12. Recharts 的三个硬约束

1. **`dataKey` 不能用模型 ID**：recharts 会把 `.` 当路径分隔符，而 OpenRouter ID 含 `.`/`/`。统一用 `seriesKey(i)` = `s0`/`s1`…（`chart-data.ts`）。
2. **需要稳定显示的文字必须关动画**（`isAnimationActive={false}`）：后台标签页 `rAF` 被节流，入场动画永不结束，`LabelList` 标签不会出现。重新开动画会复现该 bug。
3. **`ReferenceArea` 必须显式 `fillOpacity={1}`**，且用 `--border` 填充（`--muted` 几乎看不见）。

图表高度按数据量动态计算：`Math.max(300, data.length * 56)`；金额一律加 `tabular-nums`。

### 13. Base UI 滑块的受控值必须记忆化

Base UI 按引用比较数组，未记忆化的 `[percent]` 会在每次渲染重新生成并导致拖动中滑块回弹（见 `scenario-fields.tsx`）。

## 代码风格

- 组件全部用命名的 `export function Xxx`；仅 `App.tsx` 额外有 `export default`。
- Props 类型用 `export interface XxxProps`。
- UI 原语基于 Base UI：用 `render={<Button/>}` 而非 Radix 的 `asChild`，`data-slot="…"` 标记。
- 图表配置对象用 `satisfies ChartConfig`。
- 业务组件通过 props 接收数据与回调，不直接访问 hooks 之外的全局状态。
