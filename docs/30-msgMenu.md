# 消息菜单
依旧：主进程注册，渲染进程调用。可以参考对话的 menu 开发步骤，在菜单功能。

## 完成上一节留下的 Pre
在上一节流式渲染组件的 `_findLastElement`，未完成代码块内的光标逻辑判断：
```ts
// renderer/components/MessageRender.vue

// _findLastElement()

  // PRE(代码块 hljs)，让光标显示在代码内容末尾，非pre标签末尾
  if (lastElement && lastElement.tagName === 'PRE')
    lastElement = lastElement.getElementsByClassName('hljs')[0] ?? lastElement
```

## 注册菜单
在 main 进程中，注册消息选项的菜单。
```ts
// main/wins/main.ts

// 注册菜单
const registerMenus = (window: BrowserWindow) => {
  // 对话项和列表的注册...


  // 消息选项上注册菜单
  const messageItemMenuItemClick = (id: string) => {
    logManager.logUserOperation(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.MESSAGE_ITEM}-${id}`)
    window.webContents.send(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${MENU_IDS.MESSAGE_ITEM}`, id);
  }
  
  menuManager.register(MENU_IDS.MESSAGE_ITEM, [
    {
      id: MESSAGE_ITEM_MENU_IDS.COPY,
      label: 'menu.message.copyMessage',
      click: () => messageItemMenuItemClick(MESSAGE_ITEM_MENU_IDS.COPY)
    },
    {
      id: MESSAGE_ITEM_MENU_IDS.SELECT,
      label: 'menu.message.selectMessage',
      click: () => messageItemMenuItemClick(MESSAGE_ITEM_MENU_IDS.SELECT)
    },
    { type: 'separator' },
    {
      id: MESSAGE_ITEM_MENU_IDS.DELETE,
      label: 'menu.message.deleteMessage',
      click: () => messageItemMenuItemClick(MESSAGE_ITEM_MENU_IDS.DELETE)
    },
  ])
}
```

## 调用菜单
在渲染进程中，调用消息选项的菜单：
 - 其中，native-ui 的 `useMessage` 需要在 App 中用 `n-message-provider` 组件包裹，才能进行依赖注入。
 - 且，`n-config-provider` 是全局配置的 provide，`n-message-provider` 依赖其全局配置（暗黑、i18n）。
```ts
// renderer/components/MessageList.vue

const isBatchMode = ref(false);  // 批量模式
const checkedIds = ref<number[]>([]);  // 选中的消息id

// 选中状态
const itemChecked = computed(() => (msgId: number) => checkedIds.value.includes(msgId));

// 需要在app用n-message-provider包裹，依赖 “上下文注入” 机制
// n-message-provider暴露（provide）消息管理器实例给useMessage（inject）
// n-config-provider是全局配置provide，message依赖其全局配置（暗黑、i18n）
const message = useMessage();  


const { createDialog } = useDialog();
const { deleteMessage } = useMessagesStore();
const { formatTimeAgo } = useBatchTimeAgo();
const { t } = useI18n();


// 消息项操作策略
const messageActionPolicy = new Map<MESSAGE_ITEM_MENU_IDS, (msgId: number) => Promise<void>>([
  // 复制消息
  [MESSAGE_ITEM_MENU_IDS.COPY, async (msgId) => {
    const msg = props.messages.find(msg => msg.id === msgId);
    if (!msg) return;
    navigator.clipboard.writeText(msg.content).then(() => {
      message.success(t('main.message.dialog.copySuccess'));
    });
  }],
  // 删除消息
  [MESSAGE_ITEM_MENU_IDS.DELETE, async (msgId) => {
    const res = await createDialog({
      title: 'main.message.dialog.title',
      content: 'main.message.dialog.messageDelete',
    });
    if (res === 'confirm') deleteMessage(msgId);
  }],
  // 选择消息
  [MESSAGE_ITEM_MENU_IDS.SELECT, async (msgId) => {
    checkedIds.value = [...checkedIds.value, msgId];
    isBatchMode.value = true;
  }],
]);


// 右键创建菜单
async function handleContextMenu(msgId: number) {
  const clickItem = await createContextMenu(MENU_IDS.MESSAGE_ITEM);
  const action = messageActionPolicy.get(clickItem as MESSAGE_ITEM_MENU_IDS);
  action && await action(msgId);
}


// 多选框 选中、取消选择
function handleCheckItem(id: number, val: boolean) {
  if (val && !checkedIds.value.includes(id)) {
    // 多选中一个消息
    checkedIds.value = [...checkedIds.value, id];  
  } else {
    // 取消选择
    checkedIds.value = checkedIds.value.filter(_id => _id !== id);
  }
}

// 批量删除
async function handleBatchDelete() {
  const res = await createDialog({
    title: 'main.message.dialog.title',
    content: 'main.message.dialog.batchDelete',
  });
  if (res === 'confirm') {
    checkedIds.value.forEach(id => deleteMessage(id));
    quitBatchMode();
  }
}

// 退出批量模式
function quitBatchMode() {
  isBatchMode.value = false;
  checkedIds.value = [];
}
```
html 部分，绑定多选框操作与右键菜单，也做一个批量操作区域。
```html
 <!-- 多选message checkbox -->
<n-checkbox :checked="itemChecked(message.id)" @update:checked="handleCheckItem(message.id, $event)" />

<!-- 提问时 -->
<div v-if="message.type === 'question'" @contextmenu="handleContextMenu(message.id)">
</div>
<!-- 生成回复时 -->
<div v-else @contextmenu="handleContextMenu(message.id)">

 <!-- 批量操作区域 -->
<div v-show="isBatchMode">
      <n-button @click="handleBatchDelete">{{ t('main.message.batchActions.deleteSelected')
        }}</n-button>
      <n-button @click="quitBatchMode">{{ t('dialog.cancel') }}</n-button>
</div>
```