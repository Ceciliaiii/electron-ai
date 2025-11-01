import setupDialogWindow from './dialog';
import { setupMainWindow } from './main';

export function setupWindows() {
  setupMainWindow();
  setupDialogWindow()
}