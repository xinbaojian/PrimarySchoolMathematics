<template>
  <div>
    <ElFormItem label="几个数相算？">
      <div class="step-row">
        <el-radio-group v-model="formData.step" @change="changeStep">
          <el-radio-button v-for="o in stepOptions" :value="o.key" :disabled="o.disabled">{{ o.label }}</el-radio-button>
        </el-radio-group>
        <ElButton class="more-options" type="primary" plain @click="openOptionsDrawer">
          <el-icon class="mr-1"><Setting /></el-icon>更多设置
        </ElButton>
      </div>
      <p class="field-hint">行高、卷子标题、进位退位等参数在「更多设置」里调整</p>
    </ElFormItem>

    <template v-for="(item, index) in formData.formulaList" :key="index">
      <ElFormItem v-if="item.operators" :label="`第 ${index} 步用哪些运算符号？（可多选）`"
        :prop="`formulaList.${index}.operators`" :rules="requiredRule">
        <div class="op-btns" role="group" :aria-label="`第 ${index} 步运算符号`">
          <button v-for="o in operatorOptions" :key="o.key" type="button" class="op-btn"
            :class="{ on: item.operators.includes(o.key) }" :title="o.name" :aria-pressed="item.operators.includes(o.key)"
            @click="toggleOperator(item, index, o.key)">
            {{ o.symbol }}
          </button>
        </div>
      </ElFormItem>

      <ElFormItem :label="`第 ${index + 1} 个数的范围`">
        <div class="range-row">
          <ElFormItem :prop="`formulaList.${index}.min`" :rules="requiredNumberRule" class="range-input">
            <ElInput v-model.number="item.min">
              <template #prepend>最小</template>
            </ElInput>
          </ElFormItem>
          <span class="range-tilde">~</span>
          <ElFormItem :prop="`formulaList.${index}.max`" :rules="requiredNumberRule" class="range-input">
            <ElInput v-model.number="item.max">
              <template #prepend>最大</template>
            </ElInput>
          </ElFormItem>
          <!-- 滑条上限必须容纳当前值：el-slider 对超限 modelValue 会立刻 emit 钳制值，
               写死 100/1000 会在失焦瞬间把手输的大值（如三位数、万以内）静默改写掉 -->
          <el-slider class="range-slider" :model-value="[item.min, item.max]"
            :min="Math.min(0, Number(item.min) || 0)" :max="Math.max(100, Number(item.max) || 0)" range
            @update:model-value="([a, b]) => { item.min = a; item.max = b }" />
        </div>
      </ElFormItem>
    </template>

    <ElFormItem label="得数的范围">
      <div class="range-row">
        <ElFormItem prop="resultMinValue"
          :rules="[{ required: true, message: '请填写得数最小值' }, { type: 'number', message: '请填写数字' }]"
          class="range-input">
          <ElInput v-model.number="formData.resultMinValue">
            <template #prepend>最小</template>
          </ElInput>
        </ElFormItem>
        <span class="range-tilde">~</span>
        <ElFormItem prop="resultMaxValue"
          :rules="[{ required: true, message: '请填写得数最大值' }, { type: 'number', message: '请填写数字' }]"
          class="range-input">
          <ElInput v-model.number="formData.resultMaxValue">
            <template #prepend>最大</template>
          </ElInput>
        </ElFormItem>
        <el-slider class="range-slider" :model-value="[formData.resultMinValue, formData.resultMaxValue]"
          :min="Math.min(0, Number(formData.resultMinValue) || 0)"
          :max="Math.max(1000, Number(formData.resultMaxValue) || 0)" range
          @update:model-value="([a, b]) => { formData.resultMinValue = a; formData.resultMaxValue = b }" />
      </div>
    </ElFormItem>

    <ElFormItem prop="numberOfFormulas"
      :rules="[{ required: true, message: '请填写每份卷子的题数' }, { type: 'number', message: '请填写数字' }]">
      <div class="range-row">
        <ElFormItem class="range-input count-input">
          <ElInput v-model.number="formData.numberOfFormulas">
            <template #prepend>每份题数</template>
          </ElInput>
        </ElFormItem>
      </div>
    </ElFormItem>

    <ElFormItem>
      <ElButton type="primary" @click="append">
        <el-icon class="mr-1"><CirclePlus /></el-icon>添加为一组题
      </ElButton>
      <ElButton @click="clear">清空题组</ElButton>
      <p class="field-hint flow-hint">可以添加多组不同的题型（比如一组加法、一组乘法），最后在右侧一起生成卷子</p>
    </ElFormItem>

    <OptionsDrawer v-model:visible="optionsDrawerVisible" v-model:formulasFormData="formData" />
  </div>
