import { useConversationsStore } from '../../stores/conversations';

const searchKey = ref('');

// 对话筛选器
export function useFilter() {
  const conversationsStore = useConversationsStore();

  const filteredConversations = computed(() => {

    return conversationsStore.allConversations
  })

  return {
    searchKey,
    conversations: filteredConversations
  }
}
