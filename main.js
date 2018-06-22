const {app, BrowserWindow, ipcMain} = require('electron')
  
  function createWindow () {
  // Create the browser window.
    let win = new BrowserWindow({width: 730, height: 600})
    win.loadFile('index.html')

    let setup_window = new BrowserWindow({width: 400, height: 200, show: false});
    setup_window.loadFile('setup_index.html')
    
    ipcMain.on('show_setup_window', (event, data) =>{
      setup_window.show();
    });

    ipcMain.on('directory_set', (event, path) =>
    {
      win.webContents.send('directory_set', path);
      win.webContents.send('resume_render');
    });

    // and load the index.html of the app.
  }
  
  app.on('ready', createWindow)