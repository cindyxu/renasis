module.exports = function(utils) {

	return {
		getAttack: function(entity) {
			return entity.str + _.reduce(
				_.map(entity.battlegears, 
					function(b) { return b.str_boost; }), 
				function(a, b) { return a + b; }
			);
		},

		getDefense: function(entity) {
			return entity.def + _.reduce(
				_.map(entity.battlegears, 
					function(b) { return b.vit_boost; }), 
				function(a, b) { return a + b; }
			);
		}
	};
	
};