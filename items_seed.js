db = new Mongo().getDB("renasistest");
db.items.drop();
db.items.insert({ 
	category: "clothing", 
	subcategory: "base", 
	name: "base", 
	varieties: ["1"], 
	poses: {
		"front_arm" : { 
			"0" : { 
				"offset": [31, 63] } }, 
		"head" : { 
			"0" : { 
				"offset": [15, 38] } }, 
		"torso" : {
			"0" : {
				"offset" : [21, 60] } },
		"front_leg" : {
			"0" : {
				"offset" : [28, 76] } },
		"back_leg" : {
			"0" : {
				"offset" : [18, 75] } },
		"back_arm" : { 
			"0" : { 
				"offset": [17, 63] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "hair", 
	name: "mermaid", 
	varieties: ["aquamarine"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [8, 35] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "hair", 
	name: "miko", 
	varieties: ["pink"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [10, 37] } }, 
		"back" : { 
			"0" : { 
				"offset" : [13, 36] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "hair", 
	name: "static", 
	varieties: ["blue", "black"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [12, 35] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "head", 
	name: "fox_ears", 
	varieties: ["red"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [32, 34] } }, 
		"back" : { 
			"0" : { 
				"offset" : [12, 34] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "head", 
	name: "roses", 
	varieties: ["red"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [31, 37] } }, 
		"back" : { 
			"0" : { 
				"offset" : [12, 37] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "top", 
	name: "tank_top", 
	varieties: ["aqua"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [20, 67] } },
		"front_a" : { 
			"0" : { 
				"offset" : [25, 63] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "top", 
	name: "sweater", 
	varieties: ["salmon"], 
	poses: {
		"front_a" : { 
			"0" : { 
				"offset" : [17, 63] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "top", 
	name: "shirt", 
	varieties: ["black"], 
	poses: { 
		"front_a" : { 
			"0" : { 
				"offset" : [30, 64] } },
		"front_b" : { 
			"0" : { 
				"offset" : [20, 65] } },
		"front_c" : { 
			"0" : { 
				"offset" : [21, 64] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "back", 
	name: "wings", 
	varieties: ["periwinkle"], 
	poses: { 
		"back" : { 
			"0" : { 
				"offset" : [8, 42] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "bottom", 
	name: "jeans", 
	varieties: ["navy"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [20, 76] } } } });
db.items.insert({ 
	category: "clothing", 
	subcategory: "feet", 
	name: "sneakers", 
	varieties: ["red"], 
	poses: { 
		"front_b" : { 
			"0" : { 
				"offset" : [18, 87] } } } });
db.characters.update({}, { "$set" : { "equipped_ids" : [] }});
var subcategories = db.items.distinct('subcategory');
var subcategoryItems = {};
for (var i = 0; i < subcategories.length; i++) {
	var res = db.items.find({ "subcategory" : subcategories[i] }, { _id: 1 }).toArray();
	var resIds = [];
	for (var j = 0; j < res.length; j++) {
		resIds[j] = res[j]._id;
	}
	subcategoryItems[subcategories[i]] = resIds;
}

db.users.update({ "username" : "god" }, { "$set" : { "inventory" : { "clothes" : subcategoryItems }}});