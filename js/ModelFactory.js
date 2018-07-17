const ModelInfo = require('./ModelInfo')


class ModelInfoFactory{

	constructor(model_path, textures, material_path, model_name = "", name = "", includes_name = true, extension_re = /.*\.obj/i){
		return ModelFactory.generateModel(model_path, textures, material_path, model_name = "", name = "", includes_name = true, extension_re = /.*?\.obj/i);
	}

	static generateModel(model_path, textures, material_path, model_name = "", name = "", includes_name = true, extension_re = null){
		if(includes_name)
		{
			const model_path_re = /(.*\/).*?/i, name_re = /(.*)\..*$/i;
			let match = model_path.match(/.*\/(.*?)$/i);
			if(match)
				model_name = match[1];
			var name = model_name.match(name_re);
			name = (name != null) ? name[1] : model_name;
			model_path = model_path.match(model_path_re)[1]; // set to path without name
		}
		return new ModelInfo(model_path, textures, material_path, model_name, name);	
	}
}

module.exports = ModelInfoFactory;