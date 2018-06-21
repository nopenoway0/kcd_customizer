const fs = require('fs-extra')
const xml2js = require('xml2js')
var THREE = require('three') // TODO: check if libraries already included
require('./js/LoaderSupport.js')
require('./js/OBJLoader2.js')
const JSZip = require('jszip')

// load configuration file, or create a default one
function config(){
	if(fs.existsSync(CONFIG_PATH)){
		let data = JSON.parse(fs.readFileSync(CONFIG_PATH));
		return data;
	}
	else{
		let data = {'SKIN_MODEL_PATH': 'materials/', 'FPS': 30,
					 'EXPORT_DIR': 'exported/kcd_custom_head/', 'OBJ_MODEL_PATH': 'models/',
					 'MATERIAL_PATH': 'materials/', 'SHOW_TEXTURLESS_HEADS': false};
		fs.writeFileSync('config.json', JSON.stringify(data));
		return data;
	}
}

function create_texture_database(filelist){
	return new Promise((resolve, reject) => {
		let parser = new xml2js.Parser(), re = /.*\/(.*)\..*$/i;
		/**
		 * Set up model textures list. The different fields are for future features for example, swapping textures between heads
		 * @model: these have the relevant diffuse textures for the corresponding model so that it is represented
		 * properly in the preview window
		 * @head: list of head textures
		 * @eyes: list of eyes textures
		 * etc...
		 */
		var model_textures = {'model':[], 'head':{}, 'eyes':{}, 'mouth':{}, 'beard':{}, 'hair':{}};
		for(var x = 0; x < filelist.length; x++){
			let data = fs.readFileSync(filelist[x]), mats = [];
			parser.parseString(data, (err, data)=>{
				try{
					console.log('extracting from: ' + filelist[x]);
					loading_bar.style.width = ((filelist.length / x) * 90) + '%';
					// extract list of submaterials of mtl
					let materials = data["Material"]["SubMaterials"][0]["Material"];
					for(let y = 0; y < materials.length; y++){
						/**
						 * @texture_type: extract the category of texture from the xml. then check if it matches, head, eyes, etc.
						 * @img_name: The mtl file contains paths to the textures. However, the paths it contains are not the ones that are valid
						 * for renderingin KCD Custom. Instead, extract the just the name of the image, and point it to the converted textures
						 * located in textures/
						 */
						let texture_type = materials[y]['$'].Name, img_name = materials[y]["Textures"][0]["Texture"][0]['$'].File.match(re)[1];
						if(texture_type == 'head' || texture_type == 'eyes' || texture_type == 'mouth' || texture_type == 'beard' || texture_type == 'hair'){
							mats.push('textures/' + img_name  + ".jpg");
							model_textures[texture_type]['textures/' + img_name + ".jpg"] = true;
						}
					}
				} catch(err){
					console.log(err);
				}
				// push our list of materials into our overarching models list.
				// TODO: increase robustness in case the loading order of materials doesn't match the loading order of models
				model_textures['model'].push(mats);	
			});
		}
		resolve(model_textures);
	});
}

/**
 * Takes a directory, regular expression, whether or not to include the path in the output of strings.
 * The goal of this function is to list files in a directory corresponding to specific criteria
 * @param  {[type]}  directory    directory to scan for matching files
 * @param  {[type]}  re           regular expression to match with filenames
 * @param  {Boolean} include_path if true, relative path will be appended. default is true
 * @return {[type]}               returns of list of strings of the files in the directory that match the regular expression
 */
function get_file_list(directory, re, include_path = true){
	let files = fs.readdirSync(directory), relevant_files = [];
	for(let x = 0; x < files.length; x++){
		if(files[x].match(re) != null){
			let tmp = (include_path) ? directory + files[x] : files[x];
			relevant_files.push(tmp);
		}
	}
	return relevant_files;
}

/**
 * Function loads assets. Resolve value is the object that has been loaded.
 * Currently can load: OBJ, MTL, and Textures (jpg, png)
 * @param  {[String]} 		 filename name of file to load
 * @param  {String} type     type of loader to use on this file (obj, mtl, txt)
 * @return {[type]}          3DObject - may be Model, texture or material
 */
function load_asset(filename, type = 'obj'){
	const loader_type = {'obj': THREE.OBJLoader2, 'mtl': THREE.MTLLoader, 'txt': THREE.TextureLoader};
	return new Promise((resolve, reject) => {
		let loader = new loader_type[type]();
		loader.load(filename, (object) =>{
			console.log("successfully loaded " + filename);
			resolve(object);
		}, null, (err)=>{
			reject("loading " + filename + " FAILED: " + err);
		});
	});
}

function copy(file1, location){
	return new Promise((res, rej) =>{
		fs.copy(file1, location, ()=>{
			res();
		});
	});
}

function mkdir(dir){
	return new Promise((res, rej) =>{
		if(!fs.exists(dir)){
			fs.mkdir(dir, (err)=>{
					if(err != null)
						rej();
					res();
			});
		}
		else
			rej(dir + ' exists!');
	});
}

function rename(old_path, new_path){
	return new Promise((res, rej) => {
		if(fs.exists(old_path)){
			fs.rename(old_path, new_path, (err)=>{
				if(err != null)
					rej('error occured' + err);
				else
					res('renamed ' + old_path + ' to ' + new_path);
			});
		}
	});
}

function rmdir(dir){
	return new Promise((res, rej) =>{
	if(fs.exists(dir))
		fs.remove(dir, ()=>{
			console.log(dir + " removed");
			res();
		});
	})
}

function zipFolder(dir, name, files, path = "contents"){
	return new Promise((res)=>{
		console.log(files);
		let zip = new JSZip();
		let folder = zip.folder(path);
		for(let x = 0; x < files.length; x++){
			let contents = fs.readFileSync(dir + files[x])
			folder.file(files[x], contents, {binary:true});
		}
		res(zip.generateAsync({type: "uint8array"}).then((data)=>{
			fs.writeFileSync(name, data);
		}));
	});
}

function exists(file)
{
	return fs.existsSync(file);
}