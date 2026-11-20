# AGENTS.md

**Tokime** —— 纯前端 LLM Token 成本比价工具。用户输入总 Token、输入占比、缓存命中率区间，应用按「输入 / 缓存输入 / 输出」三分项拆解用量，计算各模型在区间内的成本范围并排序、绘图。

无后端、无路由、无测试、无 CI。全部状态在浏览器本地。

## 命令

```bash
npm run dev        # 启动 Vite 开发服务器
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint --fix
npm run format     # oxfmt
npm run build      # tsc -b && vite build  → 提交前务必通过
```

## 验证约定

- 改完代码默认只跑 `npm run lint`、`npm run typecheck`、`npm run build`。

## 技术栈

- React 19
- TypeScript 7
- Vite 8
- Tailwind v4
- Recharts 3
- shadcn

## 架构与数据流

```plain
src/main.tsx (StrictMode)
└─ App.tsx
   └─ TokenCostComparator  ← 唯一的状态编排容器，调用所有 hooks
      ├─ ScenarioFields        ← 场景输入（滑块）
      ├─ ModelEditorTable      ← 模型编辑表
      ├─ CostResultSection     ← 结果区（排名表 + 5 种图表 Tab）
      └─ ModelImportDialog     ← 单个对话框，内部 Tabs 切换 provider（OpenRouter / OFox）
```

**分层职责：**

- `src/components/` —— 展示与交互。`token-cost-comparator.tsx` 是唯一的「容器」，其余为展示型组件。
- `src/hooks/` —— 状态与副作用：`use-model-store`（模型 CRUD + 持久化）、`use-scenario`（场景字段）、`use-exchange-rate`（汇率）、`use-model-imports`（多 provider 远端列表，勾选跨平台共享）。
- `src/lib/` —— 纯逻辑，无 React：`pricing`（**计算核心**）、`validation`、`storage`、`model-source`、`providers`、`exchange-rate`、`format`、`chart-data`、`types`。

数据流：`useModelStore` + `useScenario` →（校验）→ `rankModelCosts(models, usageRange)` → `ModelCostRange[]` → 排名表 / `chart-data` 构建器 → Recharts。

## 部署

纯静态产物（`npm run build` → `dist/`），但 **OFox 导入依赖同源反代**。用 nginx 时必须加：

```nginx
location /ofox-proxy/ {
  proxy_pass https://api.ofox.io/;
  proxy_set_header Host api.ofox.io;
  proxy_ssl_server_name on;
}
```

路径前缀 `/ofox-proxy` 必须与 `providers.ts` 的 `proxyPrefix` 一致；漏配则该提供商的模型列表加载失败。其余纯前端功能无需服务端。

## 代码风格

- 组件全部用命名的 `export function Xxx`；仅 `App.tsx` 额外有 `export default`。
- Props 类型用 `export interface XxxProps`。
- UI 原语基于 Base UI：用 `render={<Button/>}` 而非 Radix 的 `asChild`，`data-slot="…"` 标记。
- 图表配置对象用 `satisfies ChartConfig`。
- 业务组件通过 props 接收数据与回调，不直接访问 hooks 之外的全局状态。

## 响应式设计与跨平台适配

- 设计原则：根据产品类型和目标用户选择移动端优先或桌面端优先，不要机械套用单一策略。无论从哪个端开始设计，都必须考虑其他目标平台的使用体验。
- 布局适配：不要简单缩小桌面端界面。应根据屏幕空间重新组织布局，例如多栏变单栏、表格变卡片、侧边栏变抽屉、横向排列变纵向排列。
- 信息层级：根据设备空间和使用场景调整信息优先级，优先展示核心信息和操作。次要信息可以折叠、延迟展示或放入详情页，但不能随意丢失重要功能。
- 交互适配：充分考虑触控、鼠标、键盘等不同输入方式。不要依赖 Hover 等特定交互，确保操作入口清晰、触控区域合理，并符合目标平台的交互习惯。
- 代码组织：按业务模块组织代码，而不是简单按照 PC 和移动端拆分两套项目。业务逻辑、数据模型、状态管理和数据请求应尽可能复用；布局和交互差异较大时，允许拆分独立的展示组件。
- 设计一致性：统一管理颜色、字体、间距、圆角、断点等设计规范，优先使用设计变量和可复用组件，避免重复定义和随意硬编码。
- 平台适配：根据 Web、移动应用、桌面应用等平台的技术特点，优先使用对应平台的原生适配能力，同时尊重各平台的设计规范，不要为了代码复用而牺牲原生体验。
- 测试验证：开发完成后，检查不同屏幕尺寸、窗口大小和交互方式下的布局、内容完整性及功能可用性，避免内容溢出、布局错乱、操作困难等问题。

核心原则：共享业务逻辑，适配展示方式，尊重平台特性，保证使用体验。
