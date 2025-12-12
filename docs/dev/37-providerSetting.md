# 模型配置
这一步是完成 setting 的模型配置，主要是模型的转译和默认模型的设置。

## 更新 providers
在 store 中，定义 providers 的合并并且更新方法，其中要经过两次转译：
 - 一次是 `openAISetting` 的内容的 base64 加密；
 - 一次是 `providers` 整体内容的 string 转译；
```ts
// common/utils.ts

// 深度合并
export function deepMerge<T extends Record<string, any>>(target: T, source: T): T {
  // 处理 null 或 undefined 的情况
  if (target === null || target === undefined) {
    return source;
  }

  if (source === null || source === undefined) {
    return target;
  }

  // 如果 target 和 source 都是数组，合并它们
  if (Array.isArray(target) && Array.isArray(source)) {
    return [...target, ...source] as unknown as T;
  }

  // 如果 target 和 source 都是对象，递归合并
  if (typeof target === 'object' && typeof source === 'object') {
    const merged = { ...target } as T;

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = (target as any)[key];

        if (Object.prototype.hasOwnProperty.call(target, key) &&
          typeof sourceValue === 'object' && sourceValue !== null &&
          typeof targetValue === 'object' && targetValue !== null &&
          !Array.isArray(sourceValue) && !Array.isArray(targetValue)) {
          // 如果目标对象中已有该属性，且两者都是非数组对象，递归合并
          (merged as any)[key] = deepMerge(targetValue, sourceValue);
        } else {
          // 其他情况，直接替换/添加
          (merged as any)[key] = sourceValue;
        }
      }
    }

    return merged;
  }

  // 其他情况（基本类型），直接返回 source
  return source;
}



// renderer/store/providers.ts

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
```

## 模型配置组件
在更新 apikey 和 baseURL 的方法中，都做了字符串转译，并存入数据库，且做 base64 加密后存入本地 json 文件；  
最后在 setting 的 index 组件中引入：
```vue
<!-- renderer/views/setting/providers.vue -->

<script setup lang="ts">

const providersStore = useProvidersStore();
const config = useConfig();

// 默认模型
const defaultModel = computed({
  get() {
    const vals: string[] = []
    providersStore.allProviders.forEach(provider => {
      if (!provider.visible) return;
      provider.models.forEach(model => {
        vals.push(`${provider.id}:${model}`)
      })
    })

    // 比如config的模型已被删除 / 隐藏
    if (!vals.includes(config[CONFIG_KEYS.DEFAULT_MODEL] ?? '')) return null

    return config[CONFIG_KEYS.DEFAULT_MODEL] || null;
  },
  set(val) {
    config[CONFIG_KEYS.DEFAULT_MODEL] = val;
  }
});

// 大模型select选项
const providerOptions = computed(() => providersStore.allProviders.map(item => ({
  label: item.title || item.name,
  type: 'group',
  key: item.id,
  children: item.models.map(model => ({
    label: model,
    value: `${item.id}:${model}`,
    disabled: !item.visible,
  }))
})));

// 更新apikey
function handleApiKeyUpdate(id: number, apiKey: string) {
  const baseURL = providersStore.allProviders.find(item => item.id === id)?.openAISetting?.baseURL ?? '';
  const update: Partial<Provider> = { openAISetting: stringifyOpenAISetting({ baseURL, apiKey }) };
    // 缺一不可
  if (!baseURL || !apiKey) update.visible = false;
  providersStore.updateProvider(id, { ...update });
}


// 更新baseURL
function handleBaseURLUpdate(id: number, baseURL: string) {
  const apiKey = providersStore.allProviders.find(item => item.id === id)?.openAISetting?.apiKey ?? '';
  const update: Partial<Provider> = { openAISetting: stringifyOpenAISetting({ baseURL, apiKey }) };
  if (!baseURL || !apiKey) update.visible = false;
  providersStore.updateProvider(id, { ...update });
}

onMounted(() => providersStore.initialize());
</script>

<template>
  <div class="flex items-center py-4">
    <div class="w-[100px]">
      {{ $t('settings.providers.defaultModel') }}：
    </div>
    <n-select v-model:value="defaultModel" :options="providerOptions" clearable />
  </div>
  <n-divider />
  <n-collapse>
    <n-collapse-item v-for="(provider, index) in providersStore.allProviders" :key="provider.name"
      :title="provider.title ?? provider.name">
      <template #header-extra>
        <n-switch :value="providersStore.allProviders[index].visible"
          :disabled="!providersStore.allProviders[index].openAISetting.apiKey || !providersStore.allProviders[index].openAISetting.baseURL"
          @update:value="(v) => providersStore.updateProvider(provider.id, { visible: v })" @click.stop />
      </template>
      <n-input-group class="my-2">
        <n-input-group-label>{{ $t('settings.providers.apiKey') }}</n-input-group-label>
        <n-input type="password" :value="providersStore.allProviders[index].openAISetting?.apiKey ?? ''"
          @update:value="(v) => handleApiKeyUpdate(provider.id, v)" />
      </n-input-group>
      <n-input-group class="my-2">
        <n-input-group-label>{{ $t('settings.providers.apiUrl') }}</n-input-group-label>
        <n-input :value="providersStore.allProviders[index].openAISetting?.baseURL ?? ''"
          @update:value="(v) => handleBaseURLUpdate(provider.id, v)" />
      </n-input-group>
      <n-dynamic-tags :value="providersStore.allProviders[index].models ?? []"
        @update:value="(v: any) => providersStore.updateProvider(provider.id, { models: v })" />
    </n-collapse-item>
  </n-collapse>
</template>
```

## todo 处理
 - 比如大模型调用接口里，对于被禁用的大模型，直接抛出错误，这里就不展示了；
 - 还有对话跳转到首页后，`providerSelect` 显示默认大模型；
```ts
// 默认大模型的计算逻辑
const defaultModel = computed(() => {
  const vals: string[] = [];
  providersStore.allProviders.forEach(provider => {
    if (!provider.visible) return;
    provider.models.forEach(model => {
      vals.push(`${provider.id}:${model}`)
    })
  })

//   此处避免config的模型已被删除 / 隐藏
  if (!vals.includes(config[CONFIG_KEYS.DEFAULT_MODEL] ?? '')) return null
  return config[CONFIG_KEYS.DEFAULT_MODEL] || null;
})
```