<template>
  <el-drawer v-model="currentVisible" size="50%" title="其他程序参数设置" :before-close="handleClose">
    <ElForm ref="refForm" :model="formData" :rules="formRules">
      <ElFormItem label="题型设置">
        <el-radio-group v-model="formData.whereIsResult">
          <el-radio-button v-for="o in whereIsResultOptions" :value="o.key" :disabled="o.disabled">{{ o.label
          }}</el-radio-button>
        </el-radio-group>
      </ElFormItem>

      <ElFormItem label="启用括号()">
        <ElCheckbox v-model="formData.enableBrackets" />
      </ElFormItem>

      <ElFormItem label="加法设置">
        <el-radio-group v-model="formData.carry">
          <el-radio-button value="1">随机进位</el-radio-button>
          <el-radio-button value="2">加法进位</el-radio-button>
          <el-radio-button value="3">没有进位</el-radio-button>
        </el-radio-group>
      </ElFormItem>

      <el-form-item label="减法设置">
        <el-radio-group v-model="formData.abdication">
          <el-radio-button value="1">随机退位</el-radio-button>
          <el-radio-button value="2">减法退位</el-radio-button>
          <el-radio-button value="3">没有退位</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="除法设置">
        <el-radio-group v-model="formData.remainder">
          <el-radio-button v-for="o in remainderOptions" :value="o.key" :disabled="o.disabled">{{ o.label
          }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="解题方式">
        <el-radio-group v-model="formData.solution">
          <el-radio-button value="0">用口算解题</el-radio-button>
          <el-radio-button value="1">用竖式解题</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item>
        <el-row :gutter="20" class="w-full">
          <el-col :span="12">
            <ElFormItem prop="numberOfPapers" label="生成的卷子数量">
              <el-input-number v-model="formData.numberOfPapers" :min="1" :step="1" controls-position="right"
                class="w-full">
              </el-input-number>
            </ElFormItem>
          </el-col>
          <el-col :span="12">
            <ElFormItem prop="numberOfPagerColumns" label="口算题列数">
              <el-input-number v-model="formData.numberOfPagerColumns" :min="1" :step="1" controls-position="right"
                class="w-full">
              </el-input-number>
            </ElFormItem>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item label="文件名生成规则" prop="fileNameGeneratedRule">
        <el-radio-group v-model="formData.fileNameGeneratedRule">
          <el-radio-button v-for="o in fileNameGeneratedRuleOptions" :value="o.key">{{ o.label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item prop="paperTitle">
        <el-row :gutter="8">
          <el-col :span="24">
            <el-input v-model="formData.paperTitle">
              <template #prepend>卷子标题</template>
            </el-input>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item prop="paperSubTitle">
        <el-input v-model="formData.paperSubTitle">
          <template #prepend>卷子副标题</template>
        </el-input>
      </el-form-item>

      <el-form-item label="每两行算式之间的高度" prop="lineHeight">
        <el-row :gutter="8">
          <el-col :span="16">
            <el-input-number v-model.number="formData.lineHeight" :min="5" :max="50" :step="1" controls-position="right">
            </el-input-number>
          </el-col>
          <el-col :span="8">
            <div class="text-help">单位：毫米</div>
          </el-col>
        </el-row>
        <div class="text-help">
          按当前行高，一张 A4 每列最多约 {{ perColumnLimit }} 题，{{ pageColumns }} 列共约 {{ perSheetLimit }} 题；
          卷子标题较长（换行）时每列会再少 1 题左右，超出的题目会自动排到下一张纸。
        </div>
      </el-form-item>
    </ElForm>
  </el-drawer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { fileNameGeneratedRuleEnum } from '@/utils/enum.js';
import { maxRowsPerColumn } from '@/utils/paperLayout';

const fileNameGeneratedRuleOptions = computed(() => {
  return Object.entries(fileNameGeneratedRuleEnum).map(([, { key, text }]) => {
    return { key, label: text }
  })
})

const props = defineProps({
  visible: {
    type: Boolean
  },
  formulasFormData: {
    type: Object
  }
})

/**
 * 版面容量提示。
 * 一张 A4 能放多少题完全由行高决定，把结果直接摊给用户看，
 * 免得再出现「明明填了题却印成空白页」的困惑。
 */
const pageColumns = computed(() => Math.max(1, parseInt(props.formulasFormData?.numberOfPagerColumns) || 1))
const perColumnLimit = computed(() => maxRowsPerColumn({
  solution: props.formulasFormData?.solution,
  lineHeight: props.formulasFormData?.lineHeight
}))
const perSheetLimit = computed(() => perColumnLimit.value * pageColumns.value)

const emit = defineEmits(['update:visible', 'update:formulasFormData'])

const currentVisible = computed({
  get() {
    return props.visible
  },
  set(val) {
    emit('update:visible', val)
  }
})

const formData = computed({
  get() {
    return props.formulasFormData
  },
  set(val) {
    emit('update:formulasFormData', val)
  }
})

const formRules = ref({
  numberOfPapers: [
    { required: true, message: '请填写卷子数量' },
    { type: 'number', message: '请填写数字' }
  ],
  numberOfPagerColumns: [
    { required: true, message: '请填写卷子列数' },
    { type: 'number', message: '请填写数字' }
  ],
  paperTitle: [
    { required: true, message: '请填写卷子标题' }
  ],
  paperSubTitle: [
    { required: true, message: '请填写卷子副标题' }
  ],
  lineHeight: [
    { required: true, message: '请填写行高' },
    { type: 'number', message: '请填写数字', transform: value => Number(value) },
    { min: 5, max: 50, message: '行高范围在5-50毫米之间', type: 'number', transform: value => Number(value) }
  ]
})

const refForm = ref(null)

const whereIsResultOptions = computed(() => {
  // 题型设置为求算数项时不能有余数
  const disabled = formData.value.remainder == '3'
  return [
    { key: '0', label: "求结果", disabled: false },
    { key: '1', label: "求算数项", disabled }
  ]
})

const remainderOptions = computed(() => {
  // 题型设置为求算数项时不能有余数
  // 多步运算时不能有余数
  const disabled = formData.value.whereIsResult == '1' || formData.value.step > 1
  return [
    { key: '1', label: "随机余数", disabled: false },
    { key: '2', label: "结果整除", disabled: false },
    { key: '3', label: "结果余数", disabled }
  ]
})

/**
 * 
 * @param {Function} done 
 */
const handleClose = (done) => {
  refForm?.value?.validate((valid) => {
    if (!valid) return

    done()
  })

}
</script>

<style lang="scss" scoped>
.text-help {
  @apply text-xs text-gray-500;
  line-height: 1.5;
  margin-top: 4px;
}
</style>