<script setup lang="ts">
import type { Conversation } from '../../../common/types'
import { Icon as IconifyIcon } from '@iconify/vue'
import ItemTitle from './ItemTitle.vue';

const _PIN_ICON_SIZE = 16 as const

defineOptions({ name: 'ConversationListItem' });

// 接收外面传进来的对话属性，例如title、selectedModel
defineProps<Conversation>();
// 向父组件传递新title，可以重命名对话标题
const emit = defineEmits(['updateTitle']);
</script>

<template>
  <div class="conversation-desc text-tx-secondary flex justify-between items-center text-sm loading-5">
    <span>
      {{ selectedModel }}
      <iconify-icon class="inline-block" v-if="pinned" icon="material-symbols:keep-rounded" :width="_PIN_ICON_SIZE"
        :height="_PIN_ICON_SIZE" />
    </span>
  </div>
  <div class="w-full flex items-center">
    <!-- 复选框 预留 -->
    <!-- <div class="flex-auto"> -->
      <item-title :title="title" />
    <!-- </div> -->
  </div>
</template>