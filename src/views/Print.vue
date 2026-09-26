<template>
  <div :class="{ 'preview': !isPrinting }">
    <div class="A4">
      <div v-for="(sheet, sheetIndex) in sheets" :key="sheetIndex" class="sheet padding-10mm"
        :class="{ 'sheet-shadow': !isPrinting }">
        <div class="mt-12 mb-12">
          <h1>{{ sheet.paperTitle }}</h1>
          <h3>{{ sheet.paperSubTitle }}</h3>
        </div>
        <div class="row">
          <div v-for="(col, colIndex) in sheet.columnsOfPaper" :key="colIndex" :style="`width: ${sheet.colWidth}%;`">
            <p :style="`margin-bottom: ${sheet.rowHeight}`" v-for="(f, rowIndex) in col" :key="rowIndex">{{ f }}</p>
          </div>
        </div>
      </div>
      <div class="btn" v-if="!isPrinting">
        <ElButton @click="goBack">返回</ElButton>
        <ElButton class="mr-2 w-32" type="primary" @click="print">打印</ElButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onActivated, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";
import { buildPrintSheets, FIXED_BLOCK_MM } from "@/utils/paperLayout";


/**
 * 打印版面规则（由 src/utils/paperLayout.js 统一计算）
 *
 * 一张纸 = 一页 A4，是硬约束。每列能放几行取决于行高，
 * 题量超出单张容量时自动拆成多张纸，而不是交给浏览器分页——
 * 因为列容器是 flex，Chrome 分页时不可拆分，放不下会整块跳到下一页，
 * 当前页只剩标题，看起来就是「空白页」。
*/
const isPrinting = ref(false)
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

/**
 * 纸张上除算式行以外的固定高度（上下 padding + 标题块 + 上下外边距）。
 * 标题一旦换行这个值就会变大，写死会把纸顶出页边界，所以渲染后实测一次。
 */
const fixedBlockMM = ref(FIXED_BLOCK_MM)

const measureFixedBlock = () => {
  const sheetEl = document.querySelector('.A4 .sheet')
  const rowEl = sheetEl && sheetEl.querySelector('.row')
  if (!rowEl) return
  const px2mm = (px) => (px / 96) * 25.4
  // FIXED_BLOCK_MM 的语义包含上下 padding，实测值必须补上 padding-bottom：
  // 只取 .row 相对 .sheet 的偏移会少算 10mm，预算反而比兜底值更宽松，
  // 与常量「取整刻意偏大」的保守方向相反
  const paddingBottomMM = px2mm(parseFloat(getComputedStyle(sheetEl).paddingBottom) || 0)
  const height = px2mm(rowEl.getBoundingClientRect().top - sheetEl.getBoundingClientRect().top) + paddingBottomMM
  if (height > 0) fixedBlockMM.value = height
}

const sheets = computed(() => buildPrintSheets(appStore.printPreviewPapers, {
  fixedBlockMM: fixedBlockMM.value
}))

onMounted(() => {
  window.onbeforeprint = () => {
    isPrinting.value = true
  }

  window.onafterprint = () => {
    nextTick(() => {
      isPrinting.value = false
    })
  }
})

/**
 * 标题设置与固定块实测必须放在 onActivated：
 * App.vue 的 <keep-alive> 会缓存本页，返回首页重新生成后再进入时
 * onMounted 不会再触发。若沿用上一次的实测值，标题从短改长后
 * 每列行数会按偏小的固定块计算，末行被打印态的 overflow:hidden
 * 裁掉（静默丢题）。onActivated 在首次挂载时同样会触发。
 */
onActivated(() => {
  // 修改网页标题以作为打印时文件的文件名
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const timeStr = `${year}${month}${day}${hour}${minute}${second}`;
  document.title = route.query.fileName + timeStr

  // 先回到保守兜底值，等本页重新渲染后再按当前标题实测
  fixedBlockMM.value = FIXED_BLOCK_MM
  nextTick(measureFixedBlock)
})

const goBack = () => {
  router.back()
}

const print = () => {
  isPrinting.value = true
  nextTick(() => {
    window.print()
  })
}
</script>

<style lang="scss" scoped>
.preview {
  background: #e0e0e0;
  padding: 5mm;
  display: flex;
  justify-content: center;
  // height: 100vh;
}

/* 窗口过窄时不要把 210mm 宽的纸压窄：一被压窄标题就会换行，
   既让预览失真，也会影响打印版面的实测高度 */
.preview .A4 {
  flex: none;
}

.A4 {
  text-align: center;
}

.sheet {
  margin: 0;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

.sheet-shadow {
  box-shadow: 0 .5mm 2mm rgba(0, 0, 0, .3);
}

.A4 {
  .sheet {
    width: 210mm;
    // height 由打印态控制：一张纸严格等于一页 A4
    background: white;

    &.padding-10mm {
      padding: 10mm
    }

    &.padding-15mm {
      padding: 15mm
    }

    &.padding-20mm {
      padding: 20mm
    }

    &.padding-25mm {
      padding: 25mm
    }
  }
}

/* 屏幕上相邻两张纸之间的间隔。
   只在 screen 下生效——打印时如果还留着这个 margin，
   会把整张纸往下顶 8px，正好卡在页边界上就会多出空白页。 */
@media screen {
  .A4 .sheet {
    @apply mt-2;

    &:first-of-type {
      @apply mt-0;
    }
  }
}

/* 打印：一张纸 = 一页 */
@media print {
  .A4 {
    .sheet {
      height: 297mm;
      margin-top: 0;
      break-after: page;
      page-break-after: always;
    }

    /* 最后一张不补分页符，否则末尾会多出一张空白页 */
    .sheet:last-of-type {
      break-after: auto;
      page-break-after: auto;
    }
  }
}

.row {
  display: flex;
  width: 100%;
}

h1 {
  @apply text-3xl font-bold mb-5;
}

h3 {
  @apply text-base;
}

p {
  @apply text-sm;
  margin-right: 20%;
}

.btn {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 100;
  height: 50px;
  @apply flex justify-end items-center;
  @apply bg-black bg-opacity-50 w-full;
}
</style>