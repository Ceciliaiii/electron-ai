# Message 初始化
开始开发 main 区域的 message 输入框。

## provider 选择栏
写一个小选择栏组件，可以选择不同的 ai 供应商。
```vue
<!-- renderer/components/ProviderSelect.vue -->

<script setup lang="ts">
import type { SelectValue } from '../types'
import { NSelect, NButton } from 'naive-ui';
import { useProvidersStore } from '../stores/providers';

defineOptions({ name: 'ProviderSelect' });

const { t } = useI18n()

const providersStore = useProvidersStore();
const selectedProvider = defineModel<SelectValue>('modelValue')


const providerOptions = computed(() => providersStore.allProviders.map(item => ({
  label: item.title || item.name,
  type: 'group',
  key: item.id,
  children: item.models.map((model: any) => ({
    label: model,
    value: `${item.id}:${model}`,
  }))
})))

function openSettingWindow() {
  // todo
}
</script>

<template>
  <n-select size="small" v-model:value="selectedProvider" :options="providerOptions"
    :placeholder="t('main.conversation.selectModel')">
    <template #empty>
      <span class="text-tx-primary text-[0.7rem]">
        {{ t('main.conversation.goSettings') }}
        <n-button class="go-settings-btn" size="tiny" @click="openSettingWindow" text>
        {{ t('main.conversation.settings') }}
        </n-button>
        {{ t('main.conversation.addModel') }}
      </span>
    </template>
  </n-select>
</template>

<style scoped>
.go-settings-btn {
  padding: 0 0.5rem;
  font-weight: bold;
}
</style>
```

然后在 store 中定义存储 provider 的逻辑，并在此获取  database的 provider 数据。
```ts
// renderer/stores/providers.ts

import type { Provider } from '../../common/types';
import { dataBase } from '../dataBase';

export const useProvidersStore = defineStore('providers', () => {
  const providers = ref<Provider[]>([]);

  const allProviders = computed(() => providers.value);

  async function initialize() {
    providers.value = await dataBase.providers.toArray();
  }

  return {
    // state
    providers,
    // getters
    allProviders,
    // actions
    initialize,
  }
})
```


## message 输入框
用 textarea 实现一个输入框，并且定义了提交按钮的状态逻辑，最后把各状态下返回的事件（send、select、stop）抛出给 index。
```vue
<!-- renderer/components/MessageInput.vue -->

<script setup lang="ts">
import type { SelectValue } from '../types';
import { Icon as IconifyIcon } from '@iconify/vue';
import { NButton, NIcon } from 'naive-ui';

import ProviderSelect from './ProviderSelect.vue';
import NativeTooltip from './NativeTooltip.vue';

interface Props {
  placeholder?: string;
  status?: 'loading' | 'streaming' | 'normal';
}

interface Emits {
  (e: 'send', message: string): void;
  (e: 'select', provider: SelectValue): void;
  (e: 'stop'): void
}

defineOptions({ name: 'MessageInput' });

const props = withDefaults(defineProps<Props>(), { placeholder: '', status: 'normal' });
const emits = defineEmits<Emits>();

// 光标是否在输入框内，方便后续做shift+enter换行逻辑
const focused = ref(false);
const message = defineModel('message', {
  type: String,
  default: '',
});

const selectedProvider = defineModel<SelectValue>('provider');

const { t } = useI18n();

// 按钮为加载、停止、输入框为空的时候，光标悬停上去显示禁止点击
const isBtnDisabled = computed(() => {
  if (props.status === 'loading') return true;
  if (props.status === 'streaming') return false;

  if (!selectedProvider.value) return true;
  return message.value.length === 0;
});


const btnTipContent = computed(() => {
  if (props.status === 'loading') return t('main.message.sending');
  if (props.status === 'streaming') return t('main.message.stopGeneration');
  return t('main.message.send');
});

function handleSend() {
  if (props.status === 'streaming') return emits('stop');
  if (isBtnDisabled.value) return;

  emits('send', message.value);
}

watch(() => selectedProvider.value, (val) => emits('select', val));

defineExpose({
  selectedProvider,
})
</script>

<template>
  <div class="message-input h-full flex flex-col">
    <textarea class="input-area pt-4 px-2 flex-auto w-full text-tx-primary placeholder:text-tx-secondary"
      :value="message" @input="message = ($event!.target as any).value" @focus="focused = true"
      @blur="focused = false"></textarea>

    <div class="bottom-bar h-[40px] flex justify-between items-center p-2 mb-2">
      <div class="selecter-container w-[200px]">
        <provider-select v-model="selectedProvider" />
      </div>
      <native-tooltip :content="btnTipContent">
        <n-button circle type="primary" :disabled="isBtnDisabled" @click="handleSend">
          <template #icon>
            <n-icon>
              <iconify-icon v-if="status === 'normal'" class="w-4 h-4" icon="material-symbols:arrow-upward" />
              <iconify-icon v-else-if="status === 'streaming'" class="w-4 h-4" icon="material-symbols:pause" />
              <iconify-icon v-else class="w-4 h-4 animate-spin" icon="mdi:loading" />
            </n-icon>
          </template>
        </n-button>
      </native-tooltip>
    </div>
  </div>
</template>

<style scoped>
.input-area {
  padding-inline: 16px;
  border: none;
  resize: none;
}

.input-area:focus {
  outline: none;
}
</style>
```
在 App 中初始化 database 与 providerStore。
```ts
// App.vue

const providersStore = useProvidersStore();

onMounted(async () => {
  await initProviders();
  await providersStore.initialize();
  console.log('App mounted');
});

```


