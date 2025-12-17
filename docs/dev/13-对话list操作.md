# 对话 list 操作
需要先安装依赖
```powershell
npm install dexie@4.2.0

npm install js-base64@3.7.8
```

## 数据库 dexie
使用 indexedDB 来存储对话列表：
 - 本地数据库只能自己使用，无法同步给别人；
 - 远程数据库（mySql、MongoDB）可以持久共享，共同开发。
```ts
// renderer/dataBase.ts

import type { Provider, Conversation, Message } from '../common/types';
import Dexie, { type EntityTable } from 'dexie';
import { stringifyOpenAISetting } from '../common/utils';
import { logger } from './utils/logger';

// 供应商初始值
export const providers: Provider[] = [
  {
    id: 1,
    name: 'bigmodel',
    title: '智谱AI',
    models: ['glm-4.5-flash'],
    openAISetting: stringifyOpenAISetting({
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
    }),
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime()
  },
  {
    id: 2,
    name: 'deepseek',
    title: '深度求索 (DeepSeek)',
    models: ['deepseek-chat'],
    openAISetting: stringifyOpenAISetting({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: '',
    }),
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime()
  },
  {
    id: 3,
    name: 'siliconflow',
    title: '硅基流动',
    models: ['Qwen/Qwen3-8B', 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'],
    openAISetting: stringifyOpenAISetting({
      baseURL: 'https://api.siliconflow.cn/v1',
      apiKey: '',
    }),
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime()
  },
  {
    id: 4,
    name: 'qianfan',
    title: '百度千帆',
    models: ['ernie-speed-128k', 'ernie-4.0-8k', 'ernie-3.5-8k'],
    openAISetting: stringifyOpenAISetting({
      baseURL: 'https://qianfan.baidubce.com/v2',
      apiKey: '',
    }),
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime()
  },
];


export const dataBase = new Dexie('ceciliaDB') as Dexie & {
    // 供应商
  providers: EntityTable<Provider, 'id'>;    // 用id做查询
  conversations: EntityTable<Conversation, 'id'>;  // 用id做查询
  messages: EntityTable<Message, 'id'>;   // 用id做查询
};



dataBase.version(1).stores({
  providers: '++id,name',  // 自动生成id
  conversations: '++id,providerId',
  messages: '++id,conversationId',
})

export async function initProviders() {
  const count = await dataBase.providers.count();
  if (count === 0) {
    await dataBase.providers.bulkAdd(providers);
    logger.info('Providers data initialized successfully.');
  }
}
```
然后在工具文件中定义字符串方法和解析方法。
```ts
// common/utils.ts

// 字符串加密, 用于存储openAISetting
export function stringifyOpenAISetting(setting: OpenAISetting) {
  try {
    return encode(JSON.stringify(setting));
  } catch (error) {
    console.error('stringifyOpenAISetting failed:', error);
    return '';
  }
}

// 字符串解密, 用于读取openAISetting
export function parseOpenAISetting(setting: string): OpenAISetting {
  try {
    return JSON.parse(decode(setting));
  } catch (error) {
    console.error('parseOpenAISetting failed:', error);
    return {} as OpenAISetting;
  }
}
```


## 存储对话列表的操作
在 store 中定义对话列表的增删改查，还有置顶、排序操作，并且将排序状态保存。
```ts
// store/conversations.ts

import type { Conversation } from '../../common/types';
// import { conversations as testConversations } from '../testData';
import { dataBase } from '../dataBase';
import { debounce } from '../../common/utils';

// 按什么字段排序
type SortBy = 'updatedAt' | 'createAt' | 'name' | 'model'; // 排序字段类型
// 升序还是降序
type SortOrder = 'asc' | 'desc'; // 排序顺序类型

const SORT_BY_KEY = 'conversation:sortBy';
const SORT_ORDER_KEY = 'conversation:sortOrder';

// 保存排序状态
const saveSortMode = debounce(({ sortBy, sortOrder }: { sortBy: SortBy, sortOrder: SortOrder }) => {
  localStorage.setItem(SORT_BY_KEY, sortBy);
  localStorage.setItem(SORT_ORDER_KEY, sortOrder);
}, 300);

export const useConversationsStore = defineStore('conversations', () => {
  // State
  const conversations = ref<Conversation[]>([]);
  const saveSortBy = localStorage.getItem(SORT_BY_KEY) as SortBy;
  const saveSortOrder = localStorage.getItem(SORT_ORDER_KEY) as SortOrder;

  const sortBy = ref<SortBy>(saveSortBy ?? 'createAt');
  const sortOrder = ref<SortOrder>(saveSortOrder ?? 'desc');

  // Getters
  const allConversations = computed(() => conversations.value);

  const sortMode = computed(() => ({
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  }))

  // Actions
  async function initialize() {
    conversations.value = await dataBase.conversations.toArray();

    // 清除无用的 message
    const ids = conversations.value.map(item => item.id);
    const msgs = await dataBase.messages.toArray();
    const invalidId = msgs.filter(item => !ids.includes(item.conversationId)).map(item => item.id);
    invalidId.length && dataBase.messages.where('id').anyOf(invalidId).delete();
  }

// 更新排序状态
  function setSortMode(_sortBy: SortBy, _sortOrder: SortOrder) {
    if (sortBy.value !== _sortBy)
      sortBy.value = _sortBy;
    if (sortOrder.value !== _sortOrder)
      sortOrder.value = _sortOrder;
  }

// 通过id获取对话
  function getConversationById(id: number) {
    return conversations.value.find(item => item.id === id) as Conversation | void;
  }

// 增
  async function addConversation(conversation: Omit<Conversation, 'id'>) {
    const conversationWithPin = {
      ...conversation,
      pinned: conversation.pinned ?? false,
    }

    const conversationId = await dataBase.conversations.add(conversationWithPin);

    conversations.value.push({
      id: conversationId,
      ...conversationWithPin,
    });

    return conversationId;
  }

// 删
  async function delConversation(id: number) {
    await dataBase.messages.where('conversationId').equals(id).delete();
    await dataBase.conversations.delete(id);
    conversations.value = conversations.value.filter(item => item.id !== id);
  }

// 改
  async function updateConversation(conversation: Conversation, updateTime: boolean = true) {
    const _newConversation = {
      ...conversation,
      updatedAt: updateTime ? Date.now() : conversation.updatedAt,
    }

    await dataBase.conversations.update(conversation.id, _newConversation);
    conversations.value = conversations.value.map(item => item.id === conversation.id ? _newConversation : item);
  }

  // 置顶对话
  async function pinConversation(id: number) {
    const conversation = conversations.value.find(item => item.id === id);

    if (!conversation) return;
    await updateConversation({
      ...conversation,
      pinned: true,
    }, false);
  }

  // 取消置顶
  async function unpinConversation(id: number) {
    const conversation = conversations.value.find(item => item.id === id);

    if (!conversation) return;
    await updateConversation({
      ...conversation,
      pinned: false,
    }, false);
  }

// 时刻监听排序状态变化，保存到本地
  watch([() => sortBy.value, () => sortOrder.value], 
  () => saveSortMode({ sortBy: sortBy.value, sortOrder: sortOrder.value }));

  return {
    // State
    conversations,
    sortBy,
    sortOrder,

    // Getters
    allConversations,
    sortMode,

    // Actions
    initialize,
    setSortMode,
    getConversationById,
    addConversation,
    delConversation,
    updateConversation,
    pinConversation,
    unpinConversation,
  }
})
```


