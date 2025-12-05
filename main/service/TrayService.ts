import { Tray, Menu, ipcMain, app, nativeImage } from 'electron';
import { createTranslator, createLogo } from '../utils';
import { CONFIG_KEYS, IPC_EVENTS, WINDOW_NAMES, MAIN_WIN_SIZE } from '../../common/constants';

import logManager from './LogService';
// TODO: shortcutManager
import windowManager from './WindowService';
import configManager from './ConfigService';

let t: ReturnType<typeof createTranslator> = createTranslator();

class TrayService {
  private static _instance: TrayService;
  private _tray: Tray | null = null;
  private _removeLanguageListener?: () => void;

  private _setupLanguageChangeListener() {
    // 监听语言变化
    this._removeLanguageListener = configManager.onConfigChange((config) => {
      if (!config[CONFIG_KEYS.LANGUAGE]) return;

      // 切换语言后，重新创建翻译器
      t = createTranslator();


      if (this._tray) {
        this._updateTray();
      }
    })
  }

//   创建 更新 托盘
  private _updateTray() {
    if (!this._tray) {
      this._tray = new Tray(nativeImage.createFromPath(createLogo()));
    }

    // 显示窗口
    const showWindow = () => {
      const mainWindow = windowManager.get(WINDOW_NAMES.MAIN);

    //   若窗口正在显示，且不被focus时，仅focus即可
      if (mainWindow && !mainWindow?.isDestroyed() && mainWindow?.isVisible() && !mainWindow?.isFocused()) {
        return mainWindow.focus();
      }
      if (mainWindow?.isMinimized()) {
        return mainWindow?.restore();
      }

    //   若窗口正在显示，且focus，不做操作（找茬呢）
      if (mainWindow?.isVisible() && mainWindow?.isFocused()) return;

      windowManager.create(WINDOW_NAMES.MAIN, MAIN_WIN_SIZE);
    }

    this._tray.setToolTip(t('tray.tooltip') ?? 'Cecilia Application');

    // TODO: 依赖快捷键Service 

    // 托盘菜单
    this._tray.setContextMenu(Menu.buildFromTemplate([
      { label: t('tray.showWindow'), accelerator: 'CmdOrCtrl+N', click: showWindow },
      { type: 'separator' },
      { label: t('settings.title'), click: () => ipcMain.emit(`${IPC_EVENTS.OPEN_WINDOW}:${WINDOW_NAMES.SETTING}`) },
      { role: 'quit', label: t('tray.exit') }
    ]));

    // 取消所有click监听，再重新绑定
    // _updateTray可能会被多次调用（切换语言时），因此需要重新绑定监听
    this._tray.removeAllListeners('click');
    this._tray.on('click', showWindow);
  }

  private constructor() {
    this._setupLanguageChangeListener();
    logManager.info('TrayService initialized successfully.');
  }

  public static getInstance() {
    if (!this._instance) {
      this._instance = new TrayService();
    }
    return this._instance;
  }

//   初始化create
  public create() {
    if (this._tray) return;
    this._updateTray();
    app.on('quit', () => {
      this.destroy();
      //TODO: 移除快捷键
    })
  }
  
  public destroy() {
    this._tray?.destroy();
    this._tray = null;
    //TODO: 移除快捷键
    if (this._removeLanguageListener) {
      this._removeLanguageListener();
      this._removeLanguageListener = void 0;
    }
  }
}

export const trayManager = TrayService.getInstance();
export default trayManager;
