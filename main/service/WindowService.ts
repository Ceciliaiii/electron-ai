import type { WindowNames } from '../../common/types';

import { IPC_EVENTS, WINDOW_NAMES } from '../../common/constants';
import { BrowserWindow, BrowserWindowConstructorOptions, ipcMain, IpcMainInvokeEvent, WebContentsView, type IpcMainEvent } from 'electron';
import { debounce } from '../../common/utils';

import logManager from './LogService';
import themeManager from './ThemeService';
import path from 'node:path';


interface WindowState {
  instance: BrowserWindow | void;
  isHidden: boolean;
  onCreate: ((window: BrowserWindow) => void)[];
  onClosed: ((window: BrowserWindow) => void)[];
}
interface SizeOptions {
  width: number; // 窗口宽度
  height: number; // 窗口高度
  maxWidth?: number; // 窗口最大宽度，可选
  maxHeight?: number; // 窗口最大高度，可选
  minWidth?: number; // 窗口最小宽度，可选
  minHeight?: number; // 窗口最小高度，可选
}

const SHARED_WINDOW_OPTIONS = {
  titleBarStyle: 'hidden',
  opacity: 0,
  show: false,        // 隐藏窗口，loading结束再展示
  title: 'Diona',
  darkTheme: themeManager.isDark,
  backgroundColor: themeManager.isDark ? '#2C2C2C' : '#FFFFFF',
  webPreferences: {
    nodeIntegration: false, // 禁用 Node.js 集成，提高安全性
    contextIsolation: true, // 启用上下文隔离，防止渲染进程访问主进程 API
    sandbox: true, // 启用沙箱模式，进一步增强安全性
    backgroundThrottling: false,
    preload: path.join(__dirname, 'preload.js'),
  },
} as BrowserWindowConstructorOptions;

class WindowService {
  private static _instance: WindowService;

  private _winStates: Record<WindowNames | string, WindowState> = {
    main: { instance: void 0, isHidden: false, onCreate: [], onClosed: [] },
    setting: { instance: void 0, isHidden: false, onCreate: [], onClosed: [] },
    dialog: { instance: void 0, isHidden: false, onCreate: [], onClosed: [] },
  }

  private constructor() {
    this._setupIpcEvents();
    logManager.info('WindowService initialized successfully.');
  }

  private _isReallyClose(windowName: WindowNames | void) {
    if (windowName === WINDOW_NAMES.MAIN) return true; // todo: 最小化托盘
    if (windowName === WINDOW_NAMES.SETTING) return false;

    return true;
  }

  // 窗口操作主入口（最大化、最小化、关闭）
  private _setupIpcEvents() {
    const handleCloseWindow = (e: IpcMainEvent) => {
      const target = BrowserWindow.fromWebContents(e.sender);
      const winName = this.getName(target);

      this.close(target, this._isReallyClose(winName));
    }
    const handleMinimizeWindow = (e: IpcMainEvent) => {
      BrowserWindow.fromWebContents(e.sender)?.minimize();
    }
    const handleMaximizeWindow = (e: IpcMainEvent) => {
      this.toggleMax(BrowserWindow.fromWebContents(e.sender));
    }
    const handleIsWindowMaximized = (e: IpcMainInvokeEvent) => {
      return BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false;
    }

    ipcMain.on(IPC_EVENTS.CLOSE_WINDOW, handleCloseWindow);
    ipcMain.on(IPC_EVENTS.MINIMIZE_WINDOW, handleMinimizeWindow);
    ipcMain.on(IPC_EVENTS.MAXIMIZE_WINDOW, handleMaximizeWindow);
    ipcMain.handle(IPC_EVENTS.IS_WINDOW_MAXIMIZED, handleIsWindowMaximized);
  }

  // 获取窗口实例
  public static getInstance(): WindowService {
    if (!this._instance) {
      this._instance = new WindowService();
    }
    return this._instance;
  }

