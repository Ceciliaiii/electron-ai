import { IPC_EVENTS, WINDOW_NAMES } from '../../common/constants';
import { ipcMain } from 'electron';
import { windowManager } from '../service/WindowService';

export function setupSettingWindow() {
    // 监听到“打开settingWindow”
  ipcMain.on(`${IPC_EVENTS.OPEN_WINDOW}:${WINDOW_NAMES.SETTING}`, () => {
    const settingWindow = windowManager.get(WINDOW_NAMES.SETTING);

    // 如果setting存在且未被销毁，仅聚焦
    if (settingWindow && !settingWindow.isDestroyed())
      return windowManager.focus(settingWindow);

    windowManager.create(WINDOW_NAMES.SETTING, {
      width: 800,
      height: 600,
      minHeight: 600,
      minWidth: 800,
    });
  })
}

export default setupSettingWindow;