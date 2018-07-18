
const fs = require('fs-extra')
const xml2js = require('xml2js')
var THREE = require('three') // TODO: check if libraries already included
require('./js/LoaderSupport.js')
require('./js/GLTFLoader.js')
const JSZip = require('jszip')
const StreamZip = require('node-stream-zip')
const ModelFactory = require('./js/ModelFactory')
const {execFileSync} = require("child_process")
const CONFIG_PATH = "config.json";
const os = require('os')
let configuration = config();

// run initial setup
// set where to find default game models and mats, set fps, and necessary delay to achieve delay
// and exported model directory
const SKIN_MODEL_PATH = configuration['SKIN_MODEL_PATH'], FPS = configuration['FPS'], DELAY = 1000 / FPS, EXPORT_DIR = configuration['EXPORT_DIR'];
const OBJ_MODEL_PATH = configuration['OBJ_MODEL_PATH'], MATERIAL_PATH = configuration['MATERIAL_PATH'], SHOW_TEXTURLESS_HEADS = configuration['SHOW_TEXTURLESS_HEADS'], TEXTURE_PATH = configuration['TEXTURE_PATH'];
var ROOT_PATH = configuration['ROOT_PATH'];
var model_names = ["henry.gltf", "s1_head_v030.gltf"]
var model = null, model_info_list = [], og_verts = [], model_index = -1;
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
	var light = new THREE.HemisphereLight(0xffffbb, 0x080820, 3);
	var camera = new THREE.PerspectiveCamera( 1, window.innerWidth/window.innerHeight, 0.1, 1000 );

	var renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight);
	document.body.appendChild( renderer.domElement );
	next('head');
	scene.add( light );
	camera.position.y = 16, camera.lookAt(0,0,0), camera.position.z = 1.6, camera.rotateZ(3.14);
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
	model_index += 1;
	if(model_index < 0)
		model_index *= -1;
	model_index = model_index % model_names.length;
	scene.remove(model);
	load_asset(OBJ_MODEL_PATH + model_names[model_index], 'gltf').then((result) =>{
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

function prev(type= "head"){
	model_index -= 2;
	next(type);
}

async function exportHead(button){
	button.classList.add('loading');
	await applyMorphs(model);
	let vertices_amt = 0;
	// rotate 90* as model gets rotated when exported from blender
	for(let m = 0; m < model.children.length; m++){
		let mesh = model.children[m].geometry;
		for(let x = 0; x < mesh.attributes.position.array.length; x+= 3){
			let tmp = mesh.attributes.position.array[x + 1];
			//mesh.attributes.position.array[x]
			mesh.attributes.position.array[x + 1] = mesh.attributes.position.array[x + 2] * -1;
			mesh.attributes.position.array[x + 2] = tmp;
			vertices_amt+=1;
		}
		mesh.attributes.position.needsUpdate = true;
	}

	$("#loading-div").progress({
		total: vertices_amt,
		text: {
			active: "Writing vertices to .verts file ({value}/{total})"
		}
	});
	document.getElementById('loading-div').style.display = "inline";


	let og_verts_copy = await og_verts.slice(0);
	await rmdir(EXPORT_DIR);
	let head_path = 'Objects/characters/humans/head/';
	try{
		await mkdir(EXPORT_DIR + 'Data/custom_head');
		await extractFrom(ROOT_PATH + "IPL_Heads.pak",  head_path + 'henry.skin', './' + EXPORT_DIR + 'Data/custom_head');
		// TODO: use callback for loading bar
		await writeVertsFileModel(EXPORT_DIR + 'Data/custom_head/' + "henry.verts", og_verts_copy, model, (cur_vert) =>{
			$('#loading-div').progress('increment');
		});
	}catch(e){
		alert(e);
	}
	
	try{
		await execFileSync(path.join(path.dirname (remote.process.execPath), 'resources/app.asar.unpacked/bin/kcd_vertex_transplanter.exe'), [EXPORT_DIR + 'Data/custom_head/' + "henry.verts", EXPORT_DIR + 'Data/custom_head/' + "henry.skin"])
	}catch(e){
		if(JSON.stringify(e).search("ENOENT") != -1)
			alert(e);
	}

	await put_vertices_in_model(og_verts, model);
	await zipFolder(EXPORT_DIR + 'Data/custom_head/', EXPORT_DIR + "Data/kcd_custom_head.pak", ['henry.skin'], head_path);	
	await copy(EXPORT_DIR + 'Data/kcd_custom_head.pak', EXPORT_DIR + 'Data/__fastload/kcd_custom_head.pak')
	await rmdir(EXPORT_DIR + 'Data/custom_head')

	document.getElementById('loading-div').style.display = "none";
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
		let data = {'SKIN_MODEL_PATH': 'materials/', 'FPS': 30,
					 'EXPORT_DIR': 'exported/kcd_custom_head/', 'OBJ_MODEL_PATH': 'models/',
					 'MATERIAL_PATH': 'materials/', 'SHOW_TEXTURLESS_HEADS': true, 'ROOT_PATH': "", 'TEXTURE_PATH': "textures/"};
		fs.writeFileSync('config.json', JSON.stringify(data));
		return data;
	}
}