<template>
  <div class="page-container">
    <QuickPresets v-if="formData.generateMode == '1'" :presets="GRADE_PRESETS" :active-id="activePresetId"
      @select="applyPreset" />

    <div class="home-grid">
      <!-- 左列：参数表单 -->
      <ElForm ref="refForm" :model="formData" label-position="top" class="home-form">
        <div class="psm-card">
          <div class="step-head">
            <span class="step-no">1</span>
            <span class="step-title">生成方式</span>
          </div>
          <ElFormItem>
            <el-radio-group v-model="formData.generateMode">
              <el-radio-button value="1">自动生成</el-radio-button>
              <el-radio-button value="2">手动添加</el-radio-button>
            </el-radio-group>
          </ElFormItem>
        </div>

        <div class="psm-card">
          <div class="step-head">
            <span class="step-no">2</span>
            <span class="step-title">{{ formData.generateMode == '1' ? '题型与范围' : '手动录入题目' }}</span>
          </div>

          <template v-if="formData.generateMode == '1'">
            <AutoGenerateFormulas v-model:formulas-form-data="formData" v-model:papers="paperList"
              :ref-form="refForm" />
          </template>

          <template v-if="formData.generateMode == '2'">
            <CustomFormulas v-model:formulas-form-data="formData" v-model:papers="paperList" :ref-form="refForm" />
          </template>
        </div>
      </ElForm>

      <!-- 右列：实时摘要 + 生成 + 我的方案 -->
      <SummaryPanel v-model:active-id="activeConfigurationId" :form-data="formData" :papers="paperList"
        :configurations="configurations" :loading="buttonLoading" @generate="generate" @save-config="saveConfig"
        @removed="refreshConfiguration" @selected="selectedConfiguration" @reset="refreshConfiguration" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, unref, toRaw, getCurrentInstance, computed, watch } from 'vue';
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { CustomFormulas, AutoGenerateFormulas, QuickPresets, SummaryPanel } from "@/components/home";
import ConfigStorage from "@/utils/configStorage";
import { GRADE_PRESETS } from "@/utils/presets";
import { fileNameGeneratedRuleEnum } from '@/utils/enum';
import { useAppStore } from '@/stores/app';
import { createFormulasGenerator } from '@/utils/paperGenerator';
import { cloneDeep } from 'lodash';

const { proxy } = getCurrentInstance()

const refForm = ref(null)

const formData = ref({
  step: '1', // 几步运算
  numberOfFormulas: 30, // 口算题数量
  whereIsResult: '0', // 题型设置
  enableBrackets: false, // 启用括号
  carry: '1',
  abdication: '1',
  remainder: '2',
  solution: '0', // 解题方式
  numberOfPapers: 3, // 试卷数量
  numberOfPagerColumns: 3, // 试卷列数
  paperTitle: '小学生口算题', // 试卷标题
  paperSubTitle: '姓名：__________ 日期：____月____日 时间：________ 对题：____道', // 试卷副标题
  lineHeight: 10, // 每两行算式之间的高度
  // 试题格式
  // min 算数项最小值 max 算数项最大值 operators 与上一步算数项使用的运算符号
  // 第一个算数项由于没有上一步故设置为null
  formulaList: [
    { min: 1, max: 9, operators: null },
    { min: 1, max: 9, operators: [1] },
  ],
  resultMinValue: 1, // 试题运行结果最小值
  resultMaxValue: 9, // 试题运行结果最大值
  generateMode: '1',
  customFormulaList: [
    { formula: '' }
  ],
  fileNameGeneratedRule: fileNameGeneratedRuleEnum.baseOnTitleAndIndex.key
})

const configurations = ref([])

watch(() => formData.value.lineHeight, (newVal) => {
  if (typeof newVal !== 'number') {
    formData.value.lineHeight = Number(newVal) || 10
  }
})

/** 把一份配置（或预设）的字段套用到 formData，预设与已保存配置共用这一入口 */
const applyConfig = (config) => {
  formData.value.step = config.step
  formData.value.numberOfFormulas = config.numberOfFormulas
  formData.value.whereIsResult = config.whereIsResult
  formData.value.enableBrackets = config.enableBrackets
  formData.value.carry = config.carry
  formData.value.abdication = config.abdication
  formData.value.remainder = config.remainder
  formData.value.formulaList = cloneDeep(config.formulaList)
  formData.value.resultMinValue = config.resultMinValue
  formData.value.resultMaxValue = config.resultMaxValue

  // 以下字段预设里不带，仅加载已保存配置时套用
  if (config.solution !== undefined) formData.value.solution = config.solution
  if (config.numberOfPapers !== undefined) formData.value.numberOfPapers = config.numberOfPapers
  if (config.numberOfPagerColumns !== undefined) formData.value.numberOfPagerColumns = config.numberOfPagerColumns
  if (config.paperTitle !== undefined) formData.value.paperTitle = config.paperTitle
  if (config.paperSubTitle !== undefined) formData.value.paperSubTitle = config.paperSubTitle
  if (config.lineHeight !== undefined) formData.value.lineHeight = parseInt(config.lineHeight) || 10
  if (config.fileNameGeneratedRule !== undefined) formData.value.fileNameGeneratedRule = config.fileNameGeneratedRule
}

