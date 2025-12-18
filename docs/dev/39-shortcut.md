# 快捷键
通过注册快捷键服务，来注册一些快捷键功能。

## shortcut Service
老样子：
```ts
// main/services/shortcutService.ts

import { globalShortcut, app, type BrowserWindow } from 'electron'
import logManager from './LogService'


export class ShortcutService {
    private static _instance: ShortcutService;
    // 保存快捷键
    private _registeredShortcuts: Map<string, Electron.Accelerator> = new Map();

    private _registerDefaultShortcuts() {
        app.whenReady().then(() => {
            
        })
    }


    private _setupAppEvents() {
        app.on('will-quit', () => {
            this.unregisterAll()
        })

        app.on('browser-window-blur', () => {
            // 可以选择在窗口失去焦点时重新注册快捷键
        })

        app.on('browser-window-focus', () => {
            // 可以选择在窗口获得焦点时重新注册快捷键
        })

    }


    private constructor() {
        this._registerDefaultShortcuts();
        this._setupAppEvents();
        logManager.info('Shortcut service initialized')
    }


    public static getInstance(): ShortcutService {
        if(!this._instance) {
            this._instance = new ShortcutService();
        }

        return this._instance;
    }


    // id: 快捷键唯一标识     cb: 按下快捷键后的操作
    public register(accelerator: Electron.Accelerator, id: string, callback: () => void): boolean {
        try {
            // 先注销已存在的相同id
            if(this._registeredShortcuts.has(id)) {
                this.unregister(id)
            }

            const res = globalShortcut.register(accelerator, callback)

            if(res) {
                this._registeredShortcuts.set(id, accelerator)
                logManager.info(`Shortcut ${id} registered with accelerator ${accelerator}`)
            } 
            else {
                logManager.error(`Failed to register shortcut ${id} with accelerator ${accelerator}`)
            }

            return res;

        } catch (error) {
            logManager.error(`Failed to register shortcut ${id}: ${error}`)
            return false;
        }
    }



    public unregister(id: string): boolean {
        try {
            // 获取要注销的快捷键
            const accelerator = this._registeredShortcuts.get(id)

            if(accelerator) {
                globalShortcut.unregister(accelerator)
                this._registeredShortcuts.delete(id)
                logManager.info(`Shortcut ${id} unregistered with accelerator ${accelerator}`)
                return true
            }

            return false

        } catch (error) {
            logManager.error(`Failed to unregister shortcut ${id}: ${error}`)
            return false;
        
        }
    }



    public unregisterAll(): void {
        try {
            globalShortcut.unregisterAll()
            this._registeredShortcuts.clear()
            logManager.info('All shortcuts unregistered')
        } catch (error) {
            logManager.error(`Failed to unregister all shortcuts: ${error}`)
        }
    }


    // 检查
    public isRegistered(accelerator: Electron.Accelerator): boolean {
        try {
            return globalShortcut.isRegistered(accelerator)
        } catch (error) {
            logManager.error(`Failed to check shortcut ${accelerator}: ${error}`)
            return false;
        }
    }


    // 获取全部已保存的快捷键
    public getRegisteredShortcuts(): Map<string, Electron.Accelerator> {

        // 新开一个map，防止污染源数据
        return new Map(this._registeredShortcuts)
    }

    public registerForWindow(
        window: BrowserWindow,
        callback: (input: Electron.Input) => boolean | void,
    ) {
        window.webContents.on('before-input-event', (event, input) => {
            if(!window.isFocused()) return;

            // 只需要筛选“按下”的状态即可，回调成功则屏蔽浏览器默认行为
            if((input.type === 'keyDown' && callback(input)) === true) event.preventDefault()
        })
    }
}


export const shortcutManager = ShortcutService.getInstance();


export default shortcutManager
```

## 托盘打开窗口
注册打开窗口快捷键 `CmdOrCtrl + N`，打开后销毁快捷键：
```ts
// service/TrayService.ts

    // 注册快捷键
    shortcutManager.register('CmdorCtrl+N', 'tray-show-window', showWindow)
```

## 发送消息 换行
ctrl+enter 发送消息，enter 换行，在创建主窗口的时候就注册；  
如果用纯 enter 发送消息，生产环境会有 bug：
```ts
// main/wins/main.ts

const registerShortcuts = (window: BrowserWindow) => {
  shortcutManager.registerForWindow(window, (input) => {
    if (input.code === 'Enter' && input.modifiers.includes('control'))
      window?.webContents.send(IPC_EVENTS.SHORTCUT_CALLED + SHORTCUT_KEYS.SEND_MESSAGE);
  });
}
```
在 global.d 和 preload 定义快捷键回调方法：
```ts
// preload.ts

// windowApi
 onShortcutCalled: (key: string, cb: () => void) => {
    ipcRenderer.on(IPC_EVENTS.SHORTCUT_CALLED + key, (_event) => cb());
    return () => ipcRenderer.removeListener(IPC_EVENTS.SHORTCUT_CALLED + key, cb);
  },
```
api 方法不直接用于组件，封装为 utils：
```ts
// renderer/utils/shortcut.ts

export function listenShortcut(shortcut: string, callback: () => void) {
    return window?.api?.onShortcutCalled(shortcut, callback)
}
```
`MessageInput` 组件中：
```ts
// enter快捷键操作
const removeShortcutListener = listenShortcut(SHORTCUT_KEYS.SEND_MESSAGE, () => {
  if(props.status === 'streaming') return;
  if(isBtnDisabled.value) return;
  if(!focused.value) return;

  // 条件筛选完毕，再发送
  handleSend()
});


onUnmounted(() => removeShortcutListener())
```

## 关闭窗口
alt+f4 和 ctrl+w 关闭窗口，再次打开时不会重新加载，同时需要屏蔽默认行为，否则无法执行 main.ts 中的 `onWindowCreate`，从而丢失功能：
```ts
// service/WindowService.ts

 private _handleWindowShortcuts(win: BrowserWindow) {

    // 打包状态
    const isPackaged = app.isPackaged;

    const proxyCloseEvent = () => {
      // ctrl+w alt+f4 都要执行close
      this.close(win, this._isReallyClose(this.getName(win)));
      // 屏蔽默认行为, 否则再次打开，会丢失功能
      return true
    }
    shortcutManager.registerForWindow(win, (input) => {
      if((input.key === 'F4' && input.alt) && (process.platform !== 'darwin'))
        return proxyCloseEvent();
      if(input.code === 'keyW' && input.modifiers.includes('Control'))
        return proxyCloseEvent();
      if(!isPackaged) return

      // 禁用开发者工具
      if(input.type === 'keyDown' && 
        input.code === 'keyI' && 
        input.modifiers.includes('Control') && 
        input.modifiers.includes('Shift')) 
        return true;
    })
  }
```