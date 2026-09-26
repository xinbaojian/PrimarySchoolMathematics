# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## 语言约定

本仓库内的所有交流与产出**统一使用中文**，包括：对话回复、代码注释、提交信息、文档，以及本文件后续的维护。除非代码本身（标识符、第三方 API、日志格式）要求英文，否则不要输出英文。

## 项目概述

这是一个纯浏览器端的 Vue 3 单页应用，用于生成可打印的小学口算题 / 竖式题试卷。**题目生成与打印排版全部在前端完成，当前没有在用的后端。** 每张 `.sheet` 严格对应打印后的一页 A4。

## 常用命令

包管理器是 **pnpm**（已提交 `pnpm-lock.yaml` 和 `pnpm-workspace.yaml`，`package.json` 的 `packageManager` 字段已固定版本）。

```sh
pnpm install
pnpm dev              # Vite 开发服务器 http://127.0.0.1:1101
pnpm build            # 默认构建（base './'）
pnpm preview
pnpm build:github     # base=/PrimarySchoolMathematics/，用于 GitHub Pages
pnpm build:suiyan     # base=/demo/psm/，用于自有部署
```

**没有 lint / test 脚本。** 正确性靠构建 + 下面的打印验证脚本保证。因为没有配置测试运行器，所以也不存在「运行单个测试」的命令。

## 架构

入口链路：`index.html` → `src/main.js`（注册 Pinia、带 `zh-cn` locale 的 Element Plus、全部 `@element-plus/icons-vue` 图标，并按顺序引入 `src/styles/` 下的三个全局样式文件）→ `src/App.vue`（`<router-view>` + `<keep-alive>`）→ `src/router/index.js`。

只有两个路由：
- `/` → `views/Layout.vue`，包裹 `Header` + `Home` + `Footer`。`Home.vue` 才是真正的生成器界面。
- `/print` → `views/Print.vue`，打印预览页，也是唯一调用 `window.print()` 的页面。

### 领域主流程（最需要理解的部分）

1. **`views/Home.vue`** 维护一个大的 `formData` ref（步数、取值范围、运算符、标题、列数、行高等），外加一个 `paperList` 数组表示「题型组」。编辑「自动生成」题型走 `components/home/AutoGenerateFormulas.vue`；「手动添加」走 `CustomFormulas.vue`。点击「生成口算题卷子」时调用 `createFormulasGenerator(formData, paperList)`。
2. **`utils/paperGenerator.js`** 把每个题型组映射为 `utils/psm.js` 的参数，生成 `numberOfPapers` 份试卷并打乱题目顺序。`psm.js` 中的 `FormulasGenerator` 类是算术引擎：它拼装算式字符串（使用 `×`/`÷`、括号、以及「求算数项」时的 `__` 空位），并通过 `validator*` 系列函数按范围 / 进位 / 退位 / 余数 / 括号规则校验；不通过就重新摇号。`is_result` 决定「求结果」（`=`）还是「求算数项」（挖掉一个运算项）。
3. **`stores/app.js`**（`useAppStore`）是交接点：`navigateToPrint(router, fileName, papers)` 把 `printPreviewPapers` 存进 store 再跳转 `/print`。这就是生成必须完成后才能跳转的原因。
4. **`views/Print.vue`** 消费 `appStore.printPreviewPapers`，用 `utils/paperLayout.js` 完成分页排版。

整个应用没有任何后端请求。历史上的服务端渲染 `.docx`/zip 遗留链路（`apis/`、`utils/request.js`、`utils/download.js`、`PaperDownloadDialog.vue` 及 axios 依赖）已全部删除，勿再引入。

### 配置持久化

`utils/configStorage.js` 是一个类，把最多 10 份命名参数组存到 `localStorage` 的 `customer-config` 键下。首次加载会写入一份 `默认` 配置（id 为 `'1'`）。`Home.vue` 与 `ConfigurationList.vue` 负责读写；默认值定义在 `loadAll()` 中，必须与 `Home.vue` 里的兜底字面量保持一致。

### 样式

Tailwind（purge 配置见 `tailwind.config.js`）+ SCSS + Element Plus。`components/index.js` 与 `components/home/index.js` 是 barrel 文件，形式为 `export { default as X } from './X.vue'`。**barrel 导出会把组件的样式无条件打进产物，即使该组件从未被渲染**，其中也包括非 scoped 的全局样式块。新增 / 删除组件后，到 `dist/assets/*.css` 里 grep 确认没有意外注入的全局规则。

## 打印排版 —— 风险最高的区域

硬约束：**一张 `.sheet` 必须严格等于一页 A4。** 不信任浏览器分页；内容溢出时在构建数据阶段就拆成更多张纸，而不是交给打印机会自己分页。

- `src/utils/paperLayout.js` 掌握全部排版计算：`rowPitchMM`、`maxRowsPerColumn`、`buildPaperSheets`、`buildPrintSheets`。常量 `FIXED_BLOCK_MM = 66.6`、`LINE_BOX_MM = 5.3`、`SAFETY_MM = 0.5`、`ANSWER_ROW_MM` 都是**在无头 Chrome 中实测**得到的，取整方向刻意偏保守（偏大），保证实际渲染只会更矮。不要把它们「优化」成整数。
- `src/styles/print.css`（由 `main.js` 引入）声明了 `@page { size: A4; margin: 0 }`。浏览器默认约 10mm 的页边距会把可用高度从 297mm 压到约 277mm，是空白页的主要来源之一。打印态**不要**给 `body` 设固定高度，否则多张纸会被裁掉。
- 打印态的 margin / gap 必须写在 `@media screen` 里；打印态残留的 `margin-top` 会把纸顶出页边界。
- 每列行数不能写死：标题换行会让固定块变高。`Print.vue` 在渲染后实测 `.row` 相对 `.sheet` 的偏移（`measureFixedBlock`）并作为 `fixedBlockMM` 传入；`FIXED_BLOCK_MM` 只是首屏兜底。改动标题相关样式后，要确认这条链路仍然生效。
- `.row` 是 `display: flex`，Chrome 分页时将其视为**不可拆分**的原子块——这正是溢出必须预先拆张的原因。

改动任何与打印相关的内容后，都要跑端到端验证脚本（此前位于 `/tmp/psm-print-repro/verify_e2e.mjs`；若已被清理，参照 `~/.workbuddy/skills/print-pagination-blank-page`）。它用构建后的 CSS 渲染 PDF，并断言三件事：页数等于纸张数、每页都有内容（无空白页）、每张纸自然高度 ≤ 297mm。只看页数会漏掉被 `overflow: hidden` 裁掉内容的情况。

## 协作约定

- 先定位根因，拿出证据（可复现过程 + 代码行号），说明结论并得到确认后再动手改。不要在没有证据的情况下「顺手修」。
- 改动生成 / 排版相关代码后，要基于构建产物验证，而不是仅靠推理。
