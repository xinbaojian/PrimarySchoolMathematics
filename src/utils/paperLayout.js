/**
 * 打印版面计算
 *
 * 背景：打印时"一张纸"必须严格等于一页 A4。
 * 一旦某张纸的内容高度超过页高，就会出现分页错乱：
 *  - `.row` 是 flex 容器，Chrome 分页时不可拆分，放不下会整块跳到下一页，
 *    于是当前页只剩标题，看起来就是「空白页」；
 *  - 或者纸张盒子本身溢出，末尾多出一张纯空白页。
 *
 * 因此不能依赖浏览器自己分页，必须在生成数据时就把每列行数限制在页高以内，
 * 超出的题目拆到下一张纸。
 *
 * 下面的常量是「A4 + @page margin:0 + .sheet{padding:10mm} + 现有标题块字号」
 * 下的实测值（无头 Chrome 实测，非估算）。
 *
 * h1/h3/p 的行高都是 rem 绝对值，不受字体替换影响，所以这些常量是稳定的。
 * 唯一会变的是标题换行导致标题块变高 —— 这一点由 Print.vue 在渲染后
 * 实测 .row 相对 .sheet 的偏移量并传入 fixedBlockMM 来解决，
 * 下面的 FIXED_BLOCK_MM 只作为首次渲染和降级兜底。
 */

/** A4 纸张高度 */
export const A4_HEIGHT_MM = 297

/** 除算式行以外，一张纸上固定占用的高度：
 *  上下 padding(20) + .mt-12(12.7) + 标题块(21.2) + .mb-12(12.7) = 66.6mm
 *
 *  这是「标题/副标题各占一行」时的兜底值。标题换行会让这个值变大，
 *  所以 Print.vue 会在渲染后实测真实高度并传进来（见 fixedBlockMM 参数），
 *  这里只作为首次渲染与降级使用。 */
export const FIXED_BLOCK_MM = 66.6

/** 单个算式 `<p>` 的行盒高度（tailwind text-sm：line-height 1.25rem） */
export const LINE_BOX_MM = 5.3

/** 安全余量：避免内容刚好贴着页底而多出分页 */
export const SAFETY_MM = 0.5

/** 显示答案时 `<p>` 的 margin-bottom 为 160px */
export const ANSWER_ROW_MM = (160 / 96) * 25.4

/**
 * 行距（题与题之间的 margin）下限，与 OptionsDrawer 行高输入的 min=5 一致。
 * UI 已限制行高 ≥5，但 localStorage 里可能被手动改成脏值：
 * 负数或过小的行距若不兜底，会导致每列行数被放大（-5.3 时甚至除零得
 * Infinity），这里统一钳到下限，保证版面计算永远偏保守。
 */
const MIN_ROW_GAP_MM = 5

/**
 * 每行算式实际占用的高度（行盒 + 行间距）
 * @param {{solution?: string, lineHeight?: number|string}} paper
 * @returns {number} mm
 */
export function rowPitchMM({ solution, lineHeight } = {}) {
  const gap = solution == '0' ? Number(lineHeight) : ANSWER_ROW_MM
  const safeGap = Number.isFinite(gap) ? Math.max(MIN_ROW_GAP_MM, gap) : MIN_ROW_GAP_MM
  return safeGap + LINE_BOX_MM
}

/**
 * 一列最多能放几行，保证这张纸不超过一页高度
 * @param {{solution?: string, lineHeight?: number|string}} paper
 * @param {number} [fixedBlockMM] 纸张上除算式行以外的固定高度（实测值优先）
 * @returns {number} 行数（至少 1）
 */
export function maxRowsPerColumn(paper = {}, fixedBlockMM = FIXED_BLOCK_MM) {
  const budget = A4_HEIGHT_MM - fixedBlockMM - SAFETY_MM
  return Math.max(1, Math.floor(budget / rowPitchMM(paper)))
}

/**
 * 把一份卷子的算式切成若干张纸，保证「每张纸一页、每列不超过 maxRows 行」。
 *
 * 列按自然顺序从左到右排列（第 1 列是最开始的题目）。
 *
 * @param {Array} formulas 算式列表
 * @param {number} numberOfPagerColumns 每张纸的列数
 * @param {number} maxRows 每列最大行数
 * @returns {Array<Array<Array>>} 每张纸 -> 各列 -> 各行算式
 */
export function buildPaperSheets(formulas = [], numberOfPagerColumns = 1, maxRows = Infinity) {
  const total = formulas.length
  if (!total) return []

  const columnsPerSheet = Math.max(1, parseInt(numberOfPagerColumns) || 1)
  const rowsLimit = Math.max(1, Math.floor(maxRows) || 1)

  // 需要的张数：总题数 / 单张容量，向上取整
  let sheetCount = Math.max(1, Math.ceil(total / (columnsPerSheet * rowsLimit)))

  // 均分后每列行数可能因取整略微超出上限，逐张增加直到满足
  let perSheet = total
  let rowsPerColumn = total
  while (sheetCount <= total) {
    perSheet = Math.ceil(total / sheetCount)
    rowsPerColumn = Math.ceil(perSheet / columnsPerSheet)
    if (rowsPerColumn <= rowsLimit) break
    sheetCount += 1
  }

  const sheets = []
  for (let i = 0; i < sheetCount; i += 1) {
    const slice = formulas.slice(i * perSheet, (i + 1) * perSheet)
    if (!slice.length) continue

    const columnsOfPaper = []
    for (let j = 0; j < slice.length; j += rowsPerColumn) {
      columnsOfPaper.push(slice.slice(j, j + rowsPerColumn))
    }
    sheets.push(columnsOfPaper)
  }
  return sheets
}

/**
 * 生成打印用的纸张数据（供 Print.vue 直接消费）
 * @param {Array} papers 卷子列表
 * @param {{fixedBlockMM?: number}} [options] fixedBlockMM 为纸张上固定占用高度的实测值
 * @returns {Array} 每个元素对应屏幕上的一张纸
 */
export function buildPrintSheets(papers = [], options = {}) {
  const { fixedBlockMM = FIXED_BLOCK_MM } = options

  return papers.flatMap((paper) => {
    const {
      paperTitle,
      paperSubTitle,
      numberOfPagerColumns,
      solution,
      formulas = [],
      lineHeight,
    } = paper

    const columns = Math.max(1, parseInt(numberOfPagerColumns) || 1)
    const maxRows = maxRowsPerColumn({ solution, lineHeight }, fixedBlockMM)

    return buildPaperSheets(formulas, columns, maxRows).map((columnsOfPaper) => ({
      paperTitle,
      paperSubTitle,
      columnsOfPaper,
      colWidth: 100 / columns,
      rowHeight: solution == '0' ? `${lineHeight}mm` : '160px',
    }))
  })
}
