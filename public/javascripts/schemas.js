(function() {
	var root = this;
	var schemas = {};

	schemas.definitions = {
		item_equips: {
			layer: function(itemEquip) {
				var subcategory = itemEquip.subcategory || itemEquip.attr("data-item-subcategory");
				return ((subcategory === "back" ||
					subcategory === "tail" ||
					subcategory === "background" ||
					subcategory === "wings") ? "back" : "front");
			}
		}
	};
	
	root.schemas = schemas;

}.call(this));