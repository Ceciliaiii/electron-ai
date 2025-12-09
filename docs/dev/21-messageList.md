# MessageList 初始化
初始化 `MessageList` 组件，其中的 markdown 文档流渲染组件 `MessageRender` 先简单处理。

## MessageList
在 conversation 组件中，设置 messageList 子组件，展示对话：
```html
<!-- renderer/views/conversation.vue -->

<div class="w-full min-h-0" :style="{ height: `${listHeight}px` }">
    <!-- 这里的 messages 暂时用的是 testData 的假数据 -->
    <message-list :messages="messages" />
</div>
```
子组件中，将 ai 的回复气泡做了一个简单逻辑处理（不完善）：在提问和回答两个场景下，使用 `MessageRender` 根据状态 loading、streaming 显示不同文本。
```vue
<!-- renderer/components/messageList.vue -->

<script setup lang="ts">
import type { Message } from '../../common/types';

import { NScrollbar } from 'naive-ui'
import MessageRender from './MessageRender.vue';

defineOptions({ name: 'MessageList' });

defineProps<{
  messages: Message[];
}>();
</script>

<template>
  <div class="flex flex-col h-full">
    <n-scrollbar class="message-list px-5 pt-6">
      <div class="message-list-item mt-3 pb-5 flex items-center" v-for="message in messages" :key="message.id">
        <div class="pr-5" v-show="false">
          <!-- TODO: 多选message checkbox -->
        </div>
        <div class="flex flex-auto"
          :class="{ 'justify-end': message.type === 'question', 'justify-start': message.type === 'answer' }">
          <span>
            <div class="text-sm text-gray-500 mb-2"
              :style="{ textAlign: message.type === 'question' ? 'end' : 'start' }">
              <!-- TODO: timeAgo -->
              {{ message.createdAt }}
            </div>
            <!-- 提问时 -->
            <div class="msg-shadow p-2 rounded-md bg-bubble-self text-white" v-if="message.type === 'question'">
                <!-- md文档流回复渲染 -->
              <message-render :msg-id="message.id" :content="message.content"
                :is-streaming="message.status === 'streaming'" />
            </div>
            <!-- 生成回复时 -->
            <div v-else class="msg-shadow p-2 px-6 rounded-md bg-bubble-others" :class="{
              'bg-bubble-others': message.status !== 'error',
              'text-tx-primary': message.status !== 'error',
              'text-red-300': message.status === 'error',
              'font-bold': message.status === 'error'
            }">
              <!-- loading中 -->
              <template v-if="message.status === 'loading'">
                ...
              </template>
              <!-- 正在生成,streaming -->
              <template v-else>
                <message-render :msg-id="message.id" :content="message.content"
                  :is-streaming="message.status === 'streaming'" />
              </template>
            </div>
          </span>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<style scoped>
.msg-shadow {
  box-shadow: 0 0 10px var(--input-bg);
}
</style>
```

## MessageRender
暂时简单设置渲染组件：
```vue
<!-- renderer/components/messageRender.vue -->

<script setup lang="ts">
defineOptions({ name: 'MessageRender' });
defineProps<{
  msgId: number;
  content: string;
  isStreaming: boolean;
}>();
</script>
<template>
  <span>
    {{ content }}
  </span>
</template>
```