<template>
  <div class="quick-presets">
    <p class="qp-title">⚡ 快速开始 —— 选个孩子对应的年级，参数自动填好</p>
    <div class="qp-grid">
      <button v-for="p in presets" :key="p.id" type="button" class="qp-card" :class="{ active: p.id === activeId }"
        @click="$emit('select', p)">
        <el-icon v-if="p.id === activeId" class="qp-check"><CircleCheckFilled /></el-icon>
        <span class="qp-grade">{{ p.grade }}</span>
        <span class="qp-desc">{{ p.desc }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  presets: {
    type: Array,
    default: () => []
  },
  activeId: {
    type: String,
    default: ''
  }
})

defineEmits(['select'])
</script>

<style lang="scss" scoped>
.quick-presets {
  margin-bottom: 20px;
}

.qp-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--psm-gray-500);
  margin-bottom: 12px;
}

.qp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.qp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 16px;
  background: #fff;
  border: 1.5px solid var(--psm-gray-200);
  border-radius: var(--psm-radius-md);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: all 0.18s ease;

  &:hover {
    border-color: var(--psm-brand-400);
    transform: translateY(-2px);
    box-shadow: var(--psm-shadow-md);
  }

  &.active {
    border-color: var(--psm-brand-500);
    background: var(--psm-brand-50);
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
  }
}

.qp-check {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 18px;
  color: var(--psm-brand-500);
}

.qp-grade {
  font-size: 14px;
  font-weight: 600;
  color: var(--psm-gray-900);
}

.qp-desc {
  font-size: 12px;
  color: var(--psm-gray-400);
}
</style>
