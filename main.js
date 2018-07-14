const {app, BrowserWindow, ipcMain} = require('electron')
  const ASAR_DIR = 'resources/app.asar/'
  function createWindow () {
  // Create the browser window.
    var win = new BrowserWindow({width: 730, height: 600})
    win.loadFile('index.html')
    //win.webContents.openDevTools();
    var setup_window = new BrowserWindow({parent: win, modal: true, width: 400, height: 200, show: false, frame: false});

    setup_window.loadFile('setup_index.html')
    //setup_window.openDevTools();

    ipcMain.on('request-paths', (event, data) =>{
      win.webContents.send('request-paths', true);
    })

    ipcMain.on('paths', (event, data) => {
      setup_window.webContents.send('paths', data);
    });

    ipcMain.on('show_setup_window', (event, data) =>{
      setup_window.show();
    });

    ipcMain.on('directory_set', (event, path) =>
    {
      win.webContents.send('directory_set', path);
      win.webContents.send('resume_render');
      setup_window.hide();
    });

    ipcMain.on('resume', (event, data) =>{
      setup_window.hide();
      win.webContents.send('resume');
    })

    ipcMain.on('close_setup_window', (event, data) =>
    {
      setup_window.hide();
    })
    win.on('close', () =>{
      app.quit();
    })
  }
  
  app.on('ready', createWindow)