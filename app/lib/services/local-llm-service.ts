// Renderer-side service for interacting with the local LLaMA server (via IPC)
import { providersStore } from '~/lib/stores/settings';
import { atom } from 'nanostores';

// Electron's ipcRenderer. Will be undefined in non-Electron context but should be available in renderer.
const ipcRenderer = (window as any).electron?.ipcRenderer;

export interface LocalServerStatus {
  isRunning: boolean;
  pid?: number;
  lastError?: string;
  message?: string; // General status message from main process
  modelPath?: string; // Model currently loaded or attempted
}

// Nanostore to hold the latest status received from the main process
export const localLlamaServerStatusStore = atom<LocalServerStatus>({
  isRunning: false,
  message: 'Not initialized',
});

if (ipcRenderer) {
  ipcRenderer.on('local-llama:status-reply', (_event, status: LocalServerStatus) => {
    localLlamaServerStatusStore.set(status);
  });

  ipcRenderer.on('local-llama:stdout', (_event, data: string) => {
    console.log('[LocalLLaMA Server STDOUT]:', data);
    // Potentially update statusStore with a "server started" message if specific output is seen
    const currentStatus = localLlamaServerStatusStore.get();
    if (data.includes("HTTP server listening")) { // Example: check for server ready message
        localLlamaServerStatusStore.set({
            ...currentStatus,
            isRunning: true,
            message: "Server started successfully."
        });
    }
  });

  ipcRenderer.on('local-llama:stderr', (_event, data: string) => {
    console.error('[LocalLLaMA Server STDERR]:', data);
    const currentStatus = localLlamaServerStatusStore.get();
    localLlamaServerStatusStore.set({
      ...currentStatus,
      isRunning: currentStatus.isRunning, // STDERR doesn't always mean it's not running
      lastError: data,
      message: `Server error: ${data.split('\n')[0]}`, // Show first line of error
    });
  });

  ipcRenderer.on('local-llama:exit', (_event, exitCode: number | null, signal: string | null) => {
    console.log(`[LocalLLaMA Server EXIT]: Code ${exitCode}, Signal ${signal}`);
    const message = exitCode === 0 ? "Server stopped." : `Server exited unexpectedly (code ${exitCode}, signal ${signal}).`;
    localLlamaServerStatusStore.set({
      isRunning: false,
      pid: undefined,
      lastError: exitCode !== 0 ? message : undefined,
      message: message,
    });
  });
} else {
  console.warn('ipcRenderer not available. Local LLaMA service will not function.');
  localLlamaServerStatusStore.set({
    isRunning: false,
    message: 'IPC not available. Running outside Electron?',
  });
}

export async function startLocalLlamaServer(): Promise<void> {
  if (!ipcRenderer) return Promise.reject(new Error('IPC not available'));

  const settings = providersStore.get()['LocalLLaMA']?.settings;
  const serverPath = settings?.serverPath;
  const modelPath = settings?.modelPath;
  const gpuLayers = settings?.gpuLayers !== undefined ? settings.gpuLayers : -1; // default -1 for auto
  const threads = settings?.threads || Math.max(1, Math.floor(navigator.hardwareConcurrency / 2) || 2);
  const port = 8080; // Make this configurable later

  if (!serverPath || !modelPath) {
    const errorMsg = "Local LLaMA server or model path not configured.";
    console.error(errorMsg);
    localLlamaServerStatusStore.set({ isRunning: false, lastError: errorMsg, message: errorMsg });
    return Promise.reject(new Error(errorMsg));
  }

  const currentStatus = localLlamaServerStatusStore.get();
  if (currentStatus.isRunning && currentStatus.modelPath === modelPath) {
    console.log("LocalLLaMA server is already running with the same model.");
    return Promise.resolve();
  }
  
  if (currentStatus.isRunning && currentStatus.modelPath !== modelPath) {
    console.log("LocalLLaMA server is running with a different model. Attempting to stop and restart.");
    await stopLocalLlamaServer(); // Wait for stop to complete
  }

  localLlamaServerStatusStore.set({ isRunning: false, message: 'Starting server...', modelPath });
  ipcRenderer.send('local-llama:start', { serverPath, modelPath, gpuLayers, threads, port });
  
  // The actual status update to isRunning=true will come from an IPC reply
  // or by parsing stdout. For now, we optimistically set a "starting" message.
  // We can return a promise that resolves/rejects based on a timeout or specific IPC reply.
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        const status = localLlamaServerStatusStore.get();
        if (!status.isRunning && status.message === 'Starting server...') { // Check if it's still trying to start
            const errorMsg = "Server start timed out.";
            localLlamaServerStatusStore.set({ ...status, isRunning: false, lastError: errorMsg, message: errorMsg });
            reject(new Error(errorMsg));
        } else if (status.isRunning) {
            resolve();
        } else { // It's not running, but message is not "Starting server...", so it might have failed.
            reject(new Error(status.lastError || "Server failed to start for an unknown reason."));
        }
    }, 15000); // 15-second timeout for server to start

    const unsubscribe = localLlamaServerStatusStore.subscribe(status => {
        if (status.isRunning && status.modelPath === modelPath) {
            clearTimeout(timeout);
            unsubscribe();
            resolve();
        } else if (!status.isRunning && status.lastError && status.modelPath === modelPath) {
            // Server failed to start or exited quickly
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error(status.lastError));
        }
    });
  });
}

export async function stopLocalLlamaServer(): Promise<void> {
  if (!ipcRenderer) return Promise.reject(new Error('IPC not available'));
  
  const currentStatus = localLlamaServerStatusStore.get();
  if (!currentStatus.isRunning && !currentStatus.pid) { // Check pid in case it's starting but not fully running
      console.log("LocalLLaMA server is not running or starting.");
      localLlamaServerStatusStore.set({ isRunning: false, message: "Server already stopped."});
      return Promise.resolve();
  }

  localLlamaServerStatusStore.set({ ...currentStatus, message: 'Stopping server...' });
  ipcRenderer.send('local-llama:stop');

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        const status = localLlamaServerStatusStore.get();
        if (status.isRunning) { // Check if it's still trying to stop
            const errorMsg = "Server stop timed out.";
            localLlamaServerStatusStore.set({ ...status, lastError: errorMsg, message: errorMsg });
            reject(new Error(errorMsg));
        } else {
             resolve(); // Already stopped
        }
    }, 5000); // 5-second timeout for server to stop

    const unsubscribe = localLlamaServerStatusStore.subscribe(status => {
        if (!status.isRunning) {
            clearTimeout(timeout);
            unsubscribe();
            resolve();
        }
    });
  });
}

export function getLocalLlamaServerStatus(): LocalServerStatus {
  // This is now reactive via the store. Components should subscribe to localLlamaServerStatusStore.
  // This function can still be called for an immediate snapshot if needed.
  if (ipcRenderer) {
    // Optionally, request an immediate status update from main if needed,
    // though usually the store should be up-to-date via main's proactive updates.
    // ipcRenderer.send('local-llama:status');
  }
  return localLlamaServerStatusStore.get();
}

// Request initial status when service is loaded
if (ipcRenderer) {
  ipcRenderer.send('local-llama:status');
}
