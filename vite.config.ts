import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // OFox 的 /v1/models 不返回 CORS 头，浏览器无法直连；开发服务器代为转发一次。
  // 生产环境需在部署侧（如 nginx）配置同样的反代，前缀与 lib/providers.ts 的
  // proxyPrefix 保持一致。
  server: {
    proxy: {
      "/ofox-proxy": {
        target: "https://api.ofox.io",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ofox-proxy/, ""),
      },
    },
  },
})