## 更新创建菜单钩子 hooks
初始化菜单项，赋予默认排序状态。
```ts
// conversationList/useContextMenu.ts

const SortByIdMap = new Map([
  ['createAt', CONVERSATION_LIST_MENU_IDS.SORT_BY_CREATE_TIME],
  ['updatedAt', CONVERSATION_LIST_MENU_IDS.SORT_BY_UPDATE_TIME],
  ['name', CONVERSATION_LIST_MENU_IDS.SORT_BY_NAME],
  ['model', CONVERSATION_LIST_MENU_IDS.SORT_BY_MODEL],
])
const SortOrderIdMap = new Map([
  ['desc', CONVERSATION_LIST_MENU_IDS.SORT_DESCENDING],
  ['asc', CONVERSATION_LIST_MENU_IDS.SORT_ASCENDING],
])

export function useContextMenu() {

  const actionPolicy = new Map([
    [CONVERSATION_LIST_MENU_IDS.SORT_BY_CREATE_TIME, () => conversationsStore.setSortMode('createAt', conversationsStore.sortOrder)],
    [CONVERSATION_LIST_MENU_IDS.SORT_BY_UPDATE_TIME, () => conversationsStore.setSortMode('updatedAt', conversationsStore.sortOrder)],
    [CONVERSATION_LIST_MENU_IDS.SORT_BY_NAME, () => conversationsStore.setSortMode('name', conversationsStore.sortOrder)],
    [CONVERSATION_LIST_MENU_IDS.SORT_BY_MODEL, () => conversationsStore.setSortMode('model', conversationsStore.sortOrder)],
    [CONVERSATION_LIST_MENU_IDS.SORT_DESCENDING, () => conversationsStore.setSortMode(conversationsStore.sortBy, 'desc')],
    [CONVERSATION_LIST_MENU_IDS.SORT_ASCENDING, () => conversationsStore.setSortMode(conversationsStore.sortBy, 'asc')],
  ])

  const handle = async () => {
    const { sortBy, sortOrder } = conversationsStore.sortMode;

    const sortById = SortByIdMap.get(sortBy) ?? '';
    const sortOrderId = SortOrderIdMap.get(sortOrder) ?? '';
    const newConversationEnabled = !!route.params.id;

    const item = await createContextMenu(MENU_IDS.CONVERSATION_LIST, void 0, [
      { id: CONVERSATION_LIST_MENU_IDS.NEW_CONVERSATION, enabled: newConversationEnabled },
      { id: sortById, checked: true },
      { id: sortOrderId, checked: true },
    ]);

    const action = actionPolicy.get(item as CONVERSATION_LIST_MENU_IDS);
    action?.();
  }

  return {
    handle
  }
}
```

## 实际应用（只有置顶切换）
先定义了对话项的置顶状态方法。后续再添加删除和重命名。
```ts
// conversationList/index.vue

const conversationItemActionPolicy = new Map([
  [CONVERSATION_ITEM_MENU_IDS.DEL, async() => {
    console.log('删除');
  }],
  [CONVERSATION_ITEM_MENU_IDS.RENAME, async() => {
    console.log('重命名');
  }],
  [CONVERSATION_ITEM_MENU_IDS.PIN, async (item: Conversation) => {
    // 若目前是置顶状态，再次点击则取消置顶
     if (item.pinned) {
      await conversationsStore.unpinConversation(item.id);
      return;
    }
    await conversationsStore.pinConversation(item.id);
  }],
])

```