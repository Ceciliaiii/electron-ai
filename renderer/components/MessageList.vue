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
                <!-- md文档流渲染 -->
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
              <!-- 给出回复,streaming -->
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