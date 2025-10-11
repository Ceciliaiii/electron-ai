import type { Conversation } from '../../common/types';
import { conversations as testConversations } from '../testData';

export const useConversationsStore = defineStore('conversations', () => {
  const conversations = ref<Conversation[]>(testConversations);


//   computed只读，这是getter方法，只读取对话最新内容
  const allConversations = computed(() => conversations.value)
  return {
    conversations,
    allConversations,
  }
})