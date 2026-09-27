/**
 * 「OpenRouter 兼容」的模型列表提供商。
 * 这些平台的 /models 接口返回同样的 `{ data: [...] }` 结构，
 * 因此可以共用同一套拉取与换算逻辑（见 lib/model-source.ts）。
 */
export interface ModelProvider {
  /** 稳定标识，同时用作导入模型 id 的前缀，避免不同平台同 ID 相互覆盖。 */
  id: string
  /** 展示名，也是写入 model.source 的来源文案。 */
  label: string
  /** 模型列表接口。 */
  modelsUrl: string
  /**
   * 同源代理前缀。
   * 部分平台（如 OFox）不返回 CORS 头，浏览器无法直连，
   * 开发环境走 vite.config.ts 的代理，生产环境需在部署侧（如 nginx）
   * 把同一前缀反代到目标站点。缺失该配置时导入会失败。
   */
  proxyPrefix?: string
  /** 接口文档链接；缺省时对话框隐藏入口。 */
  docsUrl?: string
}

/**
 * 浏览器实际请求的 URL。
 * 带 proxyPrefix 的提供商改走同源代理（开发用 vite 代理，生产用部署侧反代），
 * 以规避目标站点缺失 CORS 头的问题。
 */
export function providerModelsUrl(provider: ModelProvider): string {
  if (provider.proxyPrefix) {
    const { pathname } = new URL(provider.modelsUrl)
    return `${provider.proxyPrefix}${pathname}`
  }
  return provider.modelsUrl
}

export const OPENROUTER_PROVIDER: ModelProvider = {
  id: "openrouter",
  label: "OpenRouter",
  modelsUrl:
    "https://openrouter.ai/api/v1/models?output_modalities=text&limit=1000&sort=most-popular",
  docsUrl:
    "https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties",
}

export const OFOX_PROVIDER: ModelProvider = {
  id: "ofox",
  label: "OFox",
  modelsUrl: "https://api.ofox.io/v1/models",
  proxyPrefix: "/ofox-proxy",
}

/**
 * 全部可导入的提供商，按界面展示顺序排列。
 * 新增来源只需往这里加一项，导入对话框的选项卡会自动扩展。
 */
export const MODEL_PROVIDERS: readonly ModelProvider[] = [
  OPENROUTER_PROVIDER,
  OFOX_PROVIDER,
]
