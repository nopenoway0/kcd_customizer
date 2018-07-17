const BinaryFile = require('binary-file')
/**
 * Apply morph changes to the physical geometry. Morph targets are stored base do influence and morph vertices. This is applied
 * using 	summation series(morph += (morphTarget - pos) * Influence) and the result of the series is added to each vertex position
 * None of these are actually applied to model until thie function is ran
 * @param  {[type]} model model to apply all morph targets to
 */
function applyMorphs(model){
	// update vertices to morph poisition?
	return new Promise((res) =>{
		model.dynamic = true;
		var morphsum = []
		var position_vectors = [];
		for(let m = 0; m < model.children.length; m++){
			let mesh = model.children[m].geometry;
			morphsum.push([]);
			position_vectors.push([])
			let position = mesh.attributes.position;
			for(let x = 0; x < position.array.length; x+=3)
			{
				position_vectors[m].push(new THREE.Vector3(position.array[x],position.array[x + 1],position.array[x + 2]));
				morphsum[m].push(new THREE.Vector3());
			}
		}


		for(let m_index = 0; m_index < model.children.length; m_index++){
			let mesh = model.children[m_index].geometry;
			for(let m = 0; m < mesh.morphAttributes.position.length; m++){
				let influence = model.children[m_index].morphTargetInfluences[m];
				for(let x = 0; x < mesh.morphAttributes.position[m].array.length; x += 3){
					morphPositions = new THREE.Vector3(mesh.morphAttributes.position[m].array[x], mesh.morphAttributes.position[m].array[x + 1],mesh.morphAttributes.position[m].array[x + 2]);
					morphsum[m_index][x / 3] = morphsum[m_index][x / 3].add(morphPositions.sub(position_vectors[m_index][x / 3]).multiplyScalar(influence)); 
				}
			}
		}


		for(let m = 0; m < model.children.length; m++){
			let mesh = model.children[m].geometry;
			for(let x = 0; x < mesh.attributes.position.array.length; x+= 3){
				mesh.attributes.position.array[x] = position_vectors[m][x / 3].x  + morphsum[m][x / 3].x;
				mesh.attributes.position.array[x + 1] = position_vectors[m][x / 3].y + morphsum[m][x / 3].y;
				mesh.attributes.position.array[x + 2] = position_vectors[m][x / 3].z + morphsum[m][x / 3].z;
			}
			mesh.attributes.position.needsUpdate = true;
		}
		res();
	})
}

function retrieve_from_dict(dict, index){
	for (const[key, value] of Object.entries(dict)){
		if(index == 0)
			return value;
		else 
			index--;
	}
}
/**
 * Store all vertices from model into a list
 * @param  {[type]} list  Empty list to hold model vertices
 * @param  {[type]} model Model whose vertices you want to store
 */
function store_vertices(list, model){
	return new Promise((res) =>{
		for(let x = 0; x < model.children.length; x++){
			let mesh = model.children[x].geometry;
			for(let y = 0; y < mesh.attributes.position.array.length; y++)
				list.push(mesh.attributes.position.array[y]);
		}
		res();
	})
}

function put_vertices_in_model(list, model, refresh_verts = true){
	return new Promise((res) =>{
		let count = 0;
		for(let x = 0; x < model.children.length; x++){
			let mesh = model.children[x].geometry;
			if(count > list.length)
				return;
			for(let y = 0; y < mesh.attributes.position.array.length; y++){
				mesh.attributes.position.array[y] = list[count];
				count++;
			}
			mesh.attributes.position.needsUpdate = true;
		}
		res();
	})
}
/**
 * Takes the vertices from an array (intended to be the original coordinates of the model before any transforms)
 * and stores them in the following order [original point][new point]... throughout the file. array of vertices is consumed during this function
 * because of shift calls
 * @param  {[type]} og_verts [list of original vertices]
 * @param  {[type]} model    [parent of meshes that contain the new vertices]
 */
function writeVertsFileModel(filename, og_verts, model, callback){
	return new Promise((res) =>{
		let LE = (os.endianness() == 'LE') ? true : false;
		let bin = new BinaryFile(filename, "w", LE);
		let counter = 0;
		bin.open().then(()=>{
			(async function(){
				for(let m = 0; m < model.children.length; m++){
					let mesh = model.children[m].geometry;
					for(let x = 0; x < mesh.attributes.position.array.length; x++){
						if((x + 1) % 3 == 0) // necessary transformation to restore to original orientation on z axis
								og_verts[0] = og_verts[0] * -1;
						let bytes = await bin.writeFloat(og_verts.shift());
						bytes = await bin.writeFloat(mesh.attributes.position.array[x]);
						if((x + 1) % 3 == 0){
							counter+=1;
							if(callback != null)
								callback(counter);
						}
					}
				}
				return Promise.resolve()
			})().then(() =>{
				bin.close()
				res();
			});
		})
	});
}

/**
 * Write a vertex file. This version takes two arrays of vertices that must be equal length and writes them 
 * to a verts file described above. No arrays are consumed in this version
 * @param  {[type]} filename  name of file
 * @param  {[type]} og_verts  list of original unmorphed vertices
 * @param  {[type]} new_verts list of new vertices
 */
function writeVertsFileArrays(filename, og_verts, new_verts){
	return new Promise((res) =>{
		let LE = (os.endianness() == 'LE') ? true : false;
		let bin = new BinaryFile(filename, "w", LE);
		bin.open().then(()=>{
			(async function(){
				if(og_verts.length != new_verts.length)
					res(NaN);
				else
					for(let x = 0; x < og_verts.length; x++){
						if((x + 1) % 3 == 0)
							await bin.writeFloat(og_verts[x] * -1); // flip along axis
						else
							await bin.writeFloat(og_verts[x]);
						await bin.writeFloat(new_verts[x]);
					}
				return Promise.resolve()
			})().then(() =>{
				bin.close()
				res();
			});
		})
	});
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