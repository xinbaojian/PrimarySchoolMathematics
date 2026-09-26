<template>
  <header>
    <div class="brand">
      <span class="logo">算</span>
      <span class="title">口算题生成器</span>
      <span class="sub-title">小学数学 · 打印即用</span>
    </div>
    <div class="links">
      <span class="link" @click="showHelp">使用帮助</span>
    </div>
  </header>
</template>

<script setup>
import { getCurrentInstance } from 'vue';

const { proxy } = getCurrentInstance()

const showHelp = () => {
  proxy.$messageBox.alert(
    `<ol style="margin:0;padding-left:18px;line-height:2">
      <li>点上方年级卡片快速填入参数，或手动调整题型与范围；</li>
      <li>点「添加为一组题」把当前题型加入卷子（可添加多组）；</li>
      <li>右侧确认题目总数与预计页数，点「生成试卷」；</li>
      <li>在打印预览页用浏览器打印（建议边距选「无」）。</li>
    </ol>`,
    '使用帮助',
    { dangerouslyUseHTMLString: true, confirmButtonText: '知道了' }
  )
}
</script>

<style lang="scss" scoped>
header {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid var(--psm-gray-200, #e5e7eb);
  background: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--psm-brand-500, #f97316), var(--psm-brand-400, #fb923c));
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);
}

.title {
  font-size: 17px;
  font-weight: 700;
  color: var(--psm-gray-900, #111827);
}

.sub-title {
  color: var(--psm-gray-400, #9ca3af);
  font-size: 12px;
}

.links {
  margin-left: auto;
  display: flex;
  gap: 16px;
}

.link {
  font-size: 14px;
  color: var(--psm-gray-500, #6b7280);
  cursor: pointer;

  &:hover {
    color: var(--psm-brand-600, #ea580c);
  }
}
</style>
