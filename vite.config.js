import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// 配置文件本身是 ESM，__dirname 不可用，用 import.meta.url 推导
const srcPath = fileURLToPath(new URL('./src', import.meta.url))
const docsPath = fileURLToPath(new URL('./docs', import.meta.url))

export default defineConfig({
  server: {
    port: 1101,
  },
  resolve: {
    alias: {
      '@/': `${srcPath}/`,
    },
  },
  plugins: [
    vue(),
    viteStaticCopy({
      silent: true,
      targets: [
        {
          // 必须用 ** 递归，v4 的 `dist/*` 只匹配顶层文件，assets/ 不会跟着复制
          src: 'dist/**',
          dest: docsPath,
          // 插件 v4 不再支持 structured 选项，改用 rename.stripBase 去掉 `dist/` 这一层，
          // 否则会把产物复制成 docs/dist/** 而不是镜像到 docs/
          rename: { stripBase: 1 },
        },
      ],
    }),
  ],
  define: {
    // Vue 的 esm-bundler 构建要求显式注入这几个编译期开关，
    // 否则开发时会打印 feature flag 未定义的警告
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  base: './',
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