  public create(name: WindowNames, size: SizeOptions, moreOpts?: BrowserWindowConstructorOptions) {
    if (this.get(name)) return;    // 若已经有窗口实例，则不再创建
    const isHiddenWin = this._isHiddenWin(name);    // 获取隐藏窗口
    let window = this._createWinInstance(name, moreOpts);

    // 不是隐藏窗口时，加载生命周期和模板
    !isHiddenWin && this
      ._setupWinLifecycle(window, name)
      ._loadWindowTemplate(window, name)


    // 监听窗口准备阶段，若不是隐藏窗口，create时有loading；否则直接显示窗口
    this._listenWinReady({
      win: window,
      isHiddenWin,
      size
    })

    // 若没有隐藏窗口（未打开过），则打开并且记录实例
    if (!isHiddenWin) {
      this._winStates[name].instance = window;
      this._winStates[name].onCreate.forEach(callback => callback(window));
    }
    // 若隐藏（打开过），直接显示
    if (isHiddenWin) {
      this._winStates[name].isHidden = false;
      logManager.info(`Hidden window show: ${name}`)
    }

    return window;
  }
  private _setupWinLifecycle(window: BrowserWindow, name: WindowNames) {
    const updateWinStatus = debounce(() => !window?.isDestroyed()
      && window?.webContents?.send(IPC_EVENTS.MAXIMIZE_WINDOW + 'back', window?.isMaximized()), 80);

      //  close
    window.once('closed', () => {
      this._winStates[name].onClosed.forEach(callback => callback(window));
      window?.destroy();
      window?.removeListener('resize', updateWinStatus);
      this._winStates[name].instance = void 0;
      this._winStates[name].isHidden = false;       // 每次关闭窗口，重置隐藏状态
      logManager.info(`Window closed: ${name}`);
    });
    window.on('resize', updateWinStatus)
    return this;
  }

  // 监听窗口准备阶段
  private _listenWinReady(pararms: {
    win: BrowserWindow,
    isHiddenWin: boolean,
    size: SizeOptions,
  }) {
    const onReady = () => {
      // 设置窗口size
      pararms.win?.once('show', () => setTimeout(() => this._applySizeConstraints(pararms.win, pararms.size), 2));
      // 一切准备就绪再show
      pararms.win?.show();
    }

    // 若不是隐藏窗口，create时有loading；否则直接显示窗口
    if (!pararms.isHiddenWin) {
      const loadingHandler = this._addLoadingView(pararms.win, pararms.size);
      loadingHandler?.(onReady)
    } else {
      onReady();
    }
  }


  // 添加loading
  private _addLoadingView(window: BrowserWindow, size: SizeOptions) {
    let loadingView: WebContentsView | void = new WebContentsView();
    let rendererIsReady = false;   // 每次loading时重置状态

    // loading子视图
    window.contentView?.addChildView(loadingView);
    // loading全覆盖窗口
    loadingView.setBounds({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
    });
    loadingView.webContents.loadFile(path.join(__dirname, 'loading.html'));  // loading源

    // 渲染准备阶段的检查
    const onRendererIsReady = (e: IpcMainEvent) => {
      // 发送者和当前window不同，或已经渲染完了，不再渲染
      if ((e.sender !== window?.webContents) || rendererIsReady) return;    
      rendererIsReady = true;
      window.contentView.removeChildView(loadingView as WebContentsView);
      ipcMain.removeListener(IPC_EVENTS.RENDERER_IS_READY, onRendererIsReady);
      loadingView = void 0;
    }
    // 等待ipc通信，渲染准备就绪再执行onRendererIsReady（下面的cb）
    ipcMain.on(IPC_EVENTS.RENDERER_IS_READY, onRendererIsReady);

    // loading完后
    return (cb: () => void) => loadingView?.webContents.once('dom-ready', () => {
      loadingView?.webContents.insertCSS(`body {
          background-color: ${themeManager.isDark ? '#2C2C2C' : '#FFFFFF'} !important; 
          --stop-color-start: ${themeManager.isDark ? '#A0A0A0' : '#7F7F7F'} !important;
          --stop-color-end: ${themeManager.isDark ? '#A0A0A0' : '#7F7F7F'} !important;
      }`);
      cb();  // loading准备好后callback，例如点击托盘后显示loading图层，render就绪后再发送ipc移除loading
    })

  }

