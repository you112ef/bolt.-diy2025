import { atom } from 'nanostores';

export const isOnline = atom<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => isOnline.set(true));
  window.addEventListener('offline', () => isOnline.set(false));
}

// You can add a more robust check from the main process later if needed,
// which could update this store via IPC.
// For example:
// ipcRenderer.on('network-status-changed', (event, status) => {
//   isOnline.set(status.isOnline);
// });
// And in main process:
// onlineStatusWindow = new OnlineStatusWindow();
// onlineStatusWindow.on('status-changed', (status) => {
//   mainWindow?.webContents.send('network-status-changed', status);
// });
