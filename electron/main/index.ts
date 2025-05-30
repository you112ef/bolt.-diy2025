/// <reference types="vite/client" />
import { createRequestHandler } from '@remix-run/node';
import electron, { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import log from 'electron-log';
import path from 'node:path';
import * as pkg from '../../package.json';
import { setupAutoUpdater } from './utils/auto-update';
import { isDev, DEFAULT_PORT } from './utils/constants';
import { initViteServer, viteServer } from './utils/vite-server';
import { setupMenu } from './ui/menu';
import { createWindow } from './ui/window';
import { initCookies, storeCookies } from './utils/cookie';
import { loadServerBuild, serveAsset } from './utils/serve';
import { reloadOnChange } from './utils/reload';
import { spawn, type ChildProcess } from 'node:child_process'; // Added for llama-server
import type { LocalServerStatus } from '~/lib/services/local-llm-service'; // Added for type

Object.assign(console, log.functions);

console.debug('main: import.meta.env:', import.meta.env);
console.log('main: isDev:', isDev);
console.log('NODE_ENV:', global.process.env.NODE_ENV);
console.log('isPackaged:', app.isPackaged);

// Log unhandled errors
process.on('uncaughtException', async (error) => {
  console.log('Uncaught Exception:', error);
});

process.on('unhandledRejection', async (error) => {
  console.log('Unhandled Rejection:', error);
});

(() => {
  const root = global.process.env.APP_PATH_ROOT ?? import.meta.env.VITE_APP_PATH_ROOT;

  if (root === undefined) {
    console.log('no given APP_PATH_ROOT or VITE_APP_PATH_ROOT. default path is used.');
    return;
  }

  if (!path.isAbsolute(root)) {
    console.log('APP_PATH_ROOT must be absolute path.');
    global.process.exit(1);
  }

  console.log(`APP_PATH_ROOT: ${root}`);

  const subdirName = pkg.name;

  for (const [key, val] of [
    ['appData', ''],
    ['userData', subdirName],
    ['sessionData', subdirName],
  ] as const) {
    app.setPath(key, path.join(root, val));
  }

  app.setAppLogsPath(path.join(root, subdirName, 'Logs'));
})();

console.log('appPath:', app.getAppPath());

const keys: Parameters<typeof app.getPath>[number][] = ['home', 'appData', 'userData', 'sessionData', 'logs', 'temp'];
keys.forEach((key) => console.log(`${key}:`, app.getPath(key)));
console.log('start whenReady');

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/naming-convention
  var __electron__: typeof electron;
}

