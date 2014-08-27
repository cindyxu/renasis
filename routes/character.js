/*
head
top
bottom
shoes?
back
special???

base
	hair
	eyes
	nose
	mouth
	ears
	skin
	legs/arms
*/

/* TODO: move all this to (dressing room) avatar */

module.exports = function(utils) {
	var db = utils.db;
	var gm = utils.gm;
	var Q = utils.Q;

	var dbchars = db.get("characters");
	var dbitems = db.get("items");
	
	var charHelper = utils.charHelper;
	var itemHelper = utils.itemHelper;

	var charExport = {};

	var constants = utils.constants;

	charExport.dressroom = function(req, res) {
		dbchars.findOne({}, function(err, charObj) {
			charHelper.fetchEquippedItemObjs(charObj.equipped_ids, function(equippedItemObjs) {
				charHelper.fetchWardrobeSubcategoryItemObjs(charObj, constants.DEFAULT_WARDROBE_CATEGORY, function(wardrobeItemObjs) {
					charObj.equipped = equippedItemObjs;
					res.render('dressroom', { title: 'Express', "character": charObj, "wardrobe" : wardrobeItemObjs });
				})
			});
		});
	};

	charExport.toggleEquipItem = function(req, res) {
		//generate new avatar
		var itemId = req.body.item_id;
		dbchars.findOne({}, function(err, charObj) {
			charHelper.toggleEquipItem(charObj, itemId, req.body.forceRemove, function(removed, docs) {
				charHelper.fetchEquippedItemObjs(charObj.equipped_ids, function(itemObjs) {
					charObj.equipped = itemObjs;
					charHelper.compAvatar(itemObjs, function() {
						res.send({ "avatar_img_path" : "images/testout.png", "character" : charObj, "removed" : removed });
					});
				});
			});
		});	
	};

	charExport.getWardrobeSubcategoryItems = function(req, res) {
		dbchars.findOne({}, function(err, charObj) {
			charHelper.fetchWardrobeSubcategoryItemObjs(charObj, req.params.subcategory, function(wardrobeItemObjs) {
				res.send({ "wardrobe" : wardrobeItemObjs });
			});
		});
	};
	return charExport;
};


/*
PROBLEM: outline x transparency -> black
RESOLUTION:
create a opacity mask for outline and [base + item w/o outline]
put base over white bg, multiply w/ outline
put one opacity mask over another
copy opacity from mask to composite img
god =_=
*/