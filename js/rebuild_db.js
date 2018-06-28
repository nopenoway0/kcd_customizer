var ZipStream = require('node-stream-zip')
var https = require('https')
var fs = require("fs-extra")
var {spawn, exec} = require('child_process')
const RESOURCE_PATH = 'resources/app.asar/'
const {ipcRenderer} = require('electron');

/**
 * Send resume signal to main ipc process
 */
function resume(){
	ipcRenderer.send('resume', true);
}

/**
 * Rebuild the texture database from scratch. The flow for this function is:
 * 1. check if the texture converter is in the app directory, if not prompt download
 * 2. Extract all diffuse textures from Heads.pak, Characters.pak, and IPL_Heads.pak
 * 3. Convert all textures that have been extracted
 * 4. Remove all textures that havent or are not converted
 * @param  {[type]}  root_directory             [description]
 * @param  {[type]}  texture_path               [description]
 * @return {[type]}                             [description]
 */
function rebuild(root_directory, texture_path){
	console.log("ROOT_DIR: " + root_directory);
	console.log("TEX_DIR:" + texture_path);
	// url for converter
	const SCTC_URL = 'https://forums.robertsspaceindustries.com/discussion/369524/sc-texture-converter/p1'
	const SCTC_CONFIG = "verbose = false\nrecursive = false\nclean = true\nmerge_gloss = true\nformat = jpg\n"

	// make sure that root directory and texture paths have been set, if not passed in through parameter
	let p = new Promise((res) =>{
		ipcRenderer.send('request-paths', true);
		ipcRenderer.on('paths', (sender, data) =>{
			console.log(data);
			root_directory = data[0];
			texture_path = data[1];
			res();
		});	
	});
	// perform check for  SCTexture converter. give alert and direct user to website to download necessary converter. Program will continue
	// once it finds the converter at star-citizen-texture-converter-v1-3/sctexconv_1.3.exe
	p.then(() =>{
		// create texture_path directory in case it doesn't exist
		fs.ensureDirSync(texture_path);
		if(!fs.existsSync('star-citizen-texture-converter-v1-3/sctexconv_1.3.exe')){
			exec('start ' + SCTC_URL);
			alert("Download SCTexture Converter and extract zip to: " + process.cwd());
		};
		// continually check for presence of converter. When found, affirm by changing button to green and resolving to next stem
		return new Promise((res) =>{
			(function checkConverter(){
				setTimeout(() =>{
					if(!fs.existsSync('star-citizen-texture-converter-v1-3/sctexconv_1.3.exe'))
						checkConverter();
					else{
						// perform sync change on config to jpg. threejs jpg has more support than the default tif
						fs.writeFileSync('star-citizen-texture-converter-v1-3/config.txt', SCTC_CONFIG);						

						$('#converter-found').removeClass('disabled').slideDown(400, () =>{
							$('#converter-found').addClass('green').slideDown(400, () =>{
								res();
							})
						});
					}
				}, 3000);
			})();
		});
	})
	// texture extraction phase from the according zip files in the game. Searches only for diff.dds textures
	.then(() =>{
		$('#texture-load').css('display', 'inline');
		$('#texture-loading-container').css('margin-bottom', "20px");
		return new Promise((res) =>{
			const dds_re = /.*.*_diff\.dds.*/i, dds_part_re = /.*\.\d+$/i, filename_re = /.*\/(.*)$/i;
			const archives = ['Heads.pak', 'IPL_Heads.pak', 'Characters.pak'];
			// extract textures from head and IPL_Head and selected textures from Characters including eyes, beards
			let p = Promise.resolve(5);
			function extractArchives(){
				return new Promise((res) => {
					let archive_name = archives.shift();
					console.log("extraction from: " + root_directory + archive_name);
					var zip = new ZipStream({
						file: root_directory + archive_name,
						storeEntries: true
					});
					zip.on('ready', () => {
						let load = Promise.resolve();
						let count = 0, max = 0;
						// wasted cycles just for looks, can remove
						for (const file of Object.values(zip.entries())){
							if(file.name.match(dds_re))
								max++;;
						}
						$('#texture-load').progress({total: max, value: 0, text:{
							active: "{value} of {total}" + ' (' + archives.length + ' archives left)',
							success: "Archive Finished!"
						}});
						for (const file of Object.values(zip.entries())){
							let diff_dds = file.name.match(dds_re);
							if(diff_dds){
								load = load.then(() =>{
									return new Promise((res) =>{
										let filename = diff_dds[0].match(filename_re);
										filename = (diff_dds[0].match(dds_part_re)) ? filename[1] : filename[1] + '.0';
										//console.log(file.name + filename);
										zip.extract(file.name, texture_path + filename, (err, count)=>{
											if(err)
												console.log("Error: " + err);
											$('#texture-load').progress('increment');
											res();
										});
									});
								});
							}
						}
						load.then(() => res(archives.length));
					});
				});
			}
			for(var x = 0; x < archives.length + 1; x++){
				p = p
					.then((result) =>{
						if(result > 0)
							return extractArchives();
						else
							res();
					});
			}
		})
	})
	// use the previously downloaded tool to convert the textures
	.then(() =>{
		$('#extraction-finished').removeClass('disabled').addClass('green');
		$('#texture-load').hide();
		$('#texture-loading-container').css('margin-bottom', "0px");
		// start converting textures
		$('#convert-texture-container').css('margin-bottom', '20px');
		$('#convert-load').css('display', 'inline');
		return new Promise((res) =>{
			const ls = spawn('star-citizen-texture-converter-v1-3/sctexconv_1.3.exe', [texture_path]);
			let progress_re = /File\s+(\d+)\s+of\s+(\d+)/i, max = -1;
			ls.stdout.on('data', (data) => {
			  let match = data.toString().match(progress_re);
			  if(match){
			  	if(max == -1){
			  		max = match[2];
					$('#convert-load').progress({total: parseInt(max), text:{
						active: "{value} of {total}",
						success: "Textures Converted"
					}});
			  	}
			  	$('#convert-load').progress('increment');
			  	if(parseInt(match[1]) == parseInt(match[2])){
			  		res()
			  		ls.kill();
			  	}
			  }
			});

			ls.stderr.on('data', (data) => {
			  console.log(`stderr: ${data}`);
			});

			ls.on('close', (code) => {
			  console.log(`child process exited with code ${code}`);
			});
		})
	})
	// clean up. Remove all unconverted files
	.then(() =>{
		return new Promise((res) =>{
			$('#converted-texture').removeClass('disabled').addClass('green');
			$('#convert-load').hide();
			$('#convert-texture-container').css('margin-bottom', "0px");
			$('#cleanup-container').css('margin-bottom', '20px');
			$('#cleanup-load').css('display', 'inline');

			let files = fs.readdirSync(texture_path), match_delete_re = /.*\.dds.*/i;
			$('#cleanup-load').progress({total: files.length, text:{
				success: "files removed"
			}});
			(function syncRemove(){
				if(files.length == 0)
					res()
				else{
					new Promise((res) =>{
						let filename = files.shift();
						if(filename.match(match_delete_re)){
							fs.removeSync(texture_path + filename);
							$('#cleanup-load').progress('increment');
							res();
						}
						else
							res();
					}).then(() =>{
						syncRemove();
					});
				}
			})();
		})
	})		
	// extract materials
	.then(() =>{
		$('#cleanup-load').hide();
		$('#clean-up-finished').removeClass('disabled').addClass('green');
		console.log("setup finished");
		resume();
		ipcRenderer.send('close_setup_window');
	});
};