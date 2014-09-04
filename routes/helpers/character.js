module.exports = function(utils) {

	var db = utils.db;
	var gm = utils.gm;
	var im = gm.subClass({ imageMagick : true });
	var mout = utils.mout;
	var fs = utils.fs;
	var Q = utils.Q;
	var _ = utils._;

	var Q = utils.Q;
	var dbItems = db.get("items");
	var dbUsers = db.get("users");
	var dbChars = db.get("characters");
	var charHelper = {};
	var itemHelper = utils.itemHelper;

	var CLOTHING_CATEGORY = "clothing";

	var getEquipLayer = function(subcategory) {
		return (subcategory === "back" ? "back" : "front");
	};

	charHelper.markItemsInOutfit = function(itemObjsSorted, outfit) {
		var outfitEquipAttrs = outfit.equip_attrs.front.concat(outfit.equip_attrs.back);
		var outfitItemIdsSorted = _.pluck(outfitEquipAttrs, "item_id").sort();
		var j = 0;
		for (var i = 0; i < itemObjsSorted.length; i++) {
			var itemObj = itemObjsSorted[i];
			itemObj.in_outfit = false;
			
			if (j < outfitItemIdsSorted.length) {
				var outfitItemId = outfitItemIdsSorted[j];
				if (itemObj.item_id >= outfitItemId) {
					if (itemObj.item_id === outfitItemId) {
						itemObj.in_outfit = true;
					}
					j++;
				}
			}
		}
	};

	// get clothes of this user with subcategory
	charHelper.fetchWardrobeSubcategoryItemObjs = function(charObj, subcat, callback) {
		// inventory: { clothes: { head: [], top: [] ... } }
		dbUsers.col.aggregate([
			{ "$match" : { "_id" : charObj.user_id }},
			{ "$unwind" : "$inventory" },
			{ "$match" : { "inventory.subcategory" : subcat }},
			{ "$sort" : { "inventory._id" : 1 }}
		], function(err, userObjs) {
			var itemObjs = _.pluck(userObjs, "inventory");
			callback(itemObjs);
		});
	};

	charHelper.fetchOutfitItemObjs = function(outfit, callback) {
		var itemIdsFront = _.pluck(outfit.equip_attrs.front, "item_id");
		Q.all(itemHelper.fetchItemObjsPromises(itemIdsFront, outfit.equip_attrs.front)).then(function() {
			var itemIdsBack = _.pluck(outfit.equip_attrs.back, "item_id");
			Q.all(itemHelper.fetchItemObjsPromises(itemIdsBack, outfit.equip_attrs.back)).then(function() {
				callback();
			});
		});
	};

	// composites avatar img from list of items
	charHelper.compAvatar = function(pose, equipAttrArr, callback) {

		var compGroupAlias = function(equipAttrs, groupAlias) {
			var itemObj = equipAttrs.item;
			if (itemObj.subcategory === "base") {
				if (groupAlias === "above_c") {
					compGroup(equipAttrs, "arm_behind");
				}
				else if (groupAlias === "above_b") {
					compGroup(equipAttrs, "leg_behind");
					compGroup(equipAttrs, "torso");
					compGroup(equipAttrs, "leg_above");
					compGroup(equipAttrs, "head");
				}
				else if (groupAlias === "above_a") {
					compGroup(equipAttrs, "arm_above");
				}
			}
			else {
				compGroup(equipAttrs, groupAlias);
			}
		};

		var compGroup = function(equipAttrs, group) {
			var itemObj = equipAttrs.item;
			var poseForGroup = pose[group];
			if (itemObj.poses[group]) {
				var poseName = itemObj.poses[group][poseForGroup] ? poseForGroup : "0";
				var offset = itemObj.poses[group][poseName]["offset"];
				var geometryArg = "+" + offset[0] + "+" + offset[1];
				var itemImgPath = mout.string.makePath(
					"public", 
					"images",
					"items",
					itemObj.subcategory,
					mout.string.underscore(itemObj.name), 
					equipAttrs.variety,
					group,
					poseName);
				buf = buf.in(itemImgPath + "_inner.png").in("-geometry", geometryArg).in("-compose", "over").in("-composite");
				buf = buf.in(itemImgPath + "_outline.png").in("-geometry", geometryArg).in("-compose", "darken").in("-composite");
			}
		};

		im()
		// transparent + base
		var buf = im(60, 100, "#ffffff00");
		// put item on
		var equipBack = equipAttrArr.back;
		var equipFront = equipAttrArr.front;

		for (var i = 0; i < equipBack.length; i++) {
			compGroupAlias(equipBack[i], "back");
		}
		for (var i = equipFront.length - 1; i >= 0; i--) {
			compGroupAlias(equipFront[i], "behind");
		}
		for (var i = 0; i < equipFront.length; i++) {
			compGroupAlias(equipFront[i], "above_c");
		}
		for (var i = 0; i < equipFront.length; i++) {
			compGroupAlias(equipFront[i], "above_b");
		}
		for (var i = 0; i < equipFront.length; i++) {
			compGroupAlias(equipFront[i], "above_a");
		}

		// composite and write to img path
		buf.in("-filter", "point").in("-resize", "200%").write("public/images/testout.png", function(err) {
			if (err) { console.log(err); }
			callback();
		});

		//create buffer
		/*
		gm()
		.in('-page', '+0+0')
		.in("public/images/avatar.jpg")
		.in('-page', '+0+0')
		.in('-compose', 'Multiply')
		.in("public/images/splash.jpg")
		.mosaic()
		.write("public/images/testout.png", function(err) {
			if (err) { console.log(err); }
			res.send({});
		});
		*/
	};

	charHelper.equipItemWip = function(charObj, itemObj, equipAttrs, callback) {
		// find character
		var outfitWip = charObj.outfit_wip;
		var itemId = itemObj._id;
		equipAttrs["item_id"] = itemId;
		var equipLayer = getEquipLayer(itemObj.subcategory);

		var itemIndex = _.findIndex(outfitWip.equip_attrs[equipLayer], function(e) { return e.item_id.equals(itemId); });

		var query = { _id: charObj._id };
		var opts = { "new" : true };
		var update;

		// TODO: prevent duplicate adds, since getting itemIndex is not atomic
		// nevermind ... ?

		// if not already equipped, add new object in outfit
		if (itemIndex === undefined) {
			var pushKey = "outfit_wip.equip_attrs." + equipLayer;
			update = { "$push" : {} };
			update["$push"][pushKey] = equipAttrs;
		}
		// otherwise just update attributes in existing object
		else {
			var updateKey = "outfit_wip.equip_attrs." + equipLayer + "." + itemIndex;
			update = { "$set" : {} };
			update["$set"][updateKey] = equipAttrs;
		}
		
		dbChars.findAndModify(query, update, opts, function(err, charObjNew) {
			if (err) { console.log(err); }
			else {
				var results;
				var newItemIndex = _.find(charObjNew.outfit_wip.equip_attrs[equipLayer], function(e) { return e.item_id.equals(itemId); })
				if (newItemIndex !== undefined) {
					results = {};
					results["equip_index"] = newItemIndex;
					results["equip_layer"] = equipLayer;
				}
				callback(charObjNew, results);
			}
		});
	};

	charHelper.shiftItemWip = function(charObj, itemObj, direction, callback) {
		
	}

	charHelper.unequipItemWip = function(charObj, itemObj, callback) {
		var findAndModifyQuery = {};

		var query = { _id: charObj._id };
		var opts = { "new" : true };
		var pullKey = "outfit_wip.equip_attrs." + getEquipLayer(itemObj.subcategory);
		var update = { "$pull" : {} };
		update["$pull"][pullKey] = { "item_id" : itemObj._id };

		dbChars.findAndModify(query, update, opts, function(err, charObjNew) {
			if (err) { console.log(err); }
			else {
				callback(charObjNew);
			}
		});
	};

	return charHelper;

};
