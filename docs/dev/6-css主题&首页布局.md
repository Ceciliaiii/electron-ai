# css 主题 & 首页布局

## 封装 css 变量

```css
/* renderer/styles/theme/dark.css */
/* 跟随系统, 媒体查询 */
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #07C160;
    --bg-color: #1E1E1E;
    --bg-secondary: #2C2C2C;

    --text-primary: #E0E0E0;
    --text-secondary: #A0A0A0;

    --bubble-self: var(--primary-color);
    --bubble-others: #3A3A3A;
    --input-bg: #333333;
    --ripple-color: var(--text-secondary);
    --ripple-opacity: 0.2;
  }
}

```

```css
/* renderer/styles/theme/light.css */
/* 跟随系统 */
@media (prefers-color-scheme: light) {
  :root {
    --primary-color: #07C160;
    --bg-color: #FFFFFF;
    --bg-secondary: #F5F5F5;
    --text-primary: #000000;
    --text-secondary: #7F7F7F;

    --header-bg: var(--primary-color);
    --bubble-self: var(--primary-color);
    --bubble-others: #FFFFFF;
    --input-bg: #F0F0F0;
    --ripple-color: var(--text-secondary);
    --ripple-opacity: 0.2;
  }
}

```
主题css入口文件：
```css
/* theme/index.css */
@import './dark.css';
@import './light.css';

@theme {
  --color-primary: var(--primary-color);
  --color-primary-light: var(--primary-color-light);
  --color-primary-dark: var(--primary-color-dark);
  --color-primary-hover: var(--primary-color-hover);
  --color-primary-active: var(--primary-color-active);
  --color-primary-subtle: var(--primary-color-subtle);
  --color-main: var(--bg-color);
  --color-secondary: var(--bg-secondary);
  --color-input: var(--input-bg);
  --color-bubble-self: var(--bubble-self);
  --color-bubble-others: var(--bubble-others);
  --color-tx-primary: var(--text-primary);
  --color-tx-secondary: var(--text-secondary);
}
```
将 renderer 的css入口文件封装到 styles 中：
```css
@import "./theme/index.css";


/* 不让用户光标选择，与网页区分 */
* {
  user-select: none
}

```
在项目入口文件引入 `vfonts/Lato.css`。

## 主进程服务设置背景颜色
设置 main 区域底色
```ts
const SHARED_WINDOW_OPTIONS = {
//   ...
  darkTheme: nativeTheme.shouldUseDarkColors,     // 暂时写死
  backgroundColor: nativeTheme.shouldUseDarkColors ? '#2C2C2C' : '#FFFFFF',
//  ...
} as BrowserWindowConstructorOptions;
```
然后在 `TitleBar.vue` 修改文字样式，引用封装好的主题样式 `text-tx-secondary`。

### `NavBar` 侧边栏工具区
```vue
<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue';
import DragRegion from './DragRegion.vue';

defineOptions({ name: 'NavBar' });
</script>

<template>
<!-- 除了icon，其他区域可拖拽 -->
  <drag-region>
    <nav
      class="h-[calc(100%-1.4rem)] flex flex-col px-4 py-2 mt-[.7rem] mb-[.7rem] border-r border-r-input text-tx-secondary">
      <ul class="flex-auto">
        <li class="sidebar-item no-drag cursor-pointer hover:text-primary-hover text-tx-primary">
          <iconify-icon icon="material-symbols:chat-outline" width="24" height="24" />
        </li>
      </ul>
      <ul>
        <li class="sidebar-item no-drag cursor-pointer hover:text-primary-subtle">
          <!-- <theme-switcher /> -->
          <iconify-icon icon="material-symbols:dark-mode-outline" width="24" height="24" />
        </li>
        <li class="sidebar-item no-drag cursor-pointer hover:text-primary-subtle">
          <iconify-icon icon="material-symbols:settings-outline" width="24" height="24" />
        </li>
      </ul>

    </nav>
  </drag-region>
</template>

<style scoped>
li {
  margin-top: 10px;
}
</style>
```
然后在 `App.vue` 中分割对话栏和工具栏：
```vue
<template>
  <n-config-provider class="h-full w-[100vw] flex text-tx-primary">
    <aside class="sidebar h-full flex flex-shrink-0 flex-col w-[320px]">
      <div class="flex-auto flex">
        <!-- 工具栏 -->
        <nav-bar />
        <!-- 对话栏 -->
        <div class="flex-auto">
          conversation-list
        </div>
      </div>
    </aside>
    <!-- 对话主区域 -->
    <div class="flex-auto">
      <title-bar>
        <drag-region class="w-full" />
      </title-bar>
      Main
    </div>
  </n-config-provider>
</template>
```