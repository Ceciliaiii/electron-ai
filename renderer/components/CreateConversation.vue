<script setup lang="ts">
import { useConversationsStore } from '../stores/conversations'


// 抽象插槽组件renderless，只提供创建对话的方法
defineOptions({ name: 'CreateConversation' });
const props = defineProps<{
  providerId: string;
  selectedModel: string;
}>();
const { t } = useI18n();
const conversationsStore = useConversationsStore();

async function createConversation(title?: string) {
  if (!props.providerId || !props.selectedModel) return;
  const conversationId = conversationsStore.addConversation({
    title: title ?? t('main.conversation.newConversation'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    providerId: Number(props.providerId),
    selectedModel: props.selectedModel,
    pinned: false,
  })

//   返回对话独立id给外部index组件调用
  return conversationId;
}
</script>

<template>
    <!-- 将create方法返回给外部index调用，创建对话 -->
  <slot :create="createConversation">
    <!-- renderless -->
  </slot>
</template>