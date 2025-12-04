import logManager from '../service/LogService';

import en from '../../locales/en.json';
import zh from '../../locales/zh.json';
import configManager from '../service/ConfigService';
import { CONFIG_KEYS } from '../../common/constants';
import path from 'node:path';

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


// 获取logo
let logo: string | void = void 0;
export function createLogo() {
  if (logo != null) {
    return logo;
  }
  // vite.render.config.ts 配置了打包根目录 publicDir: 'public'
  // path 直接从打包后的路径中获取
  logo = path.join(__dirname, 'logo1.ico');
  return logo;
}