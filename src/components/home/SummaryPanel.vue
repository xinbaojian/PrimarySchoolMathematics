<template>
  <div class="summary-panel">
    <!-- 试卷摘要 + 生成 -->
    <div class="sp-card">
      <h4 class="sp-title">📋 试卷摘要</h4>

      <template v-if="groups.length">
        <div class="sp-row" v-for="(g, i) in groups" :key="i">
          <span>题组 {{ i + 1 }}</span>
          <b>{{ g }}</b>
        </div>
        <div class="sp-row"><span>题目总数</span><b>{{ totalPerPaper }} 题 × {{ numberOfPapers }} 份 = {{ totalAll }} 题</b></div>
        <div class="sp-row"><span>预计打印</span><b>约 {{ estimatedPages }} 页 A4</b></div>
      </template>
      <p v-else class="sp-empty">还没有添加题组。<br>在左侧点「添加为一组题」，这里会实时汇总。</p>

      <!-- 样例示意 -->
      <div class="sp-preview">
        <template v-if="samples.length">
          <p v-for="(s, i) in samples" :key="i">{{ s }}</p>
        </template>
        <p v-else class="sp-preview-empty">调整左侧参数后，这里展示题目样式</p>
      </div>
      <p class="sp-preview-note">样式示意，实际题目以生成为准</p>

      <el-button class="sp-cta" type="primary" size="large" :disabled="!groups.length" :loading="loading"
        @click="$emit('generate')">
        🖨️ 生成试卷
      </el-button>
      <p class="sp-cta-sub">生成后进入打印预览页</p>
    </div>

    <!-- 我的方案（原配置列表） -->
    <div class="sp-card sp-configs">
      <div class="sp-configs-head">
        <h4 class="sp-title">⭐ 我的方案</h4>
        <el-button link type="danger" size="small" @click="reset">重置</el-button>
      </div>
      <div v-for="c in configurations" :key="c.id" class="sp-conf" :class="{ on: c.id == activeId }"
        @click="select(c.id)">
        <span class="sp-conf-name">{{ c.name }}</span>
        <el-icon v-if="configurations.length > 1" class="sp-conf-del" @click.stop="remove(c.id)">
          <CircleCloseFilled />
        </el-icon>
      </div>
      <div class="sp-conf sp-conf-add" @click="$emit('save-config')">＋ 保存当前为方案</div>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue';
import { cloneDeep } from 'lodash';
import ConfigStorage from '@/utils/configStorage';
import { maxRowsPerColumn } from '@/utils/paperLayout';

const { proxy } = getCurrentInstance()

const props = defineProps({
  formData: Object,
  papers: Array,
  configurations: Array,
  activeId: String,
  loading: Boolean
})

const emit = defineEmits(['generate', 'save-config', 'selected', 'removed', 'reset', 'update:activeId'])

/* ---------- 摘要 ---------- */

const OP_SYMBOLS = { 1: '+', 2: '-', 3: '×', 4: '÷' }

const groups = computed(() => {
  return (props.papers || []).map(p => {
    return p.customFormulaList && p.customFormulaList.length
      ? `自定义口算题 ${p.numberOfFormulas} 道`
      : `${parseInt(p.step) + 1} 个数相算 · ${p.numberOfFormulas} 道`
  })
})

const totalPerPaper = computed(() =>
  (props.papers || []).reduce((prev, cur) => prev + parseInt(cur.numberOfFormulas || 0), 0))

const numberOfPapers = computed(() => parseInt(props.formData?.numberOfPapers) || 1)

const totalAll = computed(() => totalPerPaper.value * numberOfPapers.value)

/** 预计打印页数：与打印页同一套版面容量算法（maxRowsPerColumn），标题换行的误差标「约」 */
const estimatedPages = computed(() => {
  if (!totalPerPaper.value) return 0
  const columns = Math.max(1, parseInt(props.formData?.numberOfPagerColumns) || 1)
  const perColumn = maxRowsPerColumn({
    solution: props.formData?.solution,
    lineHeight: props.formData?.lineHeight
  })
  const sheetsPerPaper = Math.ceil(totalPerPaper.value / (perColumn * columns))
  return sheetsPerPaper * numberOfPapers.value
})

