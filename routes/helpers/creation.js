module.exports = function(utils) {

	var constants = utils.constants;
	var creationHelper = {};
	
	creationHelper.blankOutfit = function() {
		return {
			"layers" : {
				"front" : [],
				"back" : []	
			},
			"pose" : {
				"above_a" : "0",
				"above_b" : "0",
				"above_c" : "0",
				"behind" : "0",
				"back" : "0"
			}
		};
	};

	creationHelper.blankCharacter = function() {
		return { 
			"outfits" : {
				"wip" : creationHelper.blankOutfit(),
				"current" : creationHelper.blankOutfit()
			}
		};
	};

	return creationHelper;
};