</template>

<script setup>
import { computed, ref, unref, toRaw } from 'vue';
import { cloneDeep } from "lodash";
import { OptionsDrawer } from "@/components/home";

const props = defineProps({
  formulasFormData: {
    type: Object
  },
  papers: {
    type: Array
  },
  refForm: {
    type: Object
  }
})

const emit = defineEmits(['update:formulasFormData', 'update:papers'])

const formData = computed({
  get() {
    return props.formulasFormData
  },
  set(val) {
    emit('update:formulasFormData', val)
  }
})

const paperList = computed({
  get() {
    return props.papers
  },
  set(val) {
    emit('update:papers', val)
  }
})

const operatorOptions = [
  { key: 1, symbol: '＋', name: '加法' },
  { key: 2, symbol: '－', name: '减法' },
  { key: 3, symbol: '×', name: '乘法' },
  { key: 4, symbol: '÷', name: '除法' }
]

const toggleOperator = (item, index, key) => {
  const i = item.operators.indexOf(key)
  if (i >= 0) {
    item.operators.splice(i, 1)
  } else {
    item.operators.push(key)
  }
  // 自绘按钮不走 el-checkbox-group，不会自动触发 el.form.change，
  // 手动校验对应字段，让「至少一种符号」的报错/消除即时可见
  props.refForm?.validateField(`formulaList.${index}.operators`)?.catch?.(() => { })
}

const requiredRule = [
  { required: true, message: '请至少选择一种运算符号' }
]
const requiredNumberRule = [
  { required: true, message: '此项为必填项' }, { type: 'number', message: '此项必须为数字' }
]


const stepOptions = computed(() => {
  // 多步运算时不能有余数
  const disabled = formData.value.remainder == '3'
  return [
    { key: '1', label: "2 个数", disabled: false },
    { key: '2', label: "3 个数", disabled },
    { key: '3', label: "4 个数", disabled }
  ]
})
const changeStep = (val) => {
  // 选择了新的几个数相算后, 计算新值与旧值的差
  const difference = parseInt(val) - formData.value.formulaList.length + 1

  // 如果差是正数说明需要增加新的算数项,如果差是负数说明需要减去旧的算数项
  if (difference > 0) {
    for (let i = 1; i <= difference; i++) {
      formData.value.formulaList.push({ min: 1, max: 9, operators: [1] })
    }
  } else if (difference < 0) {
    formData.value.formulaList.splice(difference, Math.abs(difference))
  }
}

const optionsDrawerVisible = ref(false)
const openOptionsDrawer = () => {
  optionsDrawerVisible.value = true
}

const append = () => {
  props.refForm?.validate((valid) => {
    if (!valid) return

    const { step, numberOfFormulas, whereIsResult, formulaList, resultMinValue, resultMaxValue } = cloneDeep(toRaw(formData.value))
    paperList.value.push({
      step, numberOfFormulas, whereIsResult, formulaList, resultMinValue, resultMaxValue
    })
  })
}

const clear = () => {
  paperList.value = []
}
</script>

<style lang="scss" scoped>
.step-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.field-hint {
  width: 100%;
  font-size: 12px;
  color: var(--psm-gray-400);
  line-height: 1.5;
  margin-top: 6px;
}

.flow-hint {
  margin-left: 4px;
}

.op-btns {
  display: flex;
  gap: 12px;
}

.op-btn {
  width: 56px;
  height: 56px;
  border-radius: var(--psm-radius-md);
  border: 1.5px solid var(--psm-gray-200);
  background: #fff;
  font-size: 26px;
  line-height: 1;
  color: var(--psm-gray-500);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--psm-brand-400);
    color: var(--psm-brand-600);
  }

  &.on {
    border-color: var(--psm-brand-500);
    background: var(--psm-brand-50);
    color: var(--psm-brand-600);
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
  }
}

.range-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
}

.range-input {
  flex: 0 0 170px;
  width: 170px;
  margin-bottom: 0;
}

.count-input {
  flex-basis: 200px;
  width: 200px;
}

.range-tilde {
  line-height: 32px;
  color: var(--psm-gray-400);
}

.range-slider {
  flex: 1;
  min-width: 140px;
  margin-top: 4px;
  margin-left: 8px;
}

.mr-1 {
  margin-right: 4px;
}
</style>
