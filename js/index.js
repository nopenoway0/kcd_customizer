const fs = require('fs-extra')
const xml2js = require('xml2js')
var THREE = require('three') // TODO: check if libraries already included
require('./js/LoaderSupport.js')
require('./js/OBJLoader2.js')
require('./js/GLTFLoader.js')
const JSZip = require('jszip')
const StreamZip = require('node-stream-zip')
const ModelFactory = require('./js/ModelFactory')

const CONFIG_PATH = "config.json";
const os = require('os')
let configuration = config();
// run initial setup
// set where to find default game models and mats, set fps, and necessary delay to achieve delay
// and exported model directory
const SKIN_MODEL_PATH = configuration['SKIN_MODEL_PATH'], FPS = configuration['FPS'], DELAY = 1000 / FPS, EXPORT_DIR = configuration['EXPORT_DIR'];
const OBJ_MODEL_PATH = configuration['OBJ_MODEL_PATH'], MATERIAL_PATH = configuration['MATERIAL_PATH'], SHOW_TEXTURLESS_HEADS = configuration['SHOW_TEXTURLESS_HEADS'], TEXTURE_PATH = configuration['TEXTURE_PATH'];
var ROOT_PATH = configuration['ROOT_PATH'];

var model = null, model_info_list = [], og_verts = [];
var current_rotation = 50, scene = new THREE.Scene(), screen_loaded = false;

// TODO: change 1 morph to CPU computation, limit has been reached
// set slide to rotate displayed model
window.onload = () => {
	ipcRenderer.on('request-paths', (event, data) =>{
		console.log("request paths received sending: " + [ROOT_PATH, TEXTURE_PATH])
		event.sender.send('paths', [ROOT_PATH, TEXTURE_PATH]);
	});

	let slider = document.getElementById("rotate-head");
	slider.oninput = function() {
		current_rotation = this.value;
	};

	document.getElementById("morph-forehead").oninput = function(){
		performMorph(model, "Brow Depth", this.value);
	};

	document.getElementById("morph-jaw-height").oninput = function(){
		performMorph(model, "Jaw Height", this.value);
	};

	document.getElementById("morph-jaw-width").oninput = function(){
		performMorph(model, "Jaw", this.value);
	};

	document.getElementById("morph-face-width").oninput = function(){
		performMorph(model, "Face Width", this.value);
	};

	document.getElementById("morph-face-height").oninput = function(){
		performMorph(model, "Face Height", this.value);
	};

	document.getElementById("morph-nose-depth").oninput = function(){
		performMorph(model, "Nose Depth", this.value);
	};

	document.getElementById("morph-nose-width").oninput = function(){
		performMorph(model, "Nose Width", this.value);
	};

	document.getElementById("morph-chin-height").oninput = function(){
		performMorph(model, "Chin Height", this.value);
	};

	document.getElementById("morph-chin-depth").oninput = function(){
		performMorph(model, "Chin Depth", this.value);
	};
	// capture loaded root path from setup window. Store it in this runtime and write it to the configuration file
	// then begin initialization. Otherwise just start initializating
	if(ROOT_PATH.length == 0){
		ipcRenderer.on('directory_set', (sender, path) =>{
			ROOT_PATH = path;
			configuration['ROOT_PATH'] = ROOT_PATH;
			writeAsync(CONFIG_PATH, JSON.stringify(configuration));
		});
		first_time_setup().then(() => init())
	}
	else
		init();
	ipcRenderer.on('resume', (sender, data) =>{
		init();
	})
};

// start initialization for rendering
function init(){
	// create basics for scene
	var light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
	var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
	var renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight);
	document.body.appendChild( renderer.domElement );
	next('head');
	scene.add( light );
	camera.position.y = .28, camera.lookAt(0,0,0), camera.position.z = 1.6, camera.rotateZ(3.14);
	// start rendering at a set delay speed
	(function startRendering(){
		setTimeout(() => {
			// if model is not null or undefined, get slider value, calculate radians of rotation
			if(model != null && model != undefined){
				for(let x = 0; x < model.children.length; x++)
					model.children[x].setRotationFromAxisAngle(new THREE.Vector3(0,1,0), 2*3.14 * ((current_rotation - 50) / 100.0));
			}
			renderer.setSize(window.innerWidth, window.innerHeight); // TODO: check how inefficient this is
			renderer.render(scene, camera);
			startRendering();
		}, DELAY);
	})();
	screenLoaded();
}


function next(type = 'head'){
	load_asset(/*'../../' +*/ OBJ_MODEL_PATH + 'henry.gltf', 'gltf').then((result) =>{
		console.log("result");
		console.log(result);
		model = result.scene.children[0];
		og_verts = [];
		store_vertices(og_verts, model);
		scene.add(result.scene.children[0]);
	});

};

// unhide camera control elements and hide the progress bar
function screenLoaded(){
	if(screen_loaded)
		return;
	document.getElementById('loading-bar').style.width = 100 + '%';
	document.getElementById('loading-div').style.display = "none";
	document.getElementById('camera-controls').hidden = false;
	document.getElementById('part-controls').hidden = false;
	screen_loaded = true;
}

function prev(type){
}

async function exportHead(button){
	button.classList.add('loading');
	await applyMorphs(model);

	// rotate 90* as model gets rotated when exported from blender
	for(let m = 0; m < model.children.length; m++){
		let mesh = model.children[m].geometry;
		for(let x = 0; x < mesh.attributes.position.array.length; x+= 3){
			let tmp = mesh.attributes.position.array[x + 1];
			//mesh.attributes.position.array[x]
			mesh.attributes.position.array[x + 1] = mesh.attributes.position.array[x + 2] * -1;
			mesh.attributes.position.array[x + 2] = tmp;
		}
		mesh.attributes.position.needsUpdate = true;
	}
	let og_verts_copy = await og_verts.slice(0);
	let result = await writeVertsFileModel('henry.verts', og_verts_copy, model);
	await put_vertices_in_model(og_verts, model);
	button.classList.remove('loading');
}


function performMorph(model_group, type, value){
	if(model_group != null && model_group != undefined){
		for(let x = 0; x < model_group.children.length; x++){
			model_group.children[x].morphTargetInfluences[model_group.children[x].morphTargetDictionary[type]] = (value - 50) / 50 
		}	
	}
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
	const loader_type = {'obj': THREE.OBJLoader2, 'mtl': THREE.MTLLoader, 'txt': THREE.TextureLoader, 'gltf': THREE.GLTFLoader};
	return new Promise((resolve, reject) => {
		let loader = new loader_type[type]();
		loader.load(filename, (object) =>{
			console.log("successfully loaded " + filename);
			console.log(object);
			if(type == 'obj')
				resolve(object.detail.loaderRootNode)
			else
				resolve(object);
		}, null, (err)=>{
			console.log("error: " + err);
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