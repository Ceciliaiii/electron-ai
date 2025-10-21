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