## renderless 组件
定义一个 renderless 插槽组件包裹 Message 输入框，只是一个只有逻辑的抽象组件。将 create 方法传给 index 调用，创建对话项。
```vue
<!-- renderer/components/CreateConversation.vue -->

<script setup lang="ts">
import { useConversationsStore } from '../stores/conversations'


// 抽象插槽组件renderless，只提供创建对话的方法
defineOptions({ name: 'CreateConversation' });
const props = defineProps<{
  providerId: string;
  selectedModel: string;
}>();
const { t } = useI18n();
const conversationsStore = useConversationsStore();

async function createConversation(title?: string) {
  if (!props.providerId || !props.selectedModel) return;
  const conversationId = conversationsStore.addConversation({
    title: title ?? t('main.conversation.newConversation'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    providerId: Number(props.providerId),
    selectedModel: props.selectedModel,
    pinned: false,
  })

//   返回对话独立id给外部index组件调用
  return conversationId;
}
</script>

<template>
    <!-- 将create方法返回给外部index调用，创建对话 -->
  <slot :create="createConversation">
    <!-- renderless -->
  </slot>
</template>
```
在 index 调用 CreateConversation 组件，调用 create 创建对话。
```vue
<!-- renderer/views/index.vue -->

<script setup lang="ts">
import type { SelectValue } from '../types'
import MessageInput from '../components/MessageInput.vue';
import CreateConversation from '../components/CreateConversation.vue';

const message = ref('');
const provider = ref<SelectValue>();

const providerId = computed(() => ((provider.value as string)?.split(':')[0] ?? ''));
const selectedModel = computed(() => ((provider.value as string)?.split(':')[1] ?? ''));

const { t } = useI18n();

// 接收renderless的create，messageInput的send事件与message
async function handleCreateConversation(create: (title: string) => Promise<number | void>, _message: string) {
  const id = await create(_message);
  if (!id) return;
  //  afterCreate
}
</script>
<template>
  <div class="main-view h-full w-full flex flex-col">
    <title-bar>
      <drag-region class="w-full" />
    </title-bar>
    <main class="flex-auto">
      <!-- <router-view /> -->
      <!-- main -->
      <create-conversation :providerId="providerId" :selectedModel="selectedModel" v-slot="{ create }">

        <message-input v-model:message="message" v-model:provider="provider"
          :placeholder="t('main.conversation.placeholder')" @send="handleCreateConversation(create, message)" />
      </create-conversation>
    </main>
  </div>
</template>
```