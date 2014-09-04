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

	var dbChars = db.get("characters");
	var dbItems = db.get("items");
	
	var charHelper = utils.charHelper;
	var itemHelper = utils.itemHelper;
	var constants = utils.constants;
	
	var charExport = {};

	charExport.dressroom = function(req, res) {
		dbChars.findOne({}, function(err, charObj) {
			charHelper.fetchWardrobeSubcategoryItemObjs(charObj, constants.DEFAULT_WARDROBE_CATEGORY, function(wardrobeItemObjs) {
				charHelper.fetchOutfitItemObjs(charObj.outfit_wip, function() {
					charHelper.markItemsInOutfit(wardrobeItemObjs, charObj.outfit_wip);
					res.render('dressroom', { title: 'Express', "character": charObj, "wardrobe" : wardrobeItemObjs });
				});
			});
		});
	};

	// TAKES IN: item_id, (char_id)
	// RETURNS: avatar_img_path, character, removed
	charExport.toggleEquipItem = function(req, res) {
		var itemId = req.body.item_id;
		dbChars.findOne({}, function(err, charObj) {
			dbItems.findById(itemId, function(err, itemObj) {
				var callback = function(charObjNew, results) {
					charHelper.fetchOutfitItemObjs(charObjNew.outfit_wip, function() {
						charHelper.compAvatar(charObjNew.outfit_wip.pose, charObjNew.outfit_wip.equip_attrs, function() {
							res.send({ "avatar_img_path" : "images/testout.png", "character" : charObjNew, "results" : results });
						});
					});
				};
				if (req.body.equip_attrs) {
					charHelper.equipItemWip(charObj, itemObj, req.body.equip_attrs, callback);
				}
				else {
					charHelper.unequipItemWip(charObj, itemObj, callback);
				}
			});	
		});
	};

	charExport.getWardrobeSubcategoryItems = function(req, res) {
		dbChars.findOne({}, function(err, charObj) {
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