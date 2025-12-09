import type { Reactive } from 'vue';
import type { IConfig } from '../../common/types';
import { CONFIG_KEYS } from '../../common/constants';

import { setLanguage, getLanguage } from '../i18n';

// 响应式配置
const config: Reactive<IConfig> = reactive({
  [CONFIG_KEYS.THEME_MODE]: 'system',
  [CONFIG_KEYS.PRIMARY_COLOR]: '#BB5BE7',
  [CONFIG_KEYS.LANGUAGE]: 'zh',
  [CONFIG_KEYS.FONT_SIZE]: 14,
  [CONFIG_KEYS.MINIMIZE_TO_TRAY]: false,
  [CONFIG_KEYS.PROVIDER]: '',
  [CONFIG_KEYS.DEFAULT_MODEL]: null,
});

const configKeys = [
  CONFIG_KEYS.THEME_MODE,
  CONFIG_KEYS.PRIMARY_COLOR,
  CONFIG_KEYS.LANGUAGE,
  CONFIG_KEYS.FONT_SIZE,
  CONFIG_KEYS.MINIMIZE_TO_TRAY,
  CONFIG_KEYS.PROVIDER,
  CONFIG_KEYS.DEFAULT_MODEL
];

const setReactiveConf = (key: CONFIG_KEYS, value: IConfig[typeof key]) => config[key] = value as never;

// 初始化配置
configKeys.forEach(key => window.api.getConfig(key).then(val => setReactiveConf(key, val)));


// 响应式，操作配置文件
// 批量操作配置项，不需要单个配置项单个更新
export function useConfig() {
  const removeListener = window.api.onConfigChange((_config: IConfig) => {
    // 语言变化、config变化，更新响应式config
    configKeys.forEach(key => {
      if (key === CONFIG_KEYS.LANGUAGE) {
        const lang = getLanguage();
        (lang !== config[key]) && setLanguage(config[key])
      }
      if (_config[key] === config[key]) return;
      setReactiveConf(key, _config[key]);
    });
  });

  const onReactiveChange = () => {
    configKeys.forEach(async (key) => {
      if (config[key] === await window.api.getConfig(key)) return;
      window.api.setConfig(key, config[key]);
    })
  }

//   监听配置变化，非响应式则无法监听到变化
  watch(() => config, () => onReactiveChange(), { deep: true })

//   组件销毁时移除监听
  onUnmounted(() => removeListener());

  return config;
}

export default useConfig;