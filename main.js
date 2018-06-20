const {app, BrowserWindow} = require('electron')
  
  function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({width: 730, height: 600})
  
    // and load the index.html of the app.
    win.loadFile('index.html')
  }
  
  app.on('ready', createWindow)