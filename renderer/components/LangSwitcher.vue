<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue';
import { useConfig } from '../hooks/useConfig';
import NativeTooltip from './NativeTooltip.vue';

defineOptions({ name: 'LangSwitcher' });

const config = useConfig();

const langTooltip = computed(() => {
    if(config.language === 'zh') return '切换语言'
    else if(config.language === 'en') return 'change Language'
    else return ''
})

const langIcon = computed(() => {
    if(config.language === 'zh') return 'icon-park-outline:chinese'
    else if(config.language === 'en') return 'icon-park-outline:english'
    else return ''
})

// 不需要操作language，useConfig会自动检测语言包是否更新
function hdlChangeLanguage() {
    if(config.language === 'zh') {
        setTimeout(() => config.language = 'en', 150)
    }
    else if(config.language === 'en') {
        setTimeout(() => config.language = 'zh', 150)
    }
}
</script>

<template>
  <native-tooltip :content="langTooltip">
    <iconify-icon :icon="langIcon" width="24" height="24" @click="hdlChangeLanguage" />
  </native-tooltip>
</template>