/* ---------- 样例示意（本地采样，不调用真实生成引擎，避免参数不可满足时卡死） ---------- */

const samples = ref([])

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1))

/** 按先乘除后加减求值（与真实算式的运算优先级一致），仅用于样例示意 */
const evalWithPrecedence = (terms, ops) => {
  const nums = [terms[0]]
  const syms = []
  ops.forEach((op, i) => {
    if (op === '×') {
      nums.push(nums.pop() * terms[i + 1])
    } else if (op === '÷') {
      nums.push(nums.pop() / terms[i + 1])
    } else {
      syms.push(op)
      nums.push(terms[i + 1])
    }
  })
  let result = nums[0]
  syms.forEach((s, i) => {
    result = s === '+' ? result + nums[i + 1] : result - nums[i + 1]
  })
  return result
}

const buildSamples = () => {
  const fd = props.formData
  if (!fd) return []

  // 手动添加模式：直接回显用户已输入的算式
  if (fd.generateMode == '2') {
    return (fd.customFormulaList || [])
      .map(c => (c.formula || '').trim())
      .filter(Boolean)
      .slice(0, 4)
      .map(s => s.replace(/\*/g, '×').replace(/\//g, '÷') + ' =')
  }

  // 基本合理性检查，不满足就不出示意（等用户改完）
  const fl = fd.formulaList || []
  const valid = fl.length
    && fl.every(item =>
      Number.isFinite(item.min) && Number.isFinite(item.max) && item.min <= item.max
      && (item.operators === null || item.operators.length > 0))
    && Number.isFinite(fd.resultMinValue) && Number.isFinite(fd.resultMaxValue)
    && fd.resultMinValue <= fd.resultMaxValue
  if (!valid) return []

  const list = []
  for (let n = 0; n < 4; n += 1) {
    let terms = fl.map(item => randInt(item.min, item.max))
    const ops = fl.slice(1).map(item => OP_SYMBOLS[item.operators[randInt(0, item.operators.length - 1)]])

    // 求算数项模式要出示真实得数：按先乘除后加减算出结果，
    // 除不尽或落在得数范围外就重摇几次，仍不行就放弃这一条示意
    let total = evalWithPrecedence(terms, ops)
    if (fd.whereIsResult == '1') {
      const inRange = (v) => Number.isInteger(v) && v >= fd.resultMinValue && v <= fd.resultMaxValue
      let ok = inRange(total)
      for (let t = 0; t < 8 && !ok; t += 1) {
        terms = fl.map(item => randInt(item.min, item.max))
        total = evalWithPrecedence(terms, ops)
        ok = inRange(total)
      }
      if (!ok) continue
    }

    let parts = [String(terms[0])]
    ops.forEach((op, i) => parts.push(op, String(terms[i + 1])))

    if (fd.whereIsResult == '1' && terms.length > 1) {
      // 求算数项：挖掉一个非首项，右侧展示真实得数
      const blankIndex = randInt(1, terms.length - 1) * 2
      parts[blankIndex] = '____'
      parts.push('=', String(total))
    } else {
      parts.push('=', '____')
    }

    if (fd.enableBrackets && fl.length >= 3) {
      // 示意括号：包住前两个数
      parts = ['(', ...parts.slice(0, 3), ')', ...parts.slice(3)]
    }
    list.push(parts.join(' '))
  }
  return list
}

let sampleTimer = null
watch(
  () => JSON.stringify([
    props.formData?.step,
    props.formData?.formulaList,
    props.formData?.resultMinValue,
    props.formData?.resultMaxValue,
    props.formData?.whereIsResult,
    props.formData?.enableBrackets,
    props.formData?.generateMode,
    props.formData?.customFormulaList,
  ]),
  () => {
    clearTimeout(sampleTimer)
    sampleTimer = setTimeout(() => {
      samples.value = buildSamples()
    }, 300)
  },
  { immediate: true }
)

/* ---------- 我的方案（逻辑与原 ConfigurationList 一致） ---------- */

const activeId = computed({
  get() {
    return props.activeId
  },
  set(val) {
    emit('update:activeId', val)
  }
})

const remove = async (id) => {
  try {
    await proxy.$messageBox.confirm('确定删除吗? ', '提示', { type: 'warning' })
    new ConfigStorage().remove(id)
    proxy.$message.success('删除成功!')
    // 如果删除的配置正在被使用，则自动选择第一个
    if (activeId.value == id) {
      activeId.value = props.configurations[0].id
    }
    emit('removed')
  } catch (error) {
  }
}

const reset = async () => {
  try {
    await proxy.$messageBox.confirm('确定重置吗? ', '提示', { type: 'warning' })

    const configStorage = new ConfigStorage()
    configStorage.clear()

    if (activeId.value == '1') {
      proxy.$message.success('重置成功')
      emit('reset')
    } else {
      emit('reset')
      nextTick(() => {
        // 只改 activeId，让上面的 watch 统一触发 selected，
        // 不在这里手动 emit，避免同一次重置套用两遍配置
        activeId.value = '1'
        proxy.$message.success('重置成功')
      })
    }
  } catch (error) {
  }
}

const select = async (id) => {
  if (id == activeId.value) return
  try {
    await proxy.$messageBox.confirm('确定加载吗? 注意未保存的参数将会丢失!', '提示', { type: 'warning' })
    activeId.value = id
  } catch (error) {
  }
}

watch(() => props.activeId, async (val) => {
  const c = props.configurations.find(p => p.id == val)
  // activeId 可能短暂指向不存在的方案（如删除后数组尚未刷新），
  // emit undefined 会让父级解构崩溃，这里直接跳过
  if (!c) return
  emit('selected', cloneDeep(c))
})
</script>

<style lang="scss" scoped>
.summary-panel {
  position: sticky;
  top: 20px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sp-card {
  background: #fff;
  border: 1px solid var(--psm-gray-200);
  border-radius: var(--psm-radius-md);
  box-shadow: var(--psm-shadow-sm);
  padding: 20px;
}

.sp-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--psm-gray-900);
  margin-bottom: 12px;
}

.sp-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  color: var(--psm-gray-500);
  padding: 6px 0;
  border-bottom: 1px dashed var(--psm-gray-200);

  b {
    color: var(--psm-gray-900);
    font-weight: 600;
    text-align: right;
  }
}

