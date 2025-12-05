# 设置窗口
setting 初始化搭建。

## app 注册挂载
首先在 `html/setting.html` 修改主入口文件路径 `src` 为 renderer/views/setting/index；  
然后在 setting 入口文件注册挂载 app，引入 setting 组件。
```ts
// renderer/views/setting/index.ts

createApp(Setting)
  .use(i18n)
  .use(createPinia())   // 和dialog的唯一区别，需要调用本地数据
  .use(errorHandler)
  .component('TitleBar', TitleBar)
  .component('DragRegion', DragRegion)
  .mount('#app')
```
```vue
<!-- renderer/views/setting/Index.vue -->

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui';

const { t } = useI18n();

function onWindowClose(){

}
</script>

<template>
  <n-config-provider class="bg-main text-tx-primary h-screen flex flex-col">
    <n-message-provider>
      <title-bar :is-maximizable="false"  @close="onWindowClose">
        <drag-region class="p-2 text-[16px]">{{ t('settings.title') }}</drag-region>
      </title-bar>
      <div class="h-full p-4">
        setting window
      </div>
    </n-message-provider>
  </n-config-provider>
</template>
```

## 渲染流程
在 main/index.ts 中注册 setting 窗口，走 `windowManager.create` 的 `_loadWindowTemplate` 读取 html 渲染；
focus 逻辑也写在 windowService 中；
```ts
// main/index.ts
export function setupWindows() {
  setupMainWindow();
  setupDialogWindow()
  setupSettingWindow()
}

// main/wins/setting.ts
export function setupSettingWindow() {
    // 监听到“打开settingWindow”
  ipcMain.on(`${IPC_EVENTS.OPEN_WINDOW}:${WINDOW_NAMES.SETTING}`, () => {
    const settingWindow = windowManager.get(WINDOW_NAMES.SETTING);

    // 如果setting存在且未被销毁，仅聚焦
    if (settingWindow && !settingWindow.isDestroyed())
      return windowManager.focus(settingWindow);

    windowManager.create(WINDOW_NAMES.SETTING, {
      width: 800,
      height: 600,
      minHeight: 600,
      minWidth: 800,
    });
  })
}


// main/service/WindowService.ts
  public focus(target: BrowserWindow | void | null) {
    if (!target) return;
      const name = this.getName(target);
    if (target?.isMinimized()) {
        target?.restore();
        logManager.debug(`Window ${name} restored and focused`);
      } else {
        logManager.debug(`Window ${name} focused`);
      }

    target?.focus();
  }
```
然后在 `NavBar` 和 `ProviderSelect` 设置 `openSettingWindow` 点击事件，select 在大模型配置为空时可以点击进入设置页面添加模型；
```ts
// renderer/utils/system.ts
export function openWindow(name: WindowNames) {
  window.api.openWindow(name);
}

// 调用
function openSettingWindow() {
  openWindow(WINDOW_NAMES.SETTING);
}

// 需要在 global & preload 设置 openWindow 方法，发送 ipc 事件
// api
openWindow: (name: WindowNames) => ipcRenderer.send(`${IPC_EVENTS.OPEN_WINDOW}:${name}`),
```

## app logo
在 `windowService` 中初始化 logo，然后在 `_createWinInstance` 中设置 logo；
```ts
  private _logo = createLogo();  // 初始化时加载logo

  // 创建窗口实例，有隐藏则返回隐藏实例，否则创建新实例
  // 替换图标
  private _createWinInstance(name: WindowNames, opts?: BrowserWindowConstructorOptions) {
    return this._isHiddenWin(name)
      ? this._winStates[name].instance as BrowserWindow
      : new BrowserWindow({
        ...SHARED_WINDOW_OPTIONS,
        icon: this._logo,
        ...opts,
      });
  }
```