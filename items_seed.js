db = new Mongo().getDB("renasistest");
db.item_blueprints.drop();
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "base", 
	name: "human1", 
	varieties: ["human1"], 
	poses: {
		"arm_above" : { 
			"0" : { 
				"offset": [31, 63] } }, 
		"head" : { 
			"0" : { 
				"offset": [15, 38] } }, 
		"torso" : {
			"0" : {
				"offset" : [21, 60] } },
		"leg_above" : {
			"0" : {
				"offset" : [28, 76] } },
		"leg_behind" : {
			"0" : {
				"offset" : [18, 75] } },
		"arm_behind" : { 
			"0" : { 
				"offset": [17, 63] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "hair", 
	name: "mermaid", 
	varieties: ["aquamarine"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [8, 35] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "hair", 
	name: "miko", 
	varieties: ["pink"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [10, 37] } }, 
		"behind" : { 
			"0" : { 
				"offset" : [13, 36] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "hair", 
	name: "static", 
	varieties: ["blue", "black"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [12, 35] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "face", 
	name: "unimpressed", 
	varieties: ["yellow"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [18, 50] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "head", 
	name: "fox_ears", 
	varieties: ["red"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [32, 34] } }, 
		"behind" : { 
			"0" : { 
				"offset" : [12, 34] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "head", 
	name: "roses", 
	varieties: ["red"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [31, 37] } }, 
		"behind" : { 
			"0" : { 
				"offset" : [12, 37] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "top", 
	name: "tank_top", 
	varieties: ["aqua"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [20, 67] } },
		"above_a" : { 
			"0" : { 
				"offset" : [25, 63] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "top", 
	name: "sweater", 
	varieties: ["salmon"], 
	poses: {
		"above_a" : { 
			"0" : { 
				"offset" : [17, 63] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "top", 
	name: "shirt", 
	varieties: ["black"], 
	poses: { 
		"above_a" : { 
			"0" : { 
				"offset" : [30, 64] } },
		"above_b" : { 
			"0" : { 
				"offset" : [20, 65] } },
		"above_c" : { 
			"0" : { 
				"offset" : [21, 64] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "back", 
	name: "wings", 
	varieties: ["periwinkle"], 
	poses: { 
		"back" : { 
			"0" : { 
				"offset" : [8, 42] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "bottom", 
	name: "jeans", 
	varieties: ["navy"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [20, 76] } } } });
db.item_blueprints.insert({ 
	category: "clothing", 
	subcategory: "feet", 
	name: "sneakers", 
	varieties: ["red"], 
	poses: { 
		"above_b" : { 
			"0" : { 
				"offset" : [18, 87] } } } });
db.characters.drop();
db.characters.insert({ 
	"name" : "Perplexi", 
	"user_id" : db.users.findOne({ "username" : "god" })._id, 
	"outfit_wip" : { 
		"equip_attrs" : {
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
	} 
});

var item_blueprints = db.item_blueprints.find().toArray();
db.items.drop();
var items = [];
for (var i = 0; i < item_blueprints.length; i++) {
	var item_blueprint = item_blueprints[i];
	var item = {
		_id : new ObjectId(),
		name : item_blueprint.name,
		category : item_blueprint.category,
		subcategory : item_blueprint.subcategory,
		varieties : item_blueprint.varieties,
		poses : item_blueprint.poses,
		blueprint_id: item_blueprint._id
	};
	db.items.insert(item);
	items.push(item);
}

db.users.update({ "username" : "god" }, { "$set" : { "inventory" : items }});