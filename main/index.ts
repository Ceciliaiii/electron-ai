/// main/index.ts

import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';
import { setupWindows } from './wins';
import logManager from './service/LogService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

process.on('uncaughtException', (err) => {
  logManager.error('uncaughtException', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logManager.error('unhandledRejection', reason, promise);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  setupWindows();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      setupWindows();
    }
  });
});