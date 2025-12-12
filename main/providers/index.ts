import configManager from "../service/ConfigService";
import { Provider } from "../../common/types";
import { OpenAIProvider } from "./OpenAIProvider";
import { CONFIG_KEYS } from "../../common/constants";
import { parseOpenAISetting } from "../../common/utils";
import logManager from "../service/LogService";
import { decode } from "js-base64";


// 大模型配置
// const providers = [
//   {
//     id: 1,
//     name: 'bigmodel',
//     title: '智谱AI',
//     models: ['glm-4.5-flash'],
//     openAISetting: {
//       baseURL: 'https://open.bigmodel.cn/api/paas/v4',
//       apiKey: process.env.BIGMODEL_API_KEY || '',
//     },
//     createdAt: new Date().getTime(),
//     updatedAt: new Date().getTime()
//   },
//   {
//     id: 2,
//     name: 'deepseek',
//     title: '深度求索 (DeepSeek)',
//     models: ['deepseek-chat'],
//     openAISetting: {
//       baseURL: 'https://api.deepseek.com/v1',
//       apiKey: process.env.DEEPSEEK_API_KEY || '',
//     },
//     createdAt: new Date().getTime(),
//     updatedAt: new Date().getTime()
//   },
//   {
//     id: 3,
//     name: 'siliconflow',
//     title: '硅基流动',
//     models: ['Qwen/Qwen3-8B', 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'],
//     openAISetting: {
//       baseURL: 'https://api.siliconflow.cn/v1',
//       apiKey: process.env.SILICONFLOW_API_KEY || '',
//     },
//     createdAt: new Date().getTime(),
//     updatedAt: new Date().getTime()
//   },
//   {
//     id: 4,
//     name: 'qianfan',
//     title: '百度千帆',
//     models: ['ernie-speed-128k', 'ernie-4.0-8k', 'ernie-3.5-8k'],
//     openAISetting: {
//       baseURL: 'https://qianfan.baidubce.com/v2',
//       apiKey: process.env.QIANFAN_API_KEY || '',
//     },
//     createdAt: new Date().getTime(),
//     updatedAt: new Date().getTime()
//   },
// ];


interface _Provider extends Omit<Provider, 'openAISetting'> {
   openAISetting?: {
    apiKey: string,  // 做base64转化，比较安全
    baseURL: string,
  };
}

// 解析config.json里的provider配置
const _parseProvider = () => {
  let result: Provider[] = [];
  let isBase64Parsed = false;
  const providerConfig = configManager.get(CONFIG_KEYS.PROVIDER);

  // 返回解析openAISetting后的provider
  const mapCallback = (provider: Provider) => ({
    ...provider,
    openAISetting: typeof provider.openAISetting === 'string'
      ? parseOpenAISetting(provider.openAISetting ?? '')
      : provider.openAISetting,
  })

  try {
    result = JSON.parse(decode(providerConfig)) as Provider[];
    isBase64Parsed = true;
  } catch (error) {
    logManager.error(`parse base64 provider failed: ${error}`);
  }

  if (!isBase64Parsed) try {
    result = JSON.parse(providerConfig) as Provider[]
  } catch (error) {
    logManager.error(`parse provider failed: ${error}`);
  }

  // 若解析不到provider
  if (!result.length) return;

  return result.map(mapCallback) as _Provider[]
}


// 获取解析后的provider
const getProviderConfig = () => {
  try {
    return _parseProvider();
  } catch (error) {
    logManager.error(`get provider config failed: ${error}`);
    return null;
  }
}


// 大模型调用入口
export function createProvider(name: string) {
  // 获取config.json里的provider配置
  const providers = getProviderConfig();

  if (!providers) {
    throw new Error('provider config not found');
  }

  for (const provider of providers) {
    if (provider.name === name) {
      if (!provider.openAISetting?.apiKey || !provider.openAISetting?.baseURL) {
        throw new Error('apiKey or baseURL not found');
      }
      
      if(!provider.visible) {
        throw new Error(`provider ${provider.name} is disabled`);
      }

      return new OpenAIProvider(provider.openAISetting.apiKey, provider.openAISetting.baseURL);
    }
  }
}