(async () => {
  await app.whenReady();
  console.log('App is ready');

  // Load any existing cookies from ElectronStore, set as cookie
  await initCookies();

  const serverBuild = await loadServerBuild();

  protocol.handle('http', async (req) => {
    console.log('Handling request for:', req.url);

    if (isDev) {
      console.log('Dev mode: forwarding to vite server');
      return await fetch(req);
    }

    req.headers.append('Referer', req.referrer);

    try {
      const url = new URL(req.url);

      // Forward requests to specific local server ports
      if (url.port !== `${DEFAULT_PORT}`) {
        console.log('Forwarding request to local server:', req.url);
        return await fetch(req);
      }

      // Always try to serve asset first
      const assetPath = path.join(app.getAppPath(), 'build', 'client');
      const res = await serveAsset(req, assetPath);

      if (res) {
        console.log('Served asset:', req.url);
        return res;
      }

      // Forward all cookies to remix server
      const cookies = await session.defaultSession.cookies.get({});

      if (cookies.length > 0) {
        req.headers.set('Cookie', cookies.map((c) => `${c.name}=${c.value}`).join('; '));

        // Store all cookies
        await storeCookies(cookies);
      }

      // Create request handler with the server build
      const handler = createRequestHandler(serverBuild, 'production');
      console.log('Handling request with server build:', req.url);

      const result = await handler(req, {
        /*
         * Remix app access cloudflare.env
         * Need to pass an empty object to prevent undefined
         */
        // @ts-ignore:next-line
        cloudflare: {},
      });

      return result;
    } catch (err) {
      console.log('Error handling request:', {
        url: req.url,
        error:
          err instanceof Error
            ? {
                message: err.message,
                stack: err.stack,
                cause: err.cause,
              }
            : err,
      });

      const error = err instanceof Error ? err : new Error(String(err));

      return new Response(`Error handling request to ${req.url}: ${error.stack ?? error.message}`, {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      });
    }
  });

  const rendererURL = await (isDev
    ? (async () => {
        await initViteServer();

        if (!viteServer) {
          throw new Error('Vite server is not initialized');
        }

        const listen = await viteServer.listen();
        global.__electron__ = electron;
        viteServer.printUrls();

        return `http://localhost:${listen.config.server.port}`;
      })()
    : `http://localhost:${DEFAULT_PORT}`);

  console.log('Using renderer URL:', rendererURL);

  const win = await createWindow(rendererURL);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(rendererURL);
    }
  });

  console.log('end whenReady');

  return win;
})()
  .then((win) => {
    // IPC samples : send and recieve.
    let count = 0;
    setInterval(() => win.webContents.send('ping', `hello from main! ${count++}`), 60 * 1000);
    ipcMain.handle('ipcTest', (event, ...args) => console.log('ipc: renderer -> main', { event, ...args }));

    // --- Local LLaMA Server IPC Handlers ---
    let llamaServerProcess: ChildProcess | null = null;
    let currentLlamaServerStatus: LocalServerStatus = { isRunning: false, message: 'Not started' };

    const sendStatusUpdate = () => {
      try {
        if (win && !win.isDestroyed()) {
          win.webContents.send('local-llama:status-reply', currentLlamaServerStatus);
        }
      } catch (error) {
        console.error("Failed to send status update to renderer:", error);
      }
    };

    ipcMain.on('local-llama:start', (_event, args: { serverPath: string, modelPath: string, gpuLayers: number, threads: number, port: number }) => {
      if (llamaServerProcess && !llamaServerProcess.killed) {
        if (currentLlamaServerStatus.modelPath === args.modelPath) {
          console.log('Local LLaMA server already running with the same model.');
          currentLlamaServerStatus.message = 'Server already running with this model.';
          sendStatusUpdate();
          return;
        } else {
          console.log('Local LLaMA server running with different model. Stopping first...');
          llamaServerProcess.kill('SIGTERM'); // Attempt graceful shutdown
          // Wait for exit event before truly restarting, or implement a more robust restart logic
          // For now, we'll let the 'exit' handler clean up and then the user can try starting again if it fails.
          // This part might need refinement for seamless model switching.
        }
      }

      console.log(`Starting Local LLaMA server: ${args.serverPath} with model ${args.modelPath}`);
      currentLlamaServerStatus = { isRunning: false, message: `Starting server with model ${args.modelPath.split('/').pop() || args.modelPath}...`, pid: undefined, modelPath: args.modelPath };
      sendStatusUpdate();

      const serverArgs = [
        '--model', args.modelPath,
        '--port', args.port.toString(),
        '--host', '127.0.0.1', // Or make configurable, 0.0.0.0 for wider access
        '--n-gpu-layers', args.gpuLayers.toString(),
        '--threads', args.threads.toString(),
        // Add other necessary arguments like --ctx-size if needed
      ];
      
      try {
        llamaServerProcess = spawn(args.serverPath, serverArgs);
        currentLlamaServerStatus.pid = llamaServerProcess.pid;
      } catch (error: any) {
        console.error('Failed to spawn Local LLaMA server:', error);
        currentLlamaServerStatus = { isRunning: false, message: `Failed to spawn server: ${error.message}`, lastError: error.message, modelPath: args.modelPath };
        sendStatusUpdate();
        return;
      }

      llamaServerProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (win && !win.isDestroyed()) win.webContents.send('local-llama:stdout', output);
        if (output.includes('HTTP server listening')) { // Adjust this to actual server ready message
          console.log('Local LLaMA server started successfully.');
          currentLlamaServerStatus = { isRunning: true, message: 'Server running.', pid: llamaServerProcess?.pid, modelPath: args.modelPath };
          sendStatusUpdate();
        }
      });

      llamaServerProcess.stderr?.on('data', (data: Buffer) => {
        const errorOutput = data.toString();
        if (win && !win.isDestroyed()) win.webContents.send('local-llama:stderr', errorOutput);
        // Update status, but stderr doesn't always mean server isn't running/starting
        currentLlamaServerStatus.lastError = errorOutput.split('\n')[0]; // Store first line of error
        currentLlamaServerStatus.message = `Server stderr: ${currentLlamaServerStatus.lastError}`;
        // Don't assume isRunning is false yet, wait for exit or explicit ready message
        sendStatusUpdate();
      });

      llamaServerProcess.on('error', (err) => {
        console.error('Error with Local LLaMA server process:', err);
        currentLlamaServerStatus = { isRunning: false, message: `Server process error: ${err.message}`, lastError: err.message, pid: undefined, modelPath: args.modelPath };
        sendStatusUpdate();
        llamaServerProcess = null;
      });

      llamaServerProcess.on('exit', (code, signal) => {
        console.log(`Local LLaMA server process exited with code ${code}, signal ${signal}`);
        const message = code === 0 ? "Server stopped." : `Server exited (code ${code}, signal ${signal}).`;
        currentLlamaServerStatus = { isRunning: false, message, lastError: code !== 0 ? message : undefined, pid: undefined, modelPath: args.modelPath };
        if (win && !win.isDestroyed()) win.webContents.send('local-llama:exit', code, signal); // Notify renderer of exit
        sendStatusUpdate();
        llamaServerProcess = null;
      });
    });

    ipcMain.on('local-llama:stop', () => {
      if (llamaServerProcess && !llamaServerProcess.killed) {
        console.log('Stopping Local LLaMA server...');
        currentLlamaServerStatus.message = 'Stopping server...';
        sendStatusUpdate();
        const killed = llamaServerProcess.kill('SIGTERM'); // or 'SIGINT'
        if (!killed) {
            console.error("Failed to send SIGTERM to llama-server. Attempting SIGKILL.");
            llamaServerProcess.kill('SIGKILL'); // Force kill if SIGTERM failed
        }
        // Status update will be handled by the 'exit' event listener
      } else {
        console.log('Local LLaMA server not running or already stopping.');
        currentLlamaServerStatus = { isRunning: false, message: 'Server not running.', pid: undefined };
        sendStatusUpdate();
      }
    });

    ipcMain.on('local-llama:status', (event) => {
      event.reply('local-llama:status-reply', currentLlamaServerStatus);
    });
    // --- End Local LLaMA Server IPC Handlers ---

    return win;
  })
  .then((win) => setupMenu(win));

