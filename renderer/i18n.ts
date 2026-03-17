import { CONFIG_KEYS } from '../common/constants';
import { createI18n, I18n, type I18nOptions } from 'vue-i18n';
import { logger } from './utils/logger';

const languages = ['zh', 'en'] as const;
type LanguageType = (typeof languages)[number];

async function createI18nInstance() {
  const options: I18nOptions = {
    legacy: false,
    locale: 'zh',
    fallbackLocale: 'zh',
    messages: {
      zh: await import('../locales/zh.json').then(m => m.default),
      en: await import('../locales/en.json').then(m => m.default),
    }
  }

  const i18n = createI18n(options);
  await hdlConfigManager(i18n);

  return i18n
}

// i18n同步config配置
async function hdlConfigManager(i18n: I18n) {
  try {
    const saveLang: LanguageType = await window.api.getConfig(CONFIG_KEYS.LANGUAGE)
    saveLang && languages.includes(saveLang) && setLanguage(saveLang, i18n)
  } catch (error) {
    logger.warn('Fail to handle config manager', error)
  }
}


export const i18n = await createI18nInstance();

export async function setLanguage(lang:LanguageType,_i18n?:I18n){
  const __i18n = _i18n ?? i18n;
  if(__i18n.mode === 'legacy'){
    __i18n.global.locale = lang;
    return;
  }
  (__i18n.global.locale as unknown as Ref<LanguageType>).value = lang;
}

export function getLanguage(){
  if(i18n.mode === 'legacy'){
    return i18n.global.locale;
  }
  return (i18n.global.locale as unknown as Ref<LanguageType>).value;
}

export default i18n;