onMounted(async () => {
  document.title = '小学数学口算题 | Primary School Mathematics'

  refreshConfiguration()
  const { data: config } = configurations.value[0] // todo
  applyConfig(config)
})

const paperList = ref([])

const activeConfigurationId = ref('1')
const refreshConfiguration = () => {
  configurations.value = new ConfigStorage().loadAll()
}

const selectedConfiguration = (configuration) => {
  // SummaryPanel 的 watch 在 activeId 指向不存在的方案时会跳过 emit，
  // 这里再兜一层，防止历史调用路径传入 undefined 导致解构崩溃
  if (!configuration?.data) return
  const { data: config } = configuration
  applyConfig(config)
}

/** 年级快捷预设：套用参数并给出反馈 */
const applyPreset = (preset) => {
  applyConfig(preset.data)
  proxy.$message.success(`已套用「${preset.grade} · ${preset.desc}」，可再微调后点右侧「生成试卷」`)
}

/** 当前参数与哪个预设完全一致（用于卡片高亮）。
 *  比较预设会设置的全部题型参数（不含题量这类可自由微调的字段），
 *  在「更多设置」里改过进位/退位等参数后，卡片高亮应随之消失 */
const activePresetId = computed(() => {
  const fd = formData.value
  const hit = GRADE_PRESETS.find(p => {
    const d = p.data
    return d.step == fd.step
      && d.whereIsResult == fd.whereIsResult
      && d.enableBrackets == fd.enableBrackets
      && d.carry == fd.carry
      && d.abdication == fd.abdication
      && d.remainder == fd.remainder
      && d.resultMinValue == fd.resultMinValue
      && d.resultMaxValue == fd.resultMaxValue
      && JSON.stringify(d.formulaList) == JSON.stringify(fd.formulaList)
  })
  return hit ? hit.id : ''
})

/** 保存当前参数为方案（原 AutoGenerateFormulas 内的逻辑，上移到首页供右栏调用） */
const saveConfig = () => {
  refForm.value?.validate((valid) => {
    if (!valid) return

    proxy.$messageBox.prompt('请给配置起个名字', '提示', {
      inputPattern: /^\S{1,10}$/,
      inputPlaceholder: '不能多于10个字符',
      inputErrorMessage: '配置名字不能为空且不能多于10个字符'
    }).then(({ value }) => {
      if (configurations.value?.length >= 10) {
        proxy.$message.error('最多只能保存10份配置！')
        return
      }

      const newId = uuidv4()
      new ConfigStorage().save(newId, value, toRaw(unref(formData)))
      proxy.$message.success('保存成功!')
      activeConfigurationId.value = newId
      refreshConfiguration()
    }).catch(() => { })
  })
}

const buttonLoading = ref(false)
const appStore = useAppStore()
const router = useRouter()
const generate = () => {
  // 生成试卷数量不能过多
  const numberOfFormulas = paperList.value.reduce((prev, cur) => {
    prev += parseInt(cur.numberOfFormulas)
    return prev
  }, 0)

  if (numberOfFormulas * formData.value.numberOfPapers > 1000) {
    proxy.$message.error('题目总数不能超过1000题!')
    return
  }

  const papers = createFormulasGenerator(toRaw(unref(formData)), toRaw(unref(paperList)))
  appStore.navigateToPrint(router, formData.value.fileNameGeneratedRule == fileNameGeneratedRuleEnum.baseOnTitleAndIndex.key ? formData.value.paperTitle : "", papers)
  paperList.value = []
}
</script>

<style lang="scss" scoped>
/* 首页画布底色（tokens.css 只放令牌，不放页面样式） */
.page-container {
  background: var(--psm-gray-50);
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: start;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
}

.psm-card {
  background: #fff;
  border: 1px solid var(--psm-gray-200);
  border-radius: var(--psm-radius-md);
  box-shadow: var(--psm-shadow-sm);
  padding: 20px 24px 4px;
  margin-bottom: 16px;
}

.step-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.step-no {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--psm-brand-100);
  color: var(--psm-brand-600);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-title {
  font-weight: 700;
  font-size: 16px;
  color: var(--psm-gray-900);
}
</style>
