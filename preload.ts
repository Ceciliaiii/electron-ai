// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_EVENTS, WINDOW_NAMES } from './common/constants';

const api: WindowApi = {
  closeWindow: () => ipcRenderer.send(IPC_EVENTS.CLOSE_WINDOW),
  minimizeWindow: () => ipcRenderer.send(IPC_EVENTS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.send(IPC_EVENTS.MAXIMIZE_WINDOW),
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => ipcRenderer.on(IPC_EVENTS.MAXIMIZE_WINDOW + 'back', (_, isMaximized) => callback(isMaximized)),
  isWindowMaximized: () => ipcRenderer.invoke(IPC_EVENTS.IS_WINDOW_MAXIMIZED),

  setThemeMode: (mode: ThemeMode) => ipcRenderer.invoke(IPC_EVENTS.SET_THEME_MODE, mode),
  getThemeMode: () => ipcRenderer.invoke(IPC_EVENTS.GET_THEME_MODE),
  isDarkTheme: () => ipcRenderer.invoke(IPC_EVENTS.IS_DARK_THEME),
  onSystemThemeChange: (callback: (isDark: boolean) => void) => ipcRenderer.on(IPC_EVENTS.THEME_MODE_UPDATED, (_, isDark) => callback(isDark)),

  showContextMenu: (menuId: string, dynamicOptions?: string) => ipcRenderer.invoke(IPC_EVENTS.SHOW_CONTEXT_MENU, menuId, dynamicOptions),
  contextMenuItemClick: (menuId: string, cb: (id: string) => void) => ipcRenderer.on(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${menuId}`, (_, id) => cb(id)),
  removeContextMenuListener: (menuId: string) => ipcRenderer.removeAllListeners(`${IPC_EVENTS.SHOW_CONTEXT_MENU}:${menuId}`),

  // ipc通信render进程就绪
  viewIsReady: () => ipcRenderer.send(IPC_EVENTS.RENDERER_IS_READY),

  // render进程创建dialog窗口，处理dialog按钮交互（confirm | cancel）
  createDialog: (params: CreateDialogProps) => new Promise(async (resolve) => {
    // 向主进程发送请求创建dialog，并传递params，接收resolve回调
    const feedback = await ipcRenderer.invoke(`${IPC_EVENTS.OPEN_WINDOW}:${WINDOW_NAMES.DIALOG}`, {
      title: params.title ?? '',
      content: params.content,
      confirmText: params.confirmText,
      cancelText: params.cancelText,
    });

    // 等待主进程返回的resolve回调（交互结果），并执行对应回调
    if (feedback === 'confirm') params?.onConfirm?.();
    if (feedback === 'cancel') params?.onCancel?.();

    // 将结果通过resolve返回给调用方useDialog()
    resolve(feedback);
  }),

  // 向主进程发送交互（confirm | cancel，dialog标识）
  _dialogFeedback: (val: 'cancel' | 'confirm', winId: number) => ipcRenderer.send(WINDOW_NAMES.DIALOG + val, winId),
  // 向主进程请求params
  _dialogGetParams: () => ipcRenderer.invoke(WINDOW_NAMES.DIALOG + 'get-params') as Promise<CreateDialogProps>,

  logger: {
    debug: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_DEBUG, message, ...meta),
    info: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_INFO, message, ...meta),
    warn: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_WARN, message, ...meta),
    error: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_ERROR, message, ...meta),
  }
}

contextBridge.exposeInMainWorld('api', api);