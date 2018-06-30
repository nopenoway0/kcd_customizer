const ModelInfo = require('./ModelInfo')


class ModelInfoFactory{

	constructor(model_path, textures, material_path, model_name = "", name = "", includes_name = true, extension_re = /.*\.obj/i){
		return ModelFactory.generateModel(model_path, textures, material_path, model_name = "", name = "", includes_name = true, extension_re = /.*\.obj/i);
	}

	static generateModel(model_path, textures, material_path, model_name = "", name = "", includes_name = true, extension_re = /.*\.obj/i){
		if(includes_name)
		{
			const model_path_re = /(.*\/).*?/i
			let match = model_name.match(extension_re);
			if(match)
				model_name = match[0];
			/*else
				throw err("path doesn't contain filename with extension");*/
			model_path = model_path.match(model_path_re)[1]; // set to path without name
		}
		return new ModelInfo(model_path, textures, material_path, model_name, name);	
	}
}

module.exports = ModelInfoFactory;