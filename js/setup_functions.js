var fs = require('fs-extra')
var xml2js = require('xml2js')
var THREE = require('three')
require('./js/LoaderSupport.js')
require('./js/OBJLoader2.js')
var JSZip = require('jszip')

function create_texture_database(filelist)
{
	return new Promise((resolve, reject) => {
		let parser = new xml2js.Parser();
		let re = /.*\/(.*)\..*$/i
		var model_textures = {'model':[], 'head':{}, 'eyes':{}, 'mouth':{}, 'beard':{}, 'hair':{}};
		for(var x = 0; x < filelist.length; x++){
			let data = fs.readFileSync(filelist[x]);
			let mats = [];
			parser.parseString(data, (err, data)=>
			{
				try{
				console.log('extracting from: ' + filelist[x]);
				var materials = data["Material"]["SubMaterials"][0]["Material"];
				for(var y = 0; y < materials.length; y++)
				{
					if(materials[y]['$'].Name == 'head' || materials[y]['$'].Name == 'eyes' || materials[y]['$'].Name == 'mouth' || materials[y]['$'].Name == 'beard' || materials[y]['$'].Name == 'hair')
					{
						mats.push('textures/' + materials[y]["Textures"][0]["Texture"][0]['$'].File.match(re)[1] + ".jpg");
						model_textures[materials[y]['$'].Name]['textures/' + materials[y]["Textures"][0]["Texture"][0]['$'].File.match(re)[1] + ".jpg"] = true;
					}
				}
				} catch(err)
				{
					return;
				}
				model_textures['model'].push(mats);	
			});
		}
		resolve(model_textures);
	});
}

function load_model(scene, materials = "henry/henry.mtl", model_name = "henry_lod1.obj", texture_name = null, name = "Henry")
{
	return new Promise((sucess, failuer) =>{
	let obj_loader = new THREE.OBJLoader2(manager);
	obj_loader.setModelName("Henry")
	var model;
	let mtl_loader = new THREE.MTLLoader()
	mtl_loader.load(materials, (mtl) => {
			obj_loader.setMaterials(mtl);
			obj_loader.load(model_name, (object) => {
			model = object.detail.loaderRootNode;
			base_direction = model.getWorldDirection();
			if(texture_name != null)
			{
				let text_loader = new THREE.TGALoader();
				text_loader.load(texture_name, (texture) =>{
					var material = new THREE.MeshPhongMaterial({map: texture});
					model.traverse(function(child) {
				   		if (child instanceof THREE.Mesh)
				        	child.material = material;
			    	});
				});
			}
			scene.add(model);
			sucess(model);
		}, null, null)}, null, null, null);});
}

function get_file_list(directory, re, include_path = true)
{
	let files = fs.readdirSync(directory);
	var relevant_files = [];
	for(var x = 0; x < files.length; x++)
	{
		if(files[x].match(re) != null)
		{
			let tmp = (include_path) ? directory + files[x] : files[x];
			relevant_files.push(tmp);
		}
	}
	return relevant_files;
}

function load_asset(filename, type = 'obj', params = null){
	return new Promise((resolve, reject) => {
	let loader = null;
	if(type == 'obj')
	{
		loader = new THREE.OBJLoader2()
		if(params != null)
		{
			console.log("set params");
			loader.setMaterials(params);
		}
	}
	else if(type == 'mtl')
		loader = new THREE.MTLLoader();
	else
		loader = new THREE.TextureLoader();

	loader.load(filename, (object) =>
	{
		console.log("successfully loaded " + filename);
		resolve(object);
	}, null, (err)=>
	{
		console.log("loading " + filename + " FAILED: ");
		console.log(err);
		reject(err);
	});
	});
}

function copy(file1, location)
{
	return new Promise((res, rej) =>{
		fs.copy(file1, location, ()=>{
			res();
		});
	});
}

function mkdir(dir)
{
	return new Promise((res, rej) =>{
		if(!fs.exists(dir))
		{
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

function rename(old_path, new_path)
{
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

function rmdir(dir)
{
	return new Promise((res, rej) =>{
	if(fs.exists(dir))
		fs.remove(dir, ()=>{
			console.log(dir + " removed");
			res();
		});
	})
}

function zipFolder(dir, name, files, path = "contents")
{
	return new Promise((res)=>{
	console.log(files);
	let zip = new JSZip();
	let folder = zip.folder(path);
	for(let x = 0; x < files.length; x++){
		let contents = fs.readFileSync(dir + files[x])
		folder.file(files[x], contents, {binary:true});
	}
	res(zip.generateAsync({type: "uint8array"}).then((data)=>{
		console.log('trying to write to file');
		fs.writeFileSync(name, data);
	}));
	});
}