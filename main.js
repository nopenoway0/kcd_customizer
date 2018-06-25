const {app, BrowserWindow, ipcMain} = require('electron')
  
  function createWindow () {
  // Create the browser window.
    let win = new BrowserWindow({width: 730, height: 600})
    win.loadFile('index.html')

    var setup_window = new BrowserWindow({width: 400, height: 200, show: false});
    setup_window.loadFile('setup_index.html')
    
    ipcMain.on('load_rebuild_window', (event, data) =>{
      setup_window.hide();
      setup_window.loadFile('rebuild_textures.html');
      setup_window.on('ready-to-show', () =>{
        setup_window.show();
          setup_window.webContents.send('paths', data);
      })
    });

    ipcMain.on('show_setup_window', (event, data) =>{
      setup_window.show();
    });

    ipcMain.on('directory_set', (event, path) =>
    {
      win.webContents.send('directory_set', path);
      win.webContents.send('resume_render');
    });

    ipcMain.on('close_setup_window', (event, data) =>
    {
      if(setup_window != null)
        setup_window.close();
      setup_window = null;
    })
    win.on('close', () =>{
      if(setup_window != null)
        setup_window.close();
    })
    // and load the index.html of the app.
  }
  
  app.on('ready', createWindow)