  private _applySizeConstraints(win: BrowserWindow, size: SizeOptions) {
    if (size.maxHeight && size.maxWidth) {
      win.setMaximumSize(size.maxWidth, size.maxHeight);
    }
    if (size.minHeight && size.minWidth) {
      win.setMinimumSize(size.minWidth, size.minHeight);
    }
  }

  private _loadWindowTemplate(window: BrowserWindow, name: WindowNames) {
    // 检查是否存在开发服务器 URL，若存在则表示处于开发环境
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      return window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${'/html/' + (name === 'main' ? '' : name)}`);
    }
    window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/html/${name === 'main' ? 'index' : name}.html`));
  }


  // 关闭窗口方法
  private _handleCloseWindowState(target: BrowserWindow, really: boolean) {
    const name = this.getName(target) as WindowNames;

    if (name) {
      // 隐藏窗口
      if (!really) this._winStates[name].isHidden = true;
      // 删掉该窗口实例
      else this._winStates[name].instance = void 0;
    }

    setTimeout(() => {
      target[really ? 'close' : 'hide']?.();
      this._checkAndCloseAllWinodws();    // 检查
    }, 210)
  }

  private _checkAndCloseAllWinodws() {
    if (!this._winStates[WINDOW_NAMES.MAIN].instance || 
      this._winStates[WINDOW_NAMES.MAIN].instance?.isDestroyed())
      // 如果主窗口已关闭，则遍历其他窗口一起关闭
      return Object.values(this._winStates).forEach(win => win?.instance?.close());

    const minimizeToTray = false; // todo : 从配置中读取
    // 如果没有最小化，并且主窗口隐藏，则遍历其他窗口一起关闭（？）
    if (!minimizeToTray && !this.get(WINDOW_NAMES.MAIN)?.isVisible())
      return Object.values(this._winStates).forEach(win => !win?.instance?.isVisible() && win?.instance?.close());
  }


  // 获取窗口是否隐藏
  private _isHiddenWin(name: WindowNames) {
    return this._winStates[name] && this._winStates[name].isHidden;
  }


  // 创建窗口实例，有隐藏则返回隐藏实例，否则创建新实例
  private _createWinInstance(name: WindowNames, opts?: BrowserWindowConstructorOptions) {
    return this._isHiddenWin(name)
      ? this._winStates[name].instance as BrowserWindow
      : new BrowserWindow({
        ...SHARED_WINDOW_OPTIONS,
        ...opts,
      });
  }


  // really 是否真的关闭窗口（或者隐藏）
  public close(target: BrowserWindow | void | null, really: boolean = true) {
    if (!target) return;

    const name = this.getName(target);
    logManager.info(`Close window: ${name}, really: ${really}`);

    // 检查是关闭还是隐藏
    this._handleCloseWindowState(target, really);
  }

  public toggleMax(target: BrowserWindow | void | null) {
    if (!target) return;
    target.isMaximized() ? target.unmaximize() : target.maximize();
  }

  // 获取当前窗口的状态name
    // main: { instance: void 0, isHidden: false, onCreate: [], onClosed: [] },
    // setting: { instance: void 0, isHidden: false, onCreate: [], onClosed: [] },
    // dialog: { instance: void 0, isHidden: false, onCreate: [], onClosed: [] },
  public getName(target: BrowserWindow | null | void): WindowNames | void {
    if (!target) return;
    // 遍历winState对象name并返回
    for (const [name, win] of Object.entries(this._winStates) as [WindowNames, { instance: BrowserWindow | void } | void][]) {
      if (win?.instance === target) return name;
    }
  }


  // 获取当前winState的实例
  public get(name: WindowNames) {
    // 窗口隐藏时，在用户的逻辑层面上，get不到实例
    if (this._winStates[name].isHidden) return void 0;
    return this._winStates[name].instance;
  }

  public onWindowCreate(name: WindowNames, callback: (window: BrowserWindow) => void) {
    this._winStates[name].onCreate.push(callback);
  }

  public onWindowClosed(name: WindowNames, callback: (window: BrowserWindow) => void) {
    this._winStates[name].onClosed.push(callback);
  }

}

export const windowManager = WindowService.getInstance();

export default windowManager;