module.exports = function(utils) {
	var db = utils.db;
	var gm = utils.gm;
	var Q = utils.Q;
	var _ = utils._;

	var dbChars = db.get("characters");
	var dbItems = db.get("items");
	
	var wardrobeHelper = utils.wardrobeHelper;
	var itemHelper = utils.itemHelper;
	var userHelper = utils.userHelper;
	var constants = utils.constants;
	
	var charExport = {};

	charExport.dressroom = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			dbChars.findOne({ "_id": userObj.curr_character._id }, function(err, charObj) {
				wardrobeHelper.fetchWardrobeSubcategoryItemObjs(charObj, constants.DEFAULT_WARDROBE_CATEGORY, function(wardrobeItemObjs) {
					wardrobeHelper.fetchOutfitItemObjs(charObj.outfits["wip"], function() {
						wardrobeHelper.markItemsInOutfit(wardrobeItemObjs, charObj.outfits["wip"]);
						res.render('dressroom', { title: 'Express', "character": charObj, "wardrobe" : wardrobeItemObjs });
					});
				});
			});	
		});
	};

	charExport.outfitCallback = function(res, charObjNew, results) {
		var outfitWip = charObjNew.outfits["wip"];
		wardrobeHelper.fetchOutfitItemObjs(outfitWip, function() {
			wardrobeHelper.compAvatar(outfitWip, function() {
				res.send({ "avatar_img_path" : "images/testout.png", "character" : charObjNew, "results" : results });
			});
		});
	};

	// TAKES IN: item_id, (char_id)
	// RETURNS: avatar_img_path, character, removed
	charExport.toggleEquipItem = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;

			var itemId = req.body.item_id;
			var callback = _.partial(charExport.outfitCallback, res);

			dbChars.findOne({ "_id" : userObj.curr_character._id }, function(err, charObj) {
				dbItems.findById(itemId, function(err, itemObj) {
					if (req.body.equip_desc) {
						console.log(callback);
						wardrobeHelper.equipItemInOutfit(charObj, itemObj, "wip", req.body.equip_desc, callback);
					}
					else {
						wardrobeHelper.unequipItemInOutfit(charObj, itemObj, "wip", callback);
					}
				});	
			});
		});
	};

	charExport.shiftEquippedItem = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			var itemId = req.body.item_id;
			var callback = _.partial(charExport.outfitCallback, res);
			dbChars.findOne({ "_id" : userObj.curr_character._id }, function(err, charObj) {
				dbItems.findById(itemId, function(err, itemObj) {
					wardrobeHelper.shiftItemInOutfit(charObj, itemObj, "wip", req.body.direction, callback);
				});
			});
		});
	};

	charExport.copyOutfit = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			dbChars.findOne({ "_id" : userObj.curr_character._id }, function(err, charObj) {
				var srcOutfit = charObj.outfits[req.src_outfit_name];
				if (!srcOutfit) {
					res.send({});
				}
				var setObj = {};
				setObj["outfits." + req.dst_outfit_name] = srcOutfit;
				dbChars.findAndModify({}, { "$set" : set }, { "new" : true }, function(err, charObjNew) {
					if (err) {
						console.log(err);
					}
					else {
						res.send({ "character" : charObjNew });
					}
				});
			});
		});
	};

	charExport.getWardrobeSubcategoryItems = function(req, res) {
		userHelper.authenticate(req, res, function(userObj) {
			if (!userObj) return;
			dbChars.findOne({ "_id" : userObj.curr_character._id }, function(err, charObj) {
				wardrobeHelper.fetchWardrobeSubcategoryItemObjs(charObj, req.params.subcategory, function(wardrobeItemObjs) {
					res.send({ "wardrobe" : wardrobeItemObjs });
				});
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