<script setup lang="ts">
import type { SelectValue } from '../types';
import { Icon as IconifyIcon } from '@iconify/vue';
import { NButton, NIcon } from 'naive-ui';
import { listenShortcut } from '../utils/shortcut';
import { SHORTCUT_KEYS } from '../../common/constants';

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


// enter快捷键操作
const removeShortcutListener = listenShortcut(SHORTCUT_KEYS.SEND_MESSAGE, () => {
  if(props.status === 'streaming') return;
  if(isBtnDisabled.value) return;
  if(!focused.value) return;

  // 条件筛选完毕，再发送
  handleSend()
});

watch(() => selectedProvider.value, (val) => emits('select', val));

onUnmounted(() => removeShortcutListener())

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