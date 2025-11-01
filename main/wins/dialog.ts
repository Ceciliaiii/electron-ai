import { IPC_EVENTS, WINDOW_NAMES } from '../../common/constants';
import { BrowserWindow, ipcMain } from 'electron';
import { windowManager } from '../service/WindowService';

export function setupDialogWindow() {
  let dialogWindow: BrowserWindow | void;
  let params: CreateDialogProps | void;
  let feedback: string | void

    // 监听render进程调用 _dialogGetParams() 时触发
  ipcMain.handle(WINDOW_NAMES.DIALOG + 'get-params',(e)=>{
    // 检查是否为dialog窗口
    if(BrowserWindow.fromWebContents(e.sender) !== dialogWindow) return

    // 返回参数
    return {
      winId: e.sender.id,
      ...params
    }
  });

//   监听confirm和cancel
  ['confirm','cancel'].forEach(_feedback => {
    ipcMain.on(WINDOW_NAMES.DIALOG + _feedback,(e,winId:number)=> {
      if(e.sender.id !== winId) return
      feedback = _feedback;

    // 无论执行什么  都关闭dialog窗口
      windowManager.close(BrowserWindow.fromWebContents(e.sender));
    });
  });

//   监听处理渲染dialog的请求
  ipcMain.handle(`${IPC_EVENTS.OPEN_WINDOW}:${WINDOW_NAMES.DIALOG}`, (e, _params) => {
    // 缓存参数
    params = _params;

    // 创建窗口
    dialogWindow = windowManager.create(
      WINDOW_NAMES.DIALOG,
      {
        width: 350, height: 200,
        minWidth: 350, minHeight: 200,
        maxWidth: 400, maxHeight: 300,
      },
      { // 指定父窗口
        parent: BrowserWindow.fromWebContents(e.sender) as BrowserWindow,
        resizable: false
      }
    );

    // dialog关闭时，返回feedback（用户操作结果）
    return new Promise<string | void>((resolve) => dialogWindow?.on('closed', () => {
      // resolve传回 preload 里的 createDialog().feedback
      resolve(feedback);
      feedback = void 0;   // 重置缓存的feedback
    }))
  })

}

export default setupDialogWindow