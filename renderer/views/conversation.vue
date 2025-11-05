<script setup lang="ts">
import type { SelectValue } from '../types';
import { MAIN_WIN_SIZE } from '../../common/constants';
import { throttle } from '../../common/utils';

import ResizeDivider from '../components/ResizeDivider.vue';
import MessageInput from '../components/MessageInput.vue';
import CreateConversation from '../components/CreateConversation.vue';

const listHeight = ref(0);
const listScale = ref(0.7);
const maxListHeight = ref(window.innerHeight * 0.7);
// const isStoping = ref(false);
const message = ref('');
const provider = ref<SelectValue>();
// const msgInputRef = useTemplateRef<{ selectedProvider: SelectValue }>('msgInputRef');

const route = useRoute();
const router = useRouter();


const providerId = computed(() => ((provider.value as string)?.split(':')[0] ?? ''));
const selectedModel = computed(() => ((provider.value as string)?.split(':')[1] ?? ''));
// 对话项id
const conversationId = computed(() => Number(route.params.id) as number | undefined);

async function handleCreateConversation(create: (title: string) => Promise<number | void>, _message: string) {
  const id = await create(_message);
  if (!id) return;
  afterCreateConversation(id, _message);
}

// 创建对话后，直接跳转
function afterCreateConversation(id: number, _firstMsg: string) {
  if (!id) return;
  router.push(`/conversation/${id}`);
  // TODO: 第一条消息 涉及store
  message.value = '';  // 清空输入框内容
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

// 实时监测message列表高度 => 动态变化List比例大小
watch(() => listHeight.value, () => listScale.value = listHeight.value / window.innerHeight);

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
      message-list
    </div>
    <div class="input-container bg-bubble-others flex-auto w-[calc(100% + 10px)] ml-[-5px] ">
      <resize-divider direction="horizontal" v-model:size="listHeight" :max-size="maxListHeight" :min-size="100" />
      <message-input v-model:provider="provider" :placeholder="$t('main.conversation.placeholder')" />
    </div>
  </div>
</template>

<style scoped>
.input-container {
  box-shadow: 5px 1px 20px 0px rgba(101, 101, 101, 0.2);
}
</style>