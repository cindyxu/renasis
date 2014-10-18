module.exports = function(utils) {
	var db = utils.sqlitedb;
	var gm = utils.gm;
	var Q = utils.Q;
	var _ = utils._;

	var wardrobeHelper = utils.wardrobeHelper;
	var userHelper = utils.userHelper;
	var constants = utils.constants;
	var debug = utils.debug;
	
	var wardrobeExport = {};

	var DEFAULT_WARDROBE_CATEGORY = constants.DEFAULT_WARDROBE_CATEGORY;

	wardrobeExport.dressroom = function(req, res) {
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			//get primary or first
			var dressCharObj = userObj.primary_character;
			wardrobeHelper.fetchWardrobeSubcategoryItemObjs(
				userObj.user_id, DEFAULT_WARDROBE_CATEGORY, function(err, wardrobeItemObjs) {
				
				if (err) { console.log(err); return; }

				debug("subcategory", DEFAULT_WARDROBE_CATEGORY, "contains", wardrobeItemObjs.length);

				wardrobeHelper.findOutfit(dressCharObj.wip_outfit_id, 
					wardrobeHelper.GET_ITEM_EQUIPS | wardrobeHelper.GET_ITEMS,
					function(err, outfitWip) {
						var itemEquips = outfitWip.itemEquips;
						if (err) { console.log(err); return; }
						if (itemEquips) {
							debug("outfit", outfitWip.outfit_id, "contains", itemEquips.length);
							wardrobeHelper.markItemsInOutfit(wardrobeItemObjs, itemEquips);
						}
						else debug("outfit", outfitWip.outfit_id, "contains no items");
						outfitWip.layers = wardrobeHelper.sortAsLayers(itemEquips);
						res.render('dressroom', { title: 'Express', "character": dressCharObj, "wardrobe" : wardrobeItemObjs, "outfitWip" : outfitWip });
				});	
			});
		});
	};

	wardrobeExport.updateOutfitCallback = function(res, outfitId, err, results) {
		wardrobeHelper.findOutfit(outfitId, 
			wardrobeHelper.GET_ITEM_EQUIPS | wardrobeHelper.GET_LAYERS | wardrobeHelper.GET_ITEMS | wardrobeHelper.GET_ITEM_BLUEPRINTS,
			function(err, outfit) {
				var newLayerOrders = {};
				var mapItemOrder = function(e) {
					newLayerOrders[e.item_id] = e.layer_order;
				};
				_.each(outfit.itemEquips, mapItemOrder);
				results.layerOrders = newLayerOrders;
				wardrobeHelper.compAvatar(outfit, function() {
					res.send({ "avatar_img_path" : "images/testout.png", "results" : results });
				});
			}
		);
	};

	// TAKES IN: item_id, (char_id)
	// RETURNS: avatar_img_path, entity, removed
	wardrobeExport.toggleEquipItem = function(req, res) {
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			
			var dressCharObj = userObj.primary_character;
			var itemId = parseInt(req.body.item_id);
			var callback = _.partial(wardrobeExport.updateOutfitCallback, res, dressCharObj.wip_outfit_id);
			if (req.body.equip_desc) {
				wardrobeHelper.equipItemInOutfit(itemId, dressCharObj.wip_outfit_id, req.body.equip_desc, callback);
			}
			else {
				wardrobeHelper.unequipItemInOutfit(itemId, dressCharObj.wip_outfit_id, callback);
			}
		});
	};

	wardrobeExport.shiftEquippedItem = function(req, res) {
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			
			var dressCharObj = userObj.primary_character;
			var itemId = parseInt(req.body.item_id);
			var predItemId = parseInt(req.body.pred_item_id);
			var callback = _.partial(wardrobeExport.updateOutfitCallback, res, dressCharObj.wip_outfit_id);
			wardrobeHelper.shiftItemInOutfit(itemId, predItemId, dressCharObj.wip_outfit_id, callback);
		});
	};

	wardrobeExport.copyOutfit = function(req, res) {
		
	};

	wardrobeExport.getWardrobeSubcategoryItems = function(req, res) {
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			var dressCharObj = userObj.primary_character;
			//TODO: maybe optimize the outfit fetching
			wardrobeHelper.fetchWardrobeSubcategoryItemObjs(
				userObj.user_id, req.params.subcategory, function(err, wardrobeItemObjs) {
				
				if (err) { console.log(err); return; }

				wardrobeHelper.findOutfit(dressCharObj.wip_outfit_id, 
					wardrobeHelper.GET_ITEM_EQUIPS,
					function(err, outfitWip) {

						if (err) { console.log(err); return; }
						if (outfitWip.itemEquips) {
							wardrobeHelper.markItemsInOutfit(wardrobeItemObjs, outfitWip.itemEquips);
						}

						res.send({ "wardrobe" : wardrobeItemObjs });
				});	
			});
		});
	};
	return wardrobeExport;
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