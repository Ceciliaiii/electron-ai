# 输入框状态管理 & 大模型 select 同步 & 按钮三状态



## input 状态管理（草稿箱）

在 store 中，用 Map 存储不同对话 id 的 input 草稿，读取用 id 来 get，修改用 set。

```ts
// renderer/stores/messages.ts


// 存储 <conversationId, inputValue>
const messagesInputValue = ref(new Map())

// Getter
// 用id获取input值  切换对话时，computed 实时更新草稿值
const messageInputValueById = computed(() => (conversationId: number) => messagesInputValue.value.get(conversationId) ?? '');


// Setter
 // 修改input草稿值
function setMessageInputValue(conversationId: number, value: string) {
 	messagesInputValue.value.set(conversationId, value);
}
```
在组件中，`:message` 绑定 input 草稿 getter，`@update:message` 更新 input 内容。  
切换对话 id，重置首页 input 内容。
```html
// renderer/views/conversation.vue

 <message-input
     :message="messagesStore.messageInputValueById(conversationId ?? -1)"
	@update:message="messagesStore.setMessageInputValue(conversationId ?? -1, $event)"
     @send="handleSendMessage" />
```
```ts
// 组件逻辑部分

// 再次发送消息的方法
async function handleSendMessage() {
  if(!conversationId.value) return;

  const _conversationId = conversationId.value;
  // 获取当前对话的input内容
  const content = messagesStore.messageInputValueById(_conversationId);
  if (!content?.trim()?.length) return;
 // 发送 input 草稿消息
  messagesStore.sendMessage({
    type: 'question',
    content,
    conversationId: _conversationId,
  })
  // 发送完，清空input
  messagesStore.setMessageInputValue(_conversationId, '');
}
```
监听对话 id 和 `message-input` 模板引用，切换对话时， `msgInputRef` 负责更新 input 内的 selectedModel 也同步更新对应大模型。  
```ts
watch([() => conversationId.value, () => msgInputRef.value], async ([id, msgInput]) => {
  if (!msgInput || !id) {
    // TODO: 默认模型
    return;
  }

  const current = conversationsStore.getConversationById(id);
  if (!current) return;

  // 置为false，避免切换模型时触发更新 updateAt
  canUpdateConversationTime.value = false;
 // 大模型同步
  msgInput.selectedProvider = `${current.providerId}:${current.selectedModel}`;
  await nextTick();
  canUpdateConversationTime.value = true;

  // 切换对话，清空首页input
  // message.value = '';
});
```

## 大模型双向绑定
每个对话都有存储自身的 providerId 和 selectedModel，模板选择与对话强绑定。  
message-input 通过 `v-model:provider` 绑定 `providerId:selectedModel`，暴露 `@select` 事件。
```html
<message-input class="p-2 pt-0" ref="msgInputRef"
         v-model:provider="provider"
   	 @select="handleProviderSelect" @stop="handleStopMessage" />
```
用户主动切换模型时，触发 `handleProviderSelect`， 左侧对话列表的模型 title 同步更新；
```ts
// renderer/views/conversation.vue

// 对话切换模型，左侧自动更新
const canUpdateConversationTime = ref(true);  // 控制 `updateAt` 同步更新
function handleProviderSelect() {
  const current = conversationsStore.getConversationById(conversationId.value as number);
  if (!conversationId.value || !current) return;
  conversationsStore.updateConversation({
    ...current,
    providerId: Number(providerId.value),   // 同步
    selectedModel: selectedModel.value,    // 同步
  }, canUpdateConversationTime.value)
}
```

## 按钮三种状态
计算属性 `messageInputStatus` 返回状态：
 - normal 可发送消息；
 - loading 准备生成内容；
 - streaming 正在生成内容；
```ts
// 按钮状态切换

const isStoping = ref(false);

const messageInputStatus = computed(() => {
 // 手动停止生产时，返回 loading
  if (isStoping.value) return 'loading';

 // 获取当前对话的最后一条message
  const messages = messagesStore.messagesByConversationId(conversationId.value as number);
  const last = messages[messages.length - 1];

  // ai在流式生成，但未返回内容时，按钮显示【加载】
  if (last?.status === 'streaming' && last?.content?.length === 0) return 'loading';
  // ai未开始生成 / 正在返回流式内容时，显示实际状态
  if (last?.status === 'loading' || last?.status === 'streaming') return last?.status;
  // 消息未发送 / ai返回完毕，按钮显示【发送】
  return 'normal';
})
```

### 停止操作
遍历当前对话中所有「加载中 / 流式生成中」的消息 ID，调用 `stopMessage` 停止监听 AI 响应，
获取当前对话的 loading、streaming 状态的 messageId
```ts
// renderer/stores/messages.ts

// 用id获取loading、streaming的message id
  const loadingMsgIdsByConversationId = computed(() => (conversationId: number) => 
    messagesByConversationId.value(conversationId).filter
(message => message.status === 'loading' || message.status === 'streaming').map(message => message.id));


// 手动停止生成
 async function stopMessage(id: number, update: boolean = true) {
   // 停止生成
    const stop = stopMethods.get(id)
    stop && stop?.()

   // 更新消息状态（元信息）
    if(update) {
      const msgContent = messages.value.find(message => message.id === id)?.content || ''
      await updateMessage(id, {
        status: 'success',
        updatedAt: Date.now(),
		// 追加 “已停止生成” 提示文本。
        content: msgContent ? msgContent + i18n.global.t('main.message.stopGeneration') : void 0,
      })
    }
  }
```
组件中，调用 message-input 的 `@stop`：
```ts
async function handleStopMessage() {
  isStoping.value = true;
  const msgIds = messagesStore.loadingMsgIdsByConversationId(conversationId.value as number ?? -1);
  for (const id of msgIds) {
    messagesStore.stopMessage(id);
  }
  isStoping.value = false;
}
```