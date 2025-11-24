<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import markdownItHighlightjs from 'markdown-it-highlightjs';

defineOptions({ name: 'MessageRender' });
const props = defineProps<{
  msgId: number;
  content: string;
  isStreaming: boolean;
}>();

const { t } = useI18n();

const renderId = computed(() => `msg-render-${props.msgId}`);


// 查找最后一个内容元素（递归遍历 嵌套的html结构）
const _findLastElement = (target: HTMLElement): Element | void => {
  const isList = (el: Element) => el.tagName === 'OL' || el.tagName === 'UL'

  if (!target) return;
  // 可能该元素就是最后一个元素
  let lastElement: Element | void = target.lastElementChild ?? target;

  // TODO: PRE(代码块 hljs)

  // 若最后一个元素是列表（ol/ul），查找内部最后一个元素
  if (lastElement && isList(lastElement)) {
    lastElement = _findLastElement(lastElement as HTMLElement);
  }

  // 若最后一个元素是列表项li，检查内部是否有嵌套子列表
  if (lastElement && lastElement.tagName === 'LI') {
    const _uls = lastElement.getElementsByTagName('ul');
    const _ols = lastElement.getElementsByTagName('ol');
    if (_uls.length) lastElement = _findLastElement(_uls[0]);
    if (_ols.length) lastElement = _findLastElement(_ols[0]);
  }

  return lastElement;
}

function addCursor(target: HTMLElement) {
  const lastEl = _findLastElement(target);
  if (!lastEl) return;
  // 添加光标类样式
  lastEl.classList.add('_cursor');
}

function removeCursor() {
  const target = document.getElementById(renderId.value);
  if (!target) return;
  const lastEl = _findLastElement(target);
  lastEl?.classList.remove('_cursor');
}

async function handleCursor() {
  if (!props.isStreaming) return;
  await nextTick();   // 等待md解析和dom更新
  // 最新渲染的dom容器
  const target = document.getElementById(renderId.value);
  // 在内容末尾添加光标
  target && addCursor(target);
}

// 每次内容更新，光标都紧跟在最新内容后面
watch(() => props.content, () => handleCursor());

// 流式渲染结束后，移除光标
watch(() => props.isStreaming, async (newVal, oldVal) => {
  if (!newVal && oldVal) {
    await nextTick();  // 等待dom更新
    removeCursor();    // 移除光标
  }
})
</script>
<template>
  <template v-if="content?.trim()?.length">
    <!-- prose 类，屏蔽tailwindcss的reset，prose-pre去除代码块默认的padding框 -->
    <VueMarkdown class='prose dark:prose-invert prose-slate prose-pre:p-0 prose-headings:pt-3 text-inherit' 
    :plugins="[markdownItHighlightjs]"
    :id="renderId" :source="content" 
    />
  </template>
  <span v-else class="_cursor">{{ t('main.message.rendering') }}</span>
</template>

<!-- 继承字体字号 -->
<style scoped>
.prose {
  font-size: inherit
}
</style>

<style>
._cursor::after {
  content: '';
  display: inline-block;
  width: 0.5em;
  height: 1.2em;
  transform: translateX(0.6em);
  background-color: currentColor;
  /* 光标闪烁 1s */
  animation: cursor-blink 1s infinite;  
  margin-left: 2px;
  vertical-align: text-bottom;
  line-height: 1;
}

@keyframes cursor-blink {

  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}
</style>