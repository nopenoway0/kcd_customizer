function load_model(scene, materials = "henry.mtl", model_name = "henry_load1.obj", name = "Henry")
{
	return new Promise((sucess, failuer) =>{
	let obj_loader = new THREE.OBJLoader2(manager);
	obj_loader.setModelName("Henry")
	var model;
	let mtl_loader = new THREE.MTLLoader()
	mtl_loader.load("henry.mtl", (mtl) => {
			obj_loader.setMaterials(mtl);
			obj_loader.load("henry_lod1.obj", (object) => {
			model = object.detail.loaderRootNode;
			base_direction = model.getWorldDirection();
			scene.add(model);
			sucess(model);
		}, null, null)}, null, null, null);});
}