import logManager from '../service/LogService';

import en from '../../locales/en.json';
import zh from '../../locales/zh.json';

type MessageSchema = typeof zh;
const messages: Record<string, MessageSchema> = { en, zh }

export function createTranslator() {
  return (key?: string) => {
    if (!key) return void 0;
    try {
      const keys = key?.split('.'); // 例如 'menu.file' 分割为 ['menu', 'file']
      let result: any = messages['zh'];
    //   从默认语言（当前为 'zh'）的语言包中，按键路径逐层查找对应的翻译文本
      for (const _key of keys) {
        result = result[_key];
      }
      return result as string;
    } catch (e) {
      logManager.error('failed to translate key:', key, e);
      return key
    }
  }
}