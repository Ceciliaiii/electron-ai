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

  // 支持纯图片发送
  return message.value.length === 0 && !imgPreview.value;
});


const btnTipContent = computed(() => {
  if (props.status === 'loading') return t('main.message.sending');
  if (props.status === 'streaming') return t('main.message.stopGeneration');
  return t('main.message.send');
});

function handleSend() {
  if (props.status === 'streaming') return emits('stop');
  if (isBtnDisabled.value) return;

  // todo: 图片上传逻辑
  if (imgPreview.value) {
    message.value += `\n[图片] ${imgPreview.value} `
  }

  emits('send', message.value);

  imgPreview.value = null;
  selectedImg = null;
  if (fileInput.value) fileInput.value.value = '';
}


// enter快捷键操作
const removeShortcutListener = listenShortcut(SHORTCUT_KEYS.SEND_MESSAGE, () => {
  if (props.status === 'streaming') return;
  if (isBtnDisabled.value) return;
  if (!focused.value) return;

  // 条件筛选完毕，再发送
  handleSend()
});


// 图片上传
const MAX_IMG_SIZE = 2 * 1024 * 1024;
const fileInput = ref<HTMLInputElement | null>();
const imgPreview = ref();
const triggerFileInput = () => {
  // if(disable)
  fileInput.value?.click();
}

let selectedImg: any = null
const hdlImgUpload = (e: Event) => {
  const target = e.target as HTMLInputElement;

  if (target.files && target.files.length > 0) {
    selectedImg = target.files[0];

    if (selectedImg.size > MAX_IMG_SIZE) {
      console.log('too large');

      target.value = ''; // 清空文件选择
      selectedImg = null;
      return;
    }

    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 压缩规则：宽高不超过1000px（可自定义），保持比例
      const maxDim = 1000;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // 转Base64（质量0.8，平衡大小和清晰度）
      const compressedBase64 = canvas.toDataURL(selectedImg.type, 0.8);
      imgPreview.value = compressedBase64;
    };
    img.src = URL.createObjectURL(selectedImg);
    // const reader = new FileReader();
    // reader.onload = (e) => {
    //   imgPreview.value = e.target?.result as string;
    // }
    // reader.readAsDataURL(selectedImg);
  }
}

watch(() => selectedProvider.value, (val) => emits('select', val));

onUnmounted(() => removeShortcutListener())

defineExpose({
  selectedProvider,
})
</script>

<template>
  <div class="message-input h-full flex flex-col overflow-y-auto">
    <div v-if="imgPreview" class="m-2 flex">
      <img :src="imgPreview" alt="Preview" class="h-18 w-18 object-cover rounded">
    </div>
    <div class="m-2 flex">
      <input type="file" accept="image/*" ref="fileInput" class="hidden" @change="hdlImgUpload">
      <native-tooltip content="上传图片">
        <iconify-icon icon="material-symbols:imagesmode-outline-rounded" width="24" height="24"
          @click="triggerFileInput" />
      </native-tooltip>
      </input>
    </div>
    <textarea class="input-area pt-2 px-2 flex-auto w-full text-tx-primary placeholder:text-tx-secondary"
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
  padding-inline: 12px;
  border: none;
  resize: none;

  /* border-top: 1px solid white; */
}

.input-area:focus {
  outline: none;
}
</style>
