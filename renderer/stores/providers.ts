import type { Provider } from '../../common/types';
import { CONFIG_KEYS } from '../../common/constants';
import { dataBase } from '../dataBase';
import { parseOpenAISetting, deepMerge } from '../../common/utils'
import { encode } from 'js-base64';
import { useConfig } from '../hooks/useConfig';


export const useProvidersStore = defineStore('providers', () => {
  // states
  const providers = ref<Provider[]>([]);
  const config = useConfig();

  // getters  解析apikey
  const allProviders = computed(() => providers.value.map(item => ({ ...item, openAISetting: parseOpenAISetting(item.openAISetting ?? '') })));

  // actions
  async function initialize() {
    providers.value = await dataBase.providers.toArray();
  }

  async function updateProvider(id: number, provider: Partial<Provider>) {
    // 引用类型不要直接传
    await dataBase.providers.update(id, { ...provider });
    providers.value = providers.value.map(item => item.id === id ? { ...deepMerge(item, provider) as Provider } : item);
    // 更新config（base64编码）
    config[CONFIG_KEYS.PROVIDER] = encode(JSON.stringify(providers.value));
  }

  watch(() => config[CONFIG_KEYS.PROVIDER], () => initialize());

  return {
    // state
    providers,
    // getters
    allProviders,
    // actions
    initialize,
    updateProvider,
  }
})