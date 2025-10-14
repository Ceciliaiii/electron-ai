<script setup lang="ts">
import { CTX_KEY } from './constants';

import NativeTooltip from '../NativeTooltip.vue';

interface ItemTitleProps {
  title: string;
}

defineOptions({ name: 'ItemTitle' });

// 组件外部将title传回来
const props = defineProps<ItemTitleProps>();

const ctx = inject(CTX_KEY, void 0);

const isTitleOverflow = ref(false);
const titleRef = useTemplateRef<HTMLElement>('titleRef');


function checkOverflow(element: HTMLElement | null): boolean {
  if (!element) return false;
  return element.scrollWidth > element.clientWidth;
}

// 将标题溢出为true赋值给isTitleOverflow
function _updateOverflowStatus() {
  isTitleOverflow.value = checkOverflow(titleRef.value);
}

// vueuse的防抖方法
const updateOverflowStatus = useDebounceFn(_updateOverflowStatus, 100);


// 触发时机
onMounted(() => {
  updateOverflowStatus();
//   挂载检查
  window.addEventListener('resize', updateOverflowStatus);
})

onUnmounted(() => {
  window.removeEventListener('resize', updateOverflowStatus);
})

// 监听变化
watch([() => props.title, () => ctx?.width.value], () => updateOverflowStatus());
</script>

<template>
  <h2 ref="titleRef" class="conversation-title w-full text-tx-secondary font-semibold loading-5 truncate">
    <template v-if="isTitleOverflow">
      <native-tooltip :content="title">
        {{ title }}
      </native-tooltip>
    </template>
    <template v-else>
      {{ title }}
    </template>
  </h2>
</template>