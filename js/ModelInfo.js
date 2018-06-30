class ModelInfo{
	constructor(model_location, textures, material_path, model_name = "", name = "", ){
		if(textures.length > 0)
			this.textures = [...textures];
		else
			this.textures = [];
		this.location = model_location;
		this.model_name = model_name;
		this.name = name;
		this.material_path = material_path;
	}

	addTexturePath(texture_path){
		this.textures.push(texture_path);
	}
}

module.exports = ModelInfo;