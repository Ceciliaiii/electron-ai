// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_EVENTS, WINDOW_NAMES } from './common/constants';

const api: WindowApi = {
  openWindow: (name: WindowNames) => ipcRenderer.send(`${IPC_EVENTS.OPEN_WINDOW}:${name}`),
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

  getConfig: (key: string) => ipcRenderer.invoke(IPC_EVENTS.GET_CONFIG, key),
  // 单值更新
  setConfig: (key: string, value: any) => ipcRenderer.send(IPC_EVENTS.SET_CONFIG, key, value),
  // 批量更新
  updateConfig: (value: any) => ipcRenderer.send(IPC_EVENTS.UPDATE_CONFIG, value),

  onConfigChange: (callback: (config: any) => void) => {
    ipcRenderer.on(IPC_EVENTS.CONFIG_UPDATED, (_, config) => callback(config));
    return () => ipcRenderer.removeListener(IPC_EVENTS.CONFIG_UPDATED, callback);
  },

  removeConfigChangeListener: (cb: (config: any) => void) => ipcRenderer.removeListener(IPC_EVENTS.CONFIG_UPDATED, cb),

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

  // render进程发送一个消息：创建一个对话
  // 触发main进程 main/wins/main窗口 的ipcMain.on
  startADialogue: (params: CreateDialogueProps) => ipcRenderer.send(IPC_EVENTS.START_A_DIALOGUE, params),

  // render监听main的ai流式响应，cb处理main进程的流式数据，messageId匹配响应的对话
  onDialogueBack: (cb: (data: DialogueBackStream) => void, messageId: number) => {
    // 接受main进程推送的data流式数据，并转发给render进程的cb回调，前端能实时处理数据
    const callback = (_event: Electron.IpcRendererEvent, data: DialogueBackStream) => cb(data);
    // 监听main进程推送的事件（start-a-dialogue + back + messageId），只接受当前messageId的流式数据
    ipcRenderer.on(IPC_EVENTS.START_A_DIALOGUE + 'back' + messageId, callback);

    // 返回一个停止监听，调用时防止内存泄漏
    return () => ipcRenderer.removeListener(IPC_EVENTS.START_A_DIALOGUE + 'back' + messageId, callback)
  },


  logger: {
    debug: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_DEBUG, message, ...meta),
    info: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_INFO, message, ...meta),
    warn: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_WARN, message, ...meta),
    error: (message: string, ...meta: any[]) => ipcRenderer.send(IPC_EVENTS.LOG_ERROR, message, ...meta),
  }
}

contextBridge.exposeInMainWorld('api', api);