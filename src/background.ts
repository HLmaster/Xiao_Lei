import { app, protocol, BrowserWindow, ipcMain, screen } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS, VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import Store from 'electron-store'
import * as remoteMain from '@electron/remote/main'
import path from 'path'
import fs from 'fs'

// Initialize remote module
remoteMain.initialize()

const isDevelopment = process.env.NODE_ENV !== 'production'

// Initialize electron store
const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    floatingBounds: { width: 300, height: 100 }
  }
})

// 保持窗口对象的全局引用
let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null

// 添加窗口样式类型定义
interface WindowStyle {
  backgroundColor: string;
  textColor: string;
}

interface WindowStyles {
  [key: string]: WindowStyle;
}

// 添加窗口样式配置
const windowStyles: WindowStyles = {
  default: {
    backgroundColor: '#ffffff',
    textColor: '#303133'
  },
  dark: {
    backgroundColor: '#1f1f1f',
    textColor: '#ffffff'
  },
  pink: {
    backgroundColor: '#fff0f5',
    textColor: '#ff69b4'
  },
  blue: {
    backgroundColor: '#f0f8ff',
    textColor: '#409eff'
  }
};

// 复制资源文件的函数
async function copyResources() {
  const srcDir = path.join(process.resourcesPath, 'image');
  const destDir = path.join(app.getPath('userData'), 'image');

  console.log('Source directory:', srcDir);
  console.log('Destination directory:', destDir);

  // 如果目标目录不存在，创建它
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 复制文件
  function copyRecursive(src: string, dest: string) {
    console.log(`Copying from ${src} to ${dest}`);
    const exists = fs.existsSync(src);
    console.log(`Source exists: ${exists}`);

    if (!exists) {
      console.error(`Source directory/file does not exist: ${src}`);
      return;
    }

    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }
      fs.readdirSync(src).forEach(function (childItemName) {
        copyRecursive(path.join(src, childItemName),
          path.join(dest, childItemName));
      });
    } else {
      try {
        fs.copyFileSync(src, dest);
        console.log(`Successfully copied ${src} to ${dest}`);
      } catch (err) {
        console.error(`Error copying file ${src}:`, err);
      }
    }
  }

  try {
    copyRecursive(srcDir, destDir);
    console.log('Resources copied successfully');
  } catch (err) {
    console.error('Error copying resources:', err);
  }
}

// 创建主窗口
async function createMainWindow() {
  try {
    const windowBounds = store.get('windowBounds') as { width: number; height: number }
    mainWindow = new BrowserWindow({
      ...windowBounds,
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION as unknown as boolean,
        contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
        webSecurity: false
      }
    })

    // Enable remote module for this window
    remoteMain.enable(mainWindow.webContents)

    // 在生产环境中也启用开发者工具
    // mainWindow.webContents.openDevTools()

    // Save window bounds when resized
    mainWindow.on('resize', () => {
      try {
        if (mainWindow) {
          const bounds = mainWindow.getBounds()
          store.set('windowBounds', bounds)
        }
      } catch (error) {
        console.error('Error saving window bounds:', error)
      }
    })

    if (process.env.WEBPACK_DEV_SERVER_URL) {
      await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    } else {
      createProtocol('app')
      mainWindow.loadURL('app://./index.html')
    }
  } catch (error) {
    console.error('Error creating main window:', error)
  }
}

// 创建浮动窗口
function createFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.focus()
    return
  }

  try {
    const floatingBounds = store.get('floatingBounds') as { width: number; height: number; x?: number; y?: number }
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    // 获取当前样式
    const currentStyle = store.get('windowStyle', 'default') as keyof WindowStyles;
    floatingWindow = new BrowserWindow({
      ...floatingBounds,
      frame: false,
      alwaysOnTop: true,
      focusable: false,
      resizable: true,
      skipTaskbar: true,
      transparent: true,
      x: Math.min(floatingBounds.x || width - 320, width - 320),
      y: Math.min(floatingBounds.y || 40, height - 240),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false
      }
    })

    // Enable remote module for floating window
    remoteMain.enable(floatingWindow.webContents)

    // Save floating window bounds when moved or resized
    const saveBounds = () => {
      try {
        if (floatingWindow) {
          const bounds = floatingWindow.getBounds()
          store.set('floatingBounds', bounds)
        }
      } catch (error) {
        console.error('Error saving floating window bounds:', error)
      }
    }

    floatingWindow.on('resize', saveBounds)
    floatingWindow.on('move', saveBounds)

    // 确保窗口始终保持在最顶层
    floatingWindow.setAlwaysOnTop(true, 'screen-saver')

    // 加载浮动窗口的URL
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      floatingWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL + '#/floating')
    } else {
      floatingWindow.loadURL('app://./index.html#/floating')
    }

    // 窗口加载完成后应用样式
    floatingWindow.webContents.on('did-finish-load', () => {
      if (floatingWindow) {
        floatingWindow.webContents.send('style-update', currentStyle);
      }
    });

    // 监听窗口关闭事件
    floatingWindow.on('closed', () => {
      floatingWindow = null
      // 通知主窗口浮动窗口已关闭
      if (mainWindow) {
        mainWindow.webContents.send('floating-window-closed')
      }
    })
  } catch (error) {
    console.error('Error creating floating window:', error)
  }
}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 当Electron完成初始化时
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e)
    }
  }

  // 在生产环境下复制资源文件
  if (!isDevelopment) {
    await copyResources();
  }

  createMainWindow()
})

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow()
  }
})

// 处理IPC通信
ipcMain.on('toggle-floating-window', () => {
  try {
    if (floatingWindow) {
      floatingWindow.close()
    } else {
      createFloatingWindow()
    }
  } catch (error) {
    console.error('Error toggling floating window:', error)
  }
})

// 处理样式请求
ipcMain.on('request-current-style', (event) => {
  try {
    const currentStyle = store.get('windowStyle', 'default');
    event.reply('style-update', currentStyle);
  } catch (error) {
    console.error('Error handling style request:', error);
    event.reply('style-update', 'default');
  }
});

// 更新浮动窗口的计时器
ipcMain.on('update-timer', (event, data) => {
  try {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.webContents.send('timer-update', data)
    }
  } catch (error) {
    console.error('Error updating timer:', error)
  }
})

// 从浮动窗口发送的控制命令
ipcMain.on('floating-control', (event, command) => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('floating-control', command)
    }
  } catch (error) {
    console.error('Error handling floating control:', error)
  }
})

// 更新窗口样式
ipcMain.on('update-window-style', (event, styleId) => {
  try {
    // 保存样式设置
    store.set('windowStyle', styleId);

    if (floatingWindow && !floatingWindow.isDestroyed()) {
      // 更新窗口样式
      floatingWindow.webContents.send('style-update', styleId);

      // 重新创建窗口来应用样式
      const bounds = floatingWindow.getBounds();
      floatingWindow.close();
      setTimeout(() => {
        createFloatingWindow();
        if (floatingWindow) {
          floatingWindow.setBounds(bounds);
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error updating window style:', error);
  }
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

ipcMain.on('പ്രധാന-outfit-purchased', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('refresh-character-outfits');
  }
}); 