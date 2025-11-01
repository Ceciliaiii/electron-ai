# Dialog 窗口

## preload 方法
dialog 窗口的创建与交互：
```ts
// preload.ts

const api: WindowApi = {
//   ...

  // ipc通信render进程就绪
  viewIsReady: () => ipcRenderer.send(IPC_EVENTS.RENDERER_IS_READY),

  // render进程创建dialog窗口，处理dialog按钮交互（confirm | cancel）
  createDialog: (params: CreateDialogProps) => new Promise(async (resolve) => {
    // 向主进程发送请求创建dialog，并传递params，接收resolve回调
    const feedback = await ipcRenderer.invoke(`${IPC_EVENTS.OPEN_WINDOW}:${WINDOW_NAMES.DIALOG}`, {
      title: params.title ?? '',
      content: params.content,
      confirmText: params.confirmText,
      cancelText: params.cancelText,
    });

    // 等待主进程返回的resolve回调（交互结果），并执行对应回调
    if (feedback === 'confirm') params?.onConfirm?.();
    if (feedback === 'cancel') params?.onCancel?.();

    // 将结果通过resolve返回给调用方useDialog()
    resolve(feedback);
  }),

  // 向主进程发送交互（confirm | cancel，dialog标识）
  _dialogFeedback: (val: 'cancel' | 'confirm', winId: number) => ipcRenderer.send(WINDOW_NAMES.DIALOG + val, winId),
  // 向主进程请求params
  _dialogGetParams: () => ipcRenderer.invoke(WINDOW_NAMES.DIALOG + 'get-params') as Promise<CreateDialogProps>,

// ...
}
```

### 通知主进程：渲染进程就绪
否则主窗口一直处于 loading 状态：
```ts
// renderer/hooks/ussWinManager.ts

onMounted(async () => {
    await nextTick();
    window.api.viewIsReady()  // 通知主进程渲染进程就绪
    isMaximized.value = await window.api.isWindowMaximized();
    window.api.onWindowMaximized((_isMaximized: boolean) => isMaximized.value = _isMaximized);
  })
```

## 创建 Dialog 应用实例
由于是多窗口应用，不同于单页面应用（SPA），前端资源是分开加载的，相当于多开了一个浏览器标签页；因此需要在渲染进程中单独创建窗口实例，完全是仿原生应用体验。

### 创建实例
先写主页面渲染文件：
```html
<!-- html/dialog.html -->
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="script-src 'self';">
</head>

<body>
  <div id="app"></div>
  <script type="module" src="../renderer/views/dialog/index.ts"></script>
</body>

</html>
```
然后挂载 App 实例：
```ts
// renderer/views/dialog/index.ts

import '../../styles/index.css'
import 'vfonts/Lato.css'

import errorHandler from '../../utils/errorHandler'

import i18n from '../../i18n'
import TitleBar from '../../components/TitleBar.vue'
import DragRegion from '../../components/DragRegion.vue'
import Dialog from './Index.vue'

createApp(Dialog)
    .use(i18n)
    .use(errorHandler)
    .component('TitleBar', TitleBar)
    .component('DragRegion', DragRegion)
    .mount('#app')
```
调用渲染逻辑作为 html 渲染脚本：
```ts
// main/wins/dialog.ts

import { IPC_EVENTS, WINDOW_NAMES } from '../../common/constants';
import { BrowserWindow, ipcMain } from 'electron';
import { windowManager } from '../service/WindowService';

export function setupDialogWindow() {
  let dialogWindow: BrowserWindow | void;
  let params: CreateDialogProps | void;
  let feedback: string | void

    // 监听render进程调用 _dialogGetParams() 时触发
  ipcMain.handle(WINDOW_NAMES.DIALOG + 'get-params',(e)=>{
    // 检查是否为dialog窗口
    if(BrowserWindow.fromWebContents(e.sender) !== dialogWindow) return

    // 返回参数
    return {
      winId: e.sender.id,
      ...params
    }
  });

//   监听confirm和cancel
  ['confirm','cancel'].forEach(_feedback => {
    ipcMain.on(WINDOW_NAMES.DIALOG + _feedback,(e,winId:number)=> {
      if(e.sender.id !== winId) return
      feedback = _feedback;

    // 无论执行什么  都关闭dialog窗口
      windowManager.close(BrowserWindow.fromWebContents(e.sender));
    });
  });

//   监听处理渲染dialog的请求
  ipcMain.handle(`${IPC_EVENTS.OPEN_WINDOW}:${WINDOW_NAMES.DIALOG}`, (e, _params) => {
    // 缓存参数
    params = _params;

    // 创建窗口
    dialogWindow = windowManager.create(
      WINDOW_NAMES.DIALOG,
      {
        width: 350, height: 200,
        minWidth: 350, minHeight: 200,
        maxWidth: 400, maxHeight: 300,
      },
      { // 指定父窗口
        parent: BrowserWindow.fromWebContents(e.sender) as BrowserWindow,
        resizable: false
      }
    );

    // dialog关闭时，返回feedback（用户操作结果）
    return new Promise<string | void>((resolve) => dialogWindow?.on('closed', () => {
      // resolve传回 preload 里的 createDialog().feedback
      resolve(feedback);
      feedback = void 0;   // 重置缓存的feedback
    }))
  })

}

export default setupDialogWindow
```

