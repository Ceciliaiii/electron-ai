# config 服务联动
与主题服务（上一章）、菜单服务、窗口服务、provider 联动，主要以最小化托盘为主。

## 语言联动
首先修改主进程的翻译器的语言包获取，从 `config.json` 中获取本地语言包，也做到了语言持久化。  
然后在 MenuService 中，语言变化了即重置翻译器，重新获取本地语言包。
```ts
// main/services/MenuService.ts

private _setupLanguageChangeListener() {
    // 配置语言变化，重置t函数
    configManager.onConfigChange((config) => {
      if(!config[CONFIG_KEYS.LANGUAGE]) return;

      t = createTranslator();
    })
  }
```


## 最小化托盘联动
窗口服务中，细化了 “最小化托盘” 模式下，主窗口关闭的逻辑：
```ts
// main/services/WindowService.ts

private _isReallyClose(windowName: WindowNames | void) {
    if (windowName === WINDOW_NAMES.MAIN) 
      // 用户没开 “最小化托盘”，主窗口真销毁
      // 用户开了 “最小化托盘”，主窗口隐藏到托盘
      return configManager.get(CONFIG_KEYS.MINIMIZE_TO_TRAY) === false;
    // 无论什么情况，设置窗口关闭时都不真销毁
    if (windowName === WINDOW_NAMES.SETTING) return false;

    return true;
  }


private _checkAndCloseAllWinodws() {
    if (!this._winStates[WINDOW_NAMES.MAIN].instance || 
      this._winStates[WINDOW_NAMES.MAIN].instance?.isDestroyed())
      // 如果主窗口已关闭，则遍历其他窗口一起关闭
      return Object.values(this._winStates).forEach(win => win?.instance?.close());

      // 从配置读取 是否开启了“最小化到托盘”
    const minimizeToTray = configManager.get(CONFIG_KEYS.MINIMIZE_TO_TRAY);
    // 如果没有开启，并且主窗口关闭了，则遍历其他窗口一起关闭
    if (!minimizeToTray && !this.get(WINDOW_NAMES.MAIN)?.isVisible())
      return Object.values(this._winStates).forEach(win => !win?.instance?.isVisible() && win?.instance?.close());
  }
```
同时，在窗口创建的方法中，监听 “最小化到托盘” 的配置，变化则更新配置，且切换状态（todo）：
```ts
// main/wins/main/ts

// setupMainWindow()

windowManager.onWindowCreate(WINDOW_NAMES.MAIN, (mainWindow: any) => {
    let minimizeToTray = configManager.get(CONFIG_KEYS.MINIMIZE_TO_TRAY)

    configManager.onConfigChange((config) => {
      if(minimizeToTray === config[CONFIG_KEYS.MINIMIZE_TO_TRAY]) return;
      minimizeToTray = config[CONFIG_KEYS.MINIMIZE_TO_TRAY];  // 更新
      // todo：配置变化，触发最小化托盘服务初始化，切换最小化状态（开启or关闭）
    })
    registerMenus(mainWindow);
  });
```
最后在主进程的app操作文件中，完善 app 的关闭逻辑：只有在不是 macOS 系统，且关闭了“最小化托盘”，才允许关闭 app。
```ts
// main/index.ts

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !configManager.get(CONFIG_KEYS.MINIMIZE_TO_TRAY)) {
      logManager.info('app closing due to all windows being closed');
      app.quit();
    }
  })
```


## Provider 联动
获取本地配置中经过 base64 转译的 `openAISetting` 配置，更加安全：
```ts
// main/providers/index.ts

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
      // TODO: setting里的大模型展示设置

      return new OpenAIProvider(provider.openAISetting.apiKey, provider.openAISetting.baseURL);
    }
  }
}
```