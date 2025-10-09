<script setup lang="ts">
import { logger } from '../utils/logger'

// electron的tooltip要联动主进程，不太方便
interface Props {
  content: string;
}

defineOptions({ name: 'NativeTooltip' });

const props = defineProps<Props>();
//   若有内容被<NativeTooltip>包裹住
const slots = defineSlots()

if (slots?.default?.().length > 1) {
  logger.warn('NativeTooltip only support one slot.')
}

function updateTooltipContent(content: string) {
  const defaultSlot = slots?.default?.();
  if (defaultSlot) {
    const slotElement = defaultSlot[0]?.el
    // 检查插槽第一个子节点是否为DOM元素
    if(slotElement && slotElement instanceof HTMLElement) {
        // 给slot插槽设置其 title
      slotElement.title = content;
    }
  }
}

onMounted(()=> updateTooltipContent(props.content))

watch(()=>props.content, (val)=> updateTooltipContent(val));
</script>

<template>
  <template v-if="slots.default()[0].el">
    <!-- 子元素是普通 HTML 元素，直接渲染slot -->
    <slot></slot>
  </template>
  <template v-else>
    <!-- 如果是组件，则先用span显示组件名，再将其子el的title正确渲染到slot中 -->
    <span :title="content">
      <slot></slot>
    </span>
  </template>
</template>