/**
 * 年级快捷预设
 *
 * 点击预设卡片时，把 data 里的字段套用进 Home.vue 的 formData，
 * 字段名与取值约定完全对齐 configStorage 的配置结构（不引入新存储格式）。
 *
 * 注意：remainder 不能为 '3'（结果余数），因为多步运算 / 求算数项场景下
 * 该选项被禁用；这里统一用 '2'（结果整除）或 '1'（随机余数）。
 */
export const GRADE_PRESETS = [
  {
    id: 'g1a',
    grade: '一年级上',
    desc: '10 以内加减法',
    data: {
      step: '1',
      numberOfFormulas: 30,
      whereIsResult: '0',
      enableBrackets: false,
      carry: '1',
      abdication: '1',
      remainder: '2',
      formulaList: [
        { min: 1, max: 10, operators: null },
        { min: 1, max: 10, operators: [1, 2] },
      ],
      resultMinValue: 1,
      resultMaxValue: 10,
    },
  },
  {
    id: 'g1b',
    grade: '一年级下',
    desc: '20 以内进退位',
    data: {
      step: '1',
      numberOfFormulas: 30,
      whereIsResult: '0',
      enableBrackets: false,
      carry: '1',
      abdication: '1',
      remainder: '2',
      formulaList: [
        { min: 1, max: 20, operators: null },
        { min: 1, max: 20, operators: [1, 2] },
      ],
      resultMinValue: 1,
      resultMaxValue: 20,
    },
  },
  {
    id: 'g2',
    grade: '二年级',
    desc: '表内乘除法',
    data: {
      step: '1',
      numberOfFormulas: 30,
      whereIsResult: '0',
      enableBrackets: false,
      carry: '1',
      abdication: '1',
      remainder: '2',
      formulaList: [
        { min: 1, max: 9, operators: null },
        { min: 1, max: 9, operators: [3, 4] },
      ],
      resultMinValue: 1,
      resultMaxValue: 81,
    },
  },
  {
    id: 'g3',
    grade: '三年级',
    desc: '多位数混合运算',
    data: {
      step: '2',
      numberOfFormulas: 30,
      whereIsResult: '0',
      enableBrackets: false,
      carry: '1',
      abdication: '1',
      remainder: '2',
      formulaList: [
        { min: 10, max: 99, operators: null },
        { min: 1, max: 9, operators: [3] },
        { min: 1, max: 99, operators: [1, 2] },
      ],
      resultMinValue: 1,
      resultMaxValue: 999,
    },
  },
]
