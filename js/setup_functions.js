const fs = require('fs-extra')
const xml2js = require('xml2js')
var THREE = require('three') // TODO: check if libraries already included
require('./js/LoaderSupport.js')
require('./js/OBJLoader2.js')
const JSZip = require('jszip')
const StreamZip = require('node-stream-zip')
const ModelFactory = require('./js/ModelFactory')

function retrieve_from_dict(dict, index){
	for (const[key, value] of Object.entries(dict)){
		if(index == 0)
			return value;
		else 
			index--;
	}
}

function texture_db_check(){
	if(!fs.existsSync('textures/att_bonus_armor_tag_diff.JPG'))
		ipcRenderer.send('load_rebuild_window', [ROOT_PATH, TEXTURE_PATH]);
	else
		ipcRenderer.send('resume');
}

// load configuration file, or create a default one
function config(){
	if(fs.existsSync(CONFIG_PATH)){
		let data = JSON.parse(fs.readFileSync(CONFIG_PATH));
		return data;
	}
	else{
		let data = {'SKIN_MODEL_PATH': 'resources/app.asar/materials/', 'FPS': 30,
					 'EXPORT_DIR': 'exported/kcd_custom_head/', 'OBJ_MODEL_PATH': 'resources/app.asar.unpacked/models/',
					 'MATERIAL_PATH': 'resources/app.asar/materials/', 'SHOW_TEXTURLESS_HEADS': true, 'ROOT_PATH': "", 'TEXTURE_PATH': "textures/"};
		fs.writeFileSync('config.json', JSON.stringify(data));
		return data;
	}
}

function writeAsync(filename, data){
	fs.writeFile(filename, data);
}

/**
 * The base game comes with a table that contains the necessary materials for models in the game. This parses through the table and extracts each material name.
 * Additionally, it maps each material to a model
 * @param  {[type]} table_location [location of xml table concerned with the model heads]
 * @param  {[type]} mat_path       [path to store materials]
 * @return {[type]}                [results in the list of materials and matching models]
 */
function create_mtl_database(table_location, mat_path = MATERIAL_PATH){
	return new Promise((res, rej) =>{
		let parser = new xml2js.Parser();
		let data = fs.readFileSync(table_location);
		var model_list = {};
		parser.parseString(data, (err, data) =>{
			// add error check?
			let relevant_data = data.database.table[0]['rows'][0].row;
			for(let x = 0; x < relevant_data.length; x++){
				let model_name = relevant_data[x]['$']['model'], mat_location = mat_path + relevant_data[x]['$'].material + '.mtl';
				model_list[model_name] = ModelFactory.generateModel(OBJ_MODEL_PATH, [], mat_location, model_name + '_lod1.obj', model_name, false);
			}
			res(model_list);
		});
	});
}

/**
 * Using the previously created database of materials, this function parses the necessary materials to retrieve which textures are needed
 * for each model head.
 * @param  {[type]} filelist [list of meterials]
 * @return {[type]}          [list of ModelInfo objects]
 */
function create_texture_database(infolist){
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
		var model_textures = {'model':{}, 'head':{}, 'eyes':{}, 'mouth':{}, 'beard':{}, 'hair':{}};
		for(const[name, model_info] of Object.entries(infolist)){
			let parse = true, data = null;
			try{
				console.log("loading " + name + " texture dependencies");
				data = fs.readFileSync("resources/app.asar/" + model_info.material_path); // change for production
			}catch (err){
				console.log("error parsing mtl file" + err);
				parse = false;
			}
			if(parse){
				parser.parseString(data, (err, data)=>{
					try{
						console.log('extracting from: ' + model_info.material_path);
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
							if(texture_type == 'head' || texture_type == 'eyes' || texture_type == 'mouth' || texture_type == 'beard' || texture_type == 'hair')
								model_info.addTexturePath(img_name  + ".jpg");
						}
					} catch(err){
						console.log(err);
					}
			});}
		}
		resolve();
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
	directory = directory.match(/(.*)\//i)[1];
	let files = fs.readdirSync(directory), relevant_files = [];
	for(let x = 0; x < files.length; x++){
		if(files[x].match(re) != null){
			let tmp = (include_path) ? directory + '/' + files[x] : files[x];
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
	console.log('loading ' + filename);
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
		fs.ensureDir(dir, (err)=>{
				if(err != null)
					rej();
				res();
		});
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
	else
		res();
	})
}

function zipFolder(dir, name, files, path = "contents"){
	return new Promise((res)=>{
		let zip = new JSZip();
		let folder = zip.folder(path);
		for(let x = 0; x < files.length; x++){
			let contents = fs.readFileSync(dir + files[x])
			folder.file(files[x], contents, {binary:true});
		}
		zip.generateAsync({type: "uint8array"}).then((data)=>{
			fs.writeFileSync(name, data);
			res();
		});
	});
}

function exists(file)
{
	return fs.existsSync(file);
}

function extractFrom(archive_path, file_path, new_file)
{
	return new Promise((res, rej) => {
		let zip_stream = new StreamZip({file: archive_path, store_entries: true});
		zip_stream.on('ready', () =>{
			zip_stream.extract(file_path, new_file, (err,count) => {
				console.log('extracted ' + archive_path + '/' + file_path);
				(count == 0) ? rej('Extract error') : res('Extracted');
				zip_stream.close();
			 });
		});
	});
}