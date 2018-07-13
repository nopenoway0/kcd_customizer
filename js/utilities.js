const BinaryFile = require('binary-file')

function applyMorphs(model){
	// update vertices to morph poisition?
	model.dynamic = true;
	var morphsum = []
	let pos = [];
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


	// apply first morph target
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

	// store og verts
	var og_verts = [];
	for(let x = 0; x < model.children.length; x++){
		let mesh = model.children[x].geometry;
		for(let y = 0; y < mesh.attributes.position.array.length; y++)
			og_verts.push(mesh.attributes.position.array[y]);
	}

	// morph += (morphTarget - pos) * Influence
	// pos += morph to transfer new coordinates to physical verts
	for(let m = 0; m < model.children.length; m++){
		let mesh = model.children[m].geometry;
		for(let x = 0; x < mesh.attributes.position.array.length; x+= 3){
			mesh.attributes.position.array[x] = position_vectors[m][x / 3].x  + morphsum[m][x / 3].x;
			mesh.attributes.position.array[x + 1] = position_vectors[m][x / 3].y + morphsum[m][x / 3].y;
			mesh.attributes.position.array[x + 2] = position_vectors[m][x / 3].z + morphsum[m][x / 3].z;
		}
		mesh.attributes.position.needsUpdate = true;
	}
}

function retrieve_from_dict(dict, index){
	for (const[key, value] of Object.entries(dict)){
		if(index == 0)
			return value;
		else 
			index--;
	}
}

function store_vertices(list, model){
	for(let x = 0; x < model.children.length; x++){
		let mesh = model.children[x].geometry;
		for(let y = 0; y < mesh.attributes.position.array.length; y++)
			list.push(mesh.attributes.position.array[y]);
	}
}
/**
 * Takes the vertices from an array (intended to be the original coordinates of the model before any transforms)
 * and stores them in the following order [original point][new point]... throughout the file
 * @param  {[type]} og_verts [list of original vertices]
 * @param  {[type]} model    [parent of meshes that contain the new vertices]
 */
function writeVertsFile(og_verts, model){
	let LE = (os.endianness() == 'LE') ? true : false;
	let bin = new BinaryFile("file.vert", "w", LE);
	bin.open().then(()=>{
		(async function(){
			for(let m = 0; m < model.children.length; m++){
				let mesh = model.children[m].geometry;
				for(let x = 0; x < mesh.attributes.position.array.length; x++){
					if((x + 1) % 3 == 0)
						og_verts[0] = og_verts[0] * -1;
					let bytes = await bin.writeFloat(og_verts.shift());
					bytes = await bin.writeFloat(mesh.attributes.position.array[x]);
				}
			}
			console.log("finished");
			return Promise.resolve()
		})().then(() => bin.close());
	})
}