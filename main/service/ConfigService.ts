import type { ConfigKeys, IConfig } from '../../common/types';
import { app, BrowserWindow, ipcMain } from 'electron';
import { CONFIG_KEYS, IPC_EVENTS } from '../../common/constants';
import { debounce, simpleCloneDeep } from '../../common/utils';
import * as fs from 'fs';
import * as path from 'path';
import logManager from './LogService';

// 默认配置
const DEFAULT_CONFIG: IConfig = {
  [CONFIG_KEYS.THEME_MODE]: 'system',     // 主题模式
  [CONFIG_KEYS.PRIMARY_COLOR]: '#BB5BE7', // 高亮色
  [CONFIG_KEYS.LANGUAGE]: 'zh',           // 语言
  [CONFIG_KEYS.FONT_SIZE]: 14,            // 字体大小
  [CONFIG_KEYS.MINIMIZE_TO_TRAY]: false,  // 关闭时最小化到托盘
  [CONFIG_KEYS.PROVIDER]: '',             // provider配置
  [CONFIG_KEYS.DEFAULT_MODEL]: null,      // 默认大模型
}

export class ConfigService {
  private static _instance: ConfigService;
  private _config: IConfig;
  private _configPath: string;
  private _defaultConfig: IConfig = DEFAULT_CONFIG;

  private _listeners: Array<(config: IConfig) => void> = [];


  private constructor() {
    // 获取配置文件路径
    // C:\Users\86134\AppData\Roaming\{AppName}\config.json
    this._configPath = path.join(app.getPath('userData'), 'config.json');
    // 加载配置
    this._config = this._loadConfig();
    // 设置 IPC 事件
    this._setupIpcEvents();
    logManager.info('ConfigService initialized successfully.')
  }

  //   ipc通信交互
  private _setupIpcEvents() {
    const duration = 200;
    // 防抖避免频繁设置
    const handelUpdate = debounce((val) => this.update(val), duration);

    // render获取单个配置项，main通过get返回对应值
    ipcMain.handle(IPC_EVENTS.GET_CONFIG, (_, key) => this.get(key));
    // render设置单个配置项，main通过set更新并保存
    ipcMain.on(IPC_EVENTS.SET_CONFIG, (_, key, val) => this.set(key, val));
    // render批量更新配置，main通过update更新并保存
    ipcMain.on(IPC_EVENTS.UPDATE_CONFIG, (_, updates) => handelUpdate(updates));
  }

  public static getInstance(): ConfigService {
    if (!this._instance) {
      this._instance = new ConfigService();
    }
    return this._instance;
  }

    //   加载配置文件
  private _loadConfig(): IConfig {
    try {
      if (fs.existsSync(this._configPath)) {
        const configContent = fs.readFileSync(this._configPath, 'utf-8');
        // 用户配置 > 默认配置，会覆盖
        const config = { ...this._defaultConfig, ...JSON.parse(configContent) };
        logManager.info('Config loaded successfully from:', this._configPath);
        return config;
      }
    } catch (error) {
      logManager.error('Failed to load config:', error);
    }
    // 没有配置文件，返回默认配置
    return { ...this._defaultConfig };
  }

    //   存储配置文件，将_config写入配置文件config.json
  private _saveConfig(): void {
    try {
      // 确保目录存在，创建目录文件
      fs.mkdirSync(path.dirname(this._configPath), { recursive: true });
      // 写入
      fs.writeFileSync(this._configPath, JSON.stringify(this._config, null, 2), 'utf-8');
      // 通知监听者
      this._notifyListeners();

      logManager.info('Config saved successfully to:', this._configPath);
    } catch (error) {
      logManager.error('Failed to save config:', error);
    }
  }

  private _notifyListeners(): void {
    // 向所有窗口发送更新配置事件，同步新配置
    BrowserWindow.getAllWindows().forEach(win => win.webContents.send(IPC_EVENTS.UPDATE_CONFIG, this._config));
    // 执行监听回调，main进程其他服务感知配置变化
    this._listeners.forEach(listener => listener({ ...this._config }));
  }

  //   获取配置项（传值操作都要深拷贝数据，避免污染源数据）
  public getConfig(): IConfig {
    return simpleCloneDeep(this._config);
  }

  //   读配置，用户可通过<T>指定返回值类型
  public get<T = any>(key: ConfigKeys): T {
    return this._config[key] as T
  }

  //   写配置，autoSave = false支持手动关闭自动保存，默认开启自动保存
  public set(key: ConfigKeys, value: unknown, autoSave: boolean = true): void {
    if (!(key in this._config)) return;
    const oldValue = this._config[key];
    if (oldValue === value) return;
    this._config[key] = value as never;
    logManager.debug(`Config set: ${key} = ${value}`);
    autoSave && this._saveConfig();  // autoSave = true时自动保存
  }

  //   批量合并配置，覆盖式更新
  public update(updates: Partial<IConfig>, autoSave: boolean = true): void {
    this._config = { ...this._config, ...updates };
    autoSave && this._saveConfig();
  }

    //   重置为默认值
  public resetToDefault(): void {
    this._config = { ...this._defaultConfig };
    logManager.info('Config reset to default.');
    this._saveConfig();
  }

  //   注册监听器，接收一个listener回调函数，配置更新后就执行回调
  //    返回一个取消监听的函数，调用该函数则取消监听
  public onConfigChange(listener: ((config: IConfig) => void)): () => void {
    // 注册监听器
    this._listeners.push(listener);

    // 返回取消监听函数：从_listeners数组中移除刚才注册的监听器
    return () => this._listeners = this._listeners.filter(l => l !== listener);
  }

}

export const configManager = ConfigService.getInstance();
export default configManager;