## 编写 Dialog 钩子
调用 preload 的方法创建钩子：
```ts
// renderer/hooks/useDialog.ts

export function useDialog() {
  // const isDarkMode = usePreferredDark();

  const createDialog = (opts: CreateDialogProps) => {

    return new Promise<string>((resolve) => {
      window.api.createDialog(opts).then(res => {
        resolve(res);
        // todo : 模态
      });
      // todo : 模态
    })
  }
  return { createDialog }
}

export default useDialog;
```

## 封装 Dialog 组件与调用
```vue
<!-- renderer/views/dialog/Index.vue -->
<script setup lang="ts">
import type { Ref } from 'vue';
import { NConfigProvider } from 'naive-ui';

const { t } = useI18n();

const params: Ref<CreateDialogProps> = ref({
  title: '',
  content: '',
  confirmText: '',
  cancelText: '',
})

// 获取参数
window.api._dialogGetParams().then(res => params.value = res)

// 取消逻辑
function handleCancel() {
  window.api._dialogFeedback('cancel', Number(params.value.winId));
}

// 确认逻辑
function handleConfirm() {
  window.api._dialogFeedback('confirm', Number(params.value.winId));
}
</script>

<template>
  <n-config-provider class="h-screen w-full flex flex-col">
    <title-bar class="h-[30px]" :is-minimizable="false" :is-maximizable="false">
      <drag-region class="p-3 text-sm font-bold text-tx-primary">
        {{ t(params.title ?? '') }}
      </drag-region>
    </title-bar>
    <p class="flex-auto p-5 text-sm text-tx-primary">
      {{ t(params.content ?? '') }}
    </p>

    <div class="h-[40px] flex justify-end items-center gap-2 p-4 mb-[20px]">
      <button
        class="mr-1 px-4 py-1.5 cursor-pointer rounded-md text-sm text-tx-secondary hover:bg-input transition-colors"
        @click="handleCancel">
        {{ t(params.cancelText || 'dialog.cancel') }}
      </button>
      <button
        class="px-4 py-1.5 cursor-pointer rounded-md text-sm text-tx-primary hover:bg-red-200 hover:text-red-300   transition-colors"
        @click="handleConfirm">
        {{ t(params.confirmText || 'dialog.confirm') }}
      </button>
    </div>

  </n-config-provider>
</template>
```
然后，在对话列表 Index 中，用 Dialog 钩子修改 `itemPolicy` 和 `batchPolicy` 的 `delete` 逻辑：
```ts
// conversationList/Index.vue

// 单独操作政策
const conversationItemActionPolicy = new Map([
  [CONVERSATION_ITEM_MENU_IDS.DEL, async (item: Conversation) => {
    const res = await createDialog({
      title: 'main.conversation.dialog.title',
      content: 'main.conversation.dialog.content',
    })
    if (res === 'confirm') {
      conversationsStore.delConversation(item.id);
      // 若删除的id是当前对话的id，则跳转到conversation
      item.id === currentId.value && router.push('/conversation');
    }
  }],
//   ...
])

// 批量操作政策（批量删除、批量置顶）
const batchActionPolicy = new Map([
  [CONVERSATION_ITEM_MENU_IDS.DEL, async () => {
    const res = await createDialog({
      title: 'main.conversation.dialog.title',
      content: 'main.conversation.dialog.content_1',
    })
    if (res !== 'confirm') return

    // 若勾选删除的id包含当前对话id，则跳转到conversation
    if (checkedIds.value.includes(currentId.value)) {
      router.push('/conversation');
    }
    checkedIds.value.forEach(id => conversationsStore.delConversation(id));
    isBatchOperate.value = false;
  }],
//   ...
])
```
如此一来，`handleItemContextMenu` 和 `handleBatchOperate` 两个方法就可以获取到各自的 delete 方法并执行。
```ts
// 批量操作
function handleBatchOperate(opId: CONVERSATION_ITEM_MENU_IDS) {
  const action = batchActionPolicy.get(opId);
  action && action();   // 若取得到操作方法，则执行
}

// 对单个item的右键菜单操作
async function handleItemContextMenu(item: Conversation) {
  const clickItem = await createContextMenu(MENU_IDS.CONVERSATION_ITEM, void 0) as CONVERSATION_ITEM_MENU_IDS;
  const action = conversationItemActionPolicy.get(clickItem);
  action && await action?.(item);   // 若取得到操作方法，则等待前面异步menu任务结束后，再执行
}
```