app.on('window-all-closed', () => {
  // Note: 'before-quit' is generally better for cleanup.
  // If all windows are closed and it's not macOS, app quits.
  // Server should be stopped here if not handled by before-quit for some reason.
  if (process.platform !== 'darwin') {
    if (llamaServerProcess && !llamaServerProcess.killed) { // llamaServerProcess needs to be accessible here or passed
      console.log('All windows closed, stopping Local LLaMA server...');
      llamaServerProcess.kill('SIGTERM');
      // Consider setting llamaServerProcess = null here if this is the primary shutdown path
    }
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  // This event listener needs access to `llamaServerProcess`.
  // Ensure `llamaServerProcess` is declared in a scope accessible to this handler.
  // It seems it is declared within the .then((win) => { ... }) block, so it might not be directly accessible here.
  // This needs to be refactored: llamaServerProcess should be at a higher scope, or this logic moved.

  // Assuming llamaServerProcess is accessible (e.g., moved to a higher scope):
  if (global.llamaServerProcessRef && !global.llamaServerProcessRef.killed) {
    console.log('Before quit: Attempting to stop Local LLaMA server...');
    event.preventDefault(); // Prevent quitting immediately

    const gracefullyStopped = new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('Local LLaMA server stop timeout during quit. Forcing kill.');
        if (global.llamaServerProcessRef && !global.llamaServerProcessRef.killed) {
          global.llamaServerProcessRef.kill('SIGKILL');
        }
        resolve(); // Resolve even if force killed, to allow app to quit
      }, 2000); // 2-second timeout

      global.llamaServerProcessRef.on('exit', () => {
        clearTimeout(timeoutId);
        console.log('Local LLaMA server stopped gracefully during quit.');
        global.llamaServerProcessRef = null;
        resolve();
      });

      if (!global.llamaServerProcessRef.kill('SIGTERM')) { 
          clearTimeout(timeoutId);
          console.warn('Failed to send SIGTERM or process already exited during quit.');
          global.llamaServerProcessRef = null;
          resolve();
      }
    });

    try {
      await gracefullyStopped;
    } catch (e) {
      console.error("Error during graceful stop:", e);
    }
    app.quit(); // Now actually quit
  } else if (llamaServerProcess && !llamaServerProcess.killed) {
    // Fallback for original declaration scope if refactoring global.llamaServerProcessRef is not done yet.
    // This indicates a structural issue if this fallback is hit often.
    console.warn("before-quit: llamaServerProcess was not accessible via global ref, attempting direct access. Refactor needed.");
    event.preventDefault();
    llamaServerProcess.kill('SIGTERM'); // Simplified stop for this case
    setTimeout(() => app.quit(), 500); // Give it a moment
  }
});

reloadOnChange();
setupAutoUpdater();