.sp-empty {
  font-size: 13px;
  color: var(--psm-gray-400);
  line-height: 1.8;
  padding: 8px 0;
}

.sp-preview {
  margin: 14px 0 6px;
  background: var(--psm-gray-50);
  border: 1px dashed var(--psm-gray-300);
  border-radius: var(--psm-radius-sm);
  padding: 12px;
  font-size: 14px;
  color: var(--psm-gray-700);
  line-height: 2.1;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.sp-preview-empty {
  color: var(--psm-gray-400);
  font-size: 13px;
}

.sp-preview-note {
  font-size: 12px;
  color: var(--psm-gray-400);
  text-align: center;
  margin-bottom: 12px;
}

.sp-cta {
  width: 100%;
  font-size: 17px;
  font-weight: 700;
  height: 48px;
  border: none;
  background: linear-gradient(135deg, var(--psm-brand-500), var(--psm-brand-600));
  box-shadow: 0 6px 16px rgba(234, 88, 12, 0.35);

  &:hover:not(.is-disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(234, 88, 12, 0.45);
    background: linear-gradient(135deg, var(--psm-brand-400), var(--psm-brand-500));
  }

  &.is-disabled {
    background: var(--psm-gray-300);
    box-shadow: none;
  }
}

.sp-cta-sub {
  text-align: center;
  font-size: 12px;
  color: var(--psm-gray-400);
  margin-top: 10px;
}

.sp-configs-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;

  .sp-title {
    margin-bottom: 0;
  }
}

.sp-conf {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--psm-gray-700);
  padding: 8px 10px;
  border-radius: var(--psm-radius-sm);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--psm-brand-50);
  }

  &.on {
    background: var(--psm-brand-50);
    color: var(--psm-brand-700);
    font-weight: 600;
  }
}

.sp-conf-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-conf-del {
  color: var(--psm-gray-300);
  font-size: 16px;

  &:hover {
    color: var(--el-color-danger);
  }
}

.sp-conf-add {
  color: var(--psm-brand-600);
  border: 1px dashed var(--psm-brand-200);
  margin-top: 8px;
  justify-content: center;

  &:hover {
    background: var(--psm-brand-50);
    border-color: var(--psm-brand-400);
  }
}
</style>
