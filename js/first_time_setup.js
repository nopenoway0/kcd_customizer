const electron = require('electron')
function first_time_setup()
{
	return new Promise((res)=>{
		electron.ipcRenderer.send('show_setup_window', true);
		electron.ipcRenderer.on('resume_render', () =>{
			res()
		});
	});
}