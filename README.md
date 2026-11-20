# Tokime

纯前端 LLM Token 成本比价工具。输入总 Token、输入占比与缓存命中率区间，按「输入 / 缓存输入 / 输出」拆解用量，比较各模型的成本区间并排序、绘图。

- 无后端、无路由、无账号，所有数据保存在本机 `localStorage`
- 支持手动填写模型，或从 OpenRouter / OFox 的 Models API 批量导入
- 成本排名 + 5 种图表：区间对比、命中率曲线、成本结构、相对差额、价格分布
- 支持 JSON 备份导出 / 恢复

## 开始

```bash
pnpm install
pnpm dev        # Vite 开发服务器
pnpm typecheck  # tsc --noEmit
pnpm lint       # oxlint --fix
pnpm format     # oxfmt
pnpm build      # tsc -b && vite build
```

## 使用说明

1. 设置总 Token、输入占比与缓存命中率区间（滑块或精确输入）。
2. 添加模型或导入模型。新添加的手动模型先作为草稿，填完名称与三项价格后自动参与比较。
3. 在下方「成本排名」查看区间成本；切到「图表」查看不同视角。
4. 清理浏览器前建议用「导出备份」保存模型与场景。

价格单位统一为「元 / 1M Token」。导入模型时按当前美元兑人民币汇率换算，可在导入弹窗中手动修改汇率。

## 部署

产物是纯静态文件（`npm run build` → `dist/`），但 **OFox 导入依赖同源反代**。nginx 需要：

```nginx
location /ofox-proxy/ {
  proxy_pass https://api.ofox.io/;
  proxy_set_header Host api.ofox.io;
  proxy_ssl_server_name on;
}
```

路径前缀 `/ofox-proxy` 必须与 `src/lib/providers.ts` 的 `proxyPrefix` 一致；漏配时该提供商的模型列表会加载失败。其余功能无需服务端。
