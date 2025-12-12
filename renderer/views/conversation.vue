<script setup lang="ts">
import type { SelectValue } from '../types';
import { CONFIG_KEYS, MAIN_WIN_SIZE } from '../../common/constants';
import { throttle } from '../../common/utils';
// import { messages } from '../testData';

import ResizeDivider from '../components/ResizeDivider.vue';
import MessageInput from '../components/MessageInput.vue';
import CreateConversation from '../components/CreateConversation.vue';
import MessageList from '../components/MessageList.vue';
import { useMessagesStore } from '../stores/messages';
import { useConversationsStore } from '../stores/conversations';
import { useProvidersStore } from '../stores/providers';
import useConfig from '../hooks/useConfig';

const listHeight = ref(0);
const listScale = ref(0.7);
const maxListHeight = ref(window.innerHeight * 0.7);
// const isStoping = ref(false);
const message = ref('');
const provider = ref<SelectValue>();
const msgInputRef = useTemplateRef<{ selectedProvider: SelectValue }>('msgInputRef');

const route = useRoute();
const router = useRouter();
const config = useConfig();

const messagesStore = useMessagesStore();
const conversationsStore = useConversationsStore();
const providersStore = useProvidersStore();


const providerId = computed(() => ((provider.value as string)?.split(':')[0] ?? ''));
const selectedModel = computed(() => ((provider.value as string)?.split(':')[1] ?? ''));
// 对话项id
const conversationId = computed(() => Number(route.params.id) as number | undefined);

const defaultModel = computed(() => {
  const vals: string[] = [];
  providersStore.allProviders.forEach(provider => {
    if (!provider.visible) return;
    provider.models.forEach(model => {
      vals.push(`${provider.id}:${model}`)
    })
  })
  if (!vals.includes(config[CONFIG_KEYS.DEFAULT_MODEL] ?? '')) return null
  return config[CONFIG_KEYS.DEFAULT_MODEL] || null;
})


// 按钮状态切换
const isStoping = ref(false);
const messageInputStatus = computed(() => {
  if (isStoping.value) return 'loading';
  const messages = messagesStore.messagesByConversationId(conversationId.value as number);
  const last = messages[messages.length - 1];
  // 正在生成消息时或生成前，loading状态
  if (last?.status === 'streaming' && last?.content?.length === 0) return 'loading';
  if (last?.status === 'loading' || last?.status === 'streaming') return last?.status;
  return 'normal';
})


async function handleCreateConversation(create: (title: string) => Promise<number | void>, _message: string) {
  const id = await create(_message);
  if (!id) return;
  afterCreateConversation(id, _message);
}

// 创建对话后，直接跳转
function afterCreateConversation(id: number, firstMsg: string) {
  if (!id) return;
  router.push(`/conversation/${id}`);
  messagesStore.sendMessage({
    type: 'question',
    content: firstMsg,
    conversationId: id 
  })
  message.value = '';  // 清空输入框内容
  // 初始化 新对话的input草稿箱
  messagesStore.setMessageInputValue(id, '')
}


async function handleSendMessage() {
  if(!conversationId.value) return;

  const _conversationId = conversationId.value;
  // 获取当前对话的input内容
  const content = messagesStore.messageInputValueById(_conversationId);
  if (!content?.trim()?.length) return;
  messagesStore.sendMessage({
    type: 'question',
    content,
    conversationId: _conversationId,
  })
  // 发送完，清空input
  messagesStore.setMessageInputValue(_conversationId, '');
}


// 对话切换模型，左侧自动更新
const canUpdateConversationTime = ref(true);
function handleProviderSelect() {
  const current = conversationsStore.getConversationById(conversationId.value as number);
  if (!conversationId.value || !current) return;
  conversationsStore.updateConversation({
    ...current,
    providerId: Number(providerId.value),
    selectedModel: selectedModel.value,
  }, canUpdateConversationTime.value)
}


async function handleStopMessage() {
  isStoping.value = true;
  const msgIds = messagesStore.loadingMsgIdsByConversationId(conversationId.value as number ?? -1);
  for (const id of msgIds) {
    messagesStore.stopMessage(id);
  }
  isStoping.value = false;
}


// 随着窗口变化而调整对话框大小（节流）
window.onresize = throttle(async () => {
  if (window.innerHeight < MAIN_WIN_SIZE.minHeight) return;
    // message列表高度：窗口高度 * list比例，实时计算
  listHeight.value = window.innerHeight * listScale.value;
  await nextTick();
  maxListHeight.value = window.innerHeight * 0.7;  // messageList最大高度设置
    // 若messageList高度大于max，则视口只显示max高度的message
    // 场景：缩小main窗口size时
  if (listHeight.value > maxListHeight.value) listHeight.value = maxListHeight.value;
}, 40);

onMounted(async () => {
  await nextTick();
  listHeight.value = window.innerHeight * listScale.value;
});

onBeforeRouteUpdate(async (to, from, next) => {
  if (to.params.id === from.params.id) return next();
  await messagesStore.initialize(Number(to.params.id));
  next();
})

// 实时监测message列表高度 => 动态变化List比例大小
watch(() => listHeight.value, () => listScale.value = listHeight.value / window.innerHeight);


watch([() => conversationId.value, () => msgInputRef.value], async ([id, msgInput]) => {
  if (!msgInput || !id) {
    // 切换到首页，跳回默认模型
    provider.value = defaultModel.value
    return;
  }

  const current = conversationsStore.getConversationById(id);
  if (!current) return;

  canUpdateConversationTime.value = false;
  msgInput.selectedProvider = `${current.providerId}:${current.selectedModel}`;
  await nextTick();
  canUpdateConversationTime.value = true;

  // 切换对话，清空首页input
  // message.value = '';
});


</script>
<template>
    <!-- 路由不传id时，显示欢迎信息 -->
  <div class="h-full " v-if="!conversationId">
    <div class="h-full pt-[50vh] px-5">
      <div class="text-3xl font-bold text-primary-subtle text-center">
        {{ $t('main.welcome.helloMessage') }}
      </div>

      <div class="bg-bubble-others mt-10 max-w-[800px] h-[250px] mx-auto rounded-md">
        <create-conversation :providerId="providerId" :selectedModel="selectedModel" v-slot="{ create }">
          <message-input v-model:message="message" v-model:provider="provider"
            :placeholder="$t('main.conversation.placeholder')" @send="handleCreateConversation(create, message)" />
        </create-conversation>
      </div>
    </div>
  </div>
  <div class="h-full flex flex-col" v-else>
    <div class="w-full min-h-0" :style="{ height: `${listHeight}px` }">
      <message-list :messages="messagesStore.messagesByConversationId(conversationId)" />
    </div>
    <div class="input-container bg-bubble-others flex-auto w-[calc(100% + 10px)] ml-[-3px] ">
      <resize-divider direction="horizontal" v-model:size="listHeight" :max-size="maxListHeight" :min-size="100" />
       <message-input class="p-2 pt-0" ref="msgInputRef"
        :message="messagesStore.messageInputValueById(conversationId ?? -1)" v-model:provider="provider"
        :placeholder="$t('main.conversation.placeholder')" :status="messageInputStatus"
        @update:message="messagesStore.setMessageInputValue(conversationId ?? -1, $event)" @send="handleSendMessage"
        @select="handleProviderSelect" @stop="handleStopMessage" />
    </div>
  </div>
</template>

<style scoped>
.input-container {
  box-shadow: 5px 1px 20px 0px rgba(101, 101, 101, 0.2);
}
</style>