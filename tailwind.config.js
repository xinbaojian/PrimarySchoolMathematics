/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind v3 起 `purge` 已废弃，必须改名为 `content`，
  // 否则会打印警告（且扫描规则按旧语义处理）
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
      }
    },
  },
  plugins: [],
}