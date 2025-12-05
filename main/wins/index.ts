import setupDialogWindow from './dialog';
import { setupMainWindow } from './main';
import { setupSettingWindow } from './setting';

export function setupWindows() {
  setupMainWindow();
  setupDialogWindow()
  setupSettingWindow()
}