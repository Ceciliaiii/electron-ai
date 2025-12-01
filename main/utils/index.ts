import logManager from '../service/LogService';

import en from '../../locales/en.json';
import zh from '../../locales/zh.json';
import configManager from 'main/service/ConfigService';
import { CONFIG_KEYS } from '../../common/constants';

type MessageSchema = typeof zh;
const messages: Record<string, MessageSchema> = { en, zh }

export function createTranslator() {
  return (key?: string) => {
    if (!key) return void 0;
    try {
      const keys = key?.split('.'); // 例如 'menu.file' 分割为 ['menu', 'file']
      let result: any = messages[configManager.get(CONFIG_KEYS.LANGUAGE)];
    //   从默认语言（上一次保存）的语言包中，按键路径逐层查找对应的翻译文本
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