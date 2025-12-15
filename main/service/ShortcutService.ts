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