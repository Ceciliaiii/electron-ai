# main layout

## 重构路由
设置动态 Path，传了对话 id 则跳转到 conversation，不传就跳转首页。
```ts
// renderer/index.ts

// 注册vue-router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./views/Index.vue'),
      children: [
        {
          path: '/',
          redirect: 'conversation'
        },
        {
          name: 'conversation',
          path: 'conversation/:id?',   // url传对话项id
          component: () => import('./views/conversation.vue')
        }
      ]
    },
  ],
})
```

## id 路由页面
定义了 messageList 的动态视口高度 listHeight，并实时监测窗口变化动态调整大小；也定义了 input 的拖拽，都是由比例 listScale 动态计算：
```vue
<!-- renderer/views/conversation.vue -->

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
```
然后重构 main 区域，作为 router-view 主页面
```vue
<!-- renderer/views/index.vue -->
<template>
  <div class="main-view h-full w-full flex flex-col">
    <title-bar>
      <drag-region class="w-full" />
    </title-bar>
    <main class="flex-auto">
      <router-view />
    </main>
  </div>
</template>
```

## 在对话列表设置 click 方法
点击对话项，传递对话 id 跳转到 conversation 页面；点击对话列表以外的区域，跳转到首页。
```ts
// conversationList/index.vue

// 点击对话跳转
// <li>是单个对话项的容器，在<li>设置click.stop方法
function handleItemClick(item: Conversation) {
  router.push(`/conversation/${item.id}`);
}

// 点击对话list以外的区域，跳转到conversation（在最外层div设置）
function handleClickOutItem() {
  router.push('/conversation');
}
```