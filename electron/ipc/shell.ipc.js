import { ipcMain, shell } from 'electron';

export function registerShellIpc() {
  ipcMain.handle('shell:openExternal', async (_e, url) => {
    if (!url) return false;
    await shell.openExternal(String(url));
    return true;
  });
}
