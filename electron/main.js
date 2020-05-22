const {app, BrowserWindow, Menu, Tray} = require('electron')
const path = require('path')
const child_process = require('child_process');
const contextMenu = require('electron-context-menu');
const appMenu = require('./menu.js');
const electron = require('electron');
const windowStateKeeper = require('electron-window-state');
ipc = electron.ipcMain;

let mainWindow
let tray = null
var force_quit = false;

var main_url = 'https://discourse.ubuntu.com/';
var main_desc = 'Community Hub';

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

require('electron-context-menu')({
  showInspectElement: false
});

app.allowRendererProcessReuse = true
app.commandLine.appendSwitch ("disk-cache-size=10485760")

function createWindow () {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1024,
    defaultHeight: 1280
  });

  mainWindow = new BrowserWindow({
    'x': mainWindowState.x,
    'y': mainWindowState.y,
    'width': mainWindowState.width,
    'height': mainWindowState.height,
    'icon': path.join(process.env["SNAP"], 'meta/gui/icon.png'),
    webPreferences: {
      'preload': path.join(process.env["SNAP"], 'electron', 'resources', 'app', 'preload.js')
    }
  })

  mainWindow.loadURL(main_url)

  iconPath = path.join(process.env["SNAP"], 'trayicon.png');
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {id: 'open',
      label: 'Open ' + main_desc,
      click: function() {mainWindow.show();},
      enabled: false
    },
    {id: 'minimize',
      label: 'Minimize to tray',
      click: function() {mainWindow.hide();},
      enabled: true
    },
    {id: 'sep',
      type: 'separator'
    },
    {id: 'quit',
      label: 'Quit',
      click: function() {force_quit=true; app.quit();}
    }
  ])

  tray.setToolTip(main_url)

  const minimize = contextMenu.getMenuItemById('minimize')
  const open = contextMenu.getMenuItemById('open')

  tray.on('click', function(e){
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  });

  tray.setContextMenu(contextMenu)

  var wc = mainWindow.webContents;

  wc.on('will-navigate', function(e, url) {
    if(url.indexOf(main_url) != 0) {
      e.preventDefault();
      child_process.execSync('xdg-open ' + url);
    }
  });

  wc.on('new-window', function(e, url) {
    if(url.indexOf(main_url) != 0) {
      e.preventDefault();
      child_process.execSync('xdg-open ' + url);
    } else {
      e.preventDefault();
      mainWindow.loadURL(url);
    }
  });

  if (!isEmptyObject(appMenu)) {
    electron.Menu.setApplicationMenu(appMenu);
  }

  mainWindow.on('close', function(e) {
    if (!force_quit) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.on('show', function () {
    minimize.enabled = true;
    open.enabled = false;
    tray.setContextMenu(contextMenu)
  });

  mainWindow.on('hide', function () {
    minimize.enabled = false;
    open.enabled = true;
    tray.setContextMenu(contextMenu);
  });

  mainWindowState.manage(mainWindow);
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('ready',  () => {
    createWindow()
  })
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

ipc.on('unread', (event, args) => {
  if (args !== 0) {
    app.badgeCount = args
  }  else {
    app.badgeCount = 0
  }
});
