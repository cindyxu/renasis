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
	var wardrobeHelper = {};
	var itemHelper = utils.itemHelper;

	var CLOTHING_CATEGORY = "clothing";

	var getEquipLayer = function(subcategory) {
		return (subcategory === "back" ? "back" : "front");
	};

	wardrobeHelper.markItemsInOutfit = function(itemObjsSorted, outfit) {
		var equipDescsAll = outfit.layers.front.concat(outfit.layers.back);
		var outfitItemIdsSorted = _.pluck(equipDescsAll, "item_id").sort();
		var j = 0;
		for (var i = 0; i < itemObjsSorted.length; i++) {
			var itemObj = itemObjsSorted[i];
			itemObj.in_outfit = false;
			
			if (j >= outfitItemIdsSorted.length) break;

			var outfitItemId = outfitItemIdsSorted[j];
			console.log(itemObj._id, outfitItemId);
			if (itemObj._id >= outfitItemId) {
				if (itemObj._id.toString() === outfitItemId.toString()) {
					console.log("FOUND " + itemObj.name);
					itemObj.in_outfit = true;
				}
				j++;
			}
		}
	};

	// get clothes of this user with subcategory
	wardrobeHelper.fetchWardrobeSubcategoryItemObjs = function(charObj, subcat, callback) {
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

	wardrobeHelper.fetchOutfitItemObjs = function(outfit, callback) {
		// TOOD: don't do this ... just make one database call and get them at once
		var itemIdsFront = _.pluck(outfit.layers.front, "item_id");
		Q.all(itemHelper.fetchItemObjsPromises(itemIdsFront, outfit.layers.front)).then(function() {
			var itemIdsBack = _.pluck(outfit.layers.back, "item_id");
			Q.all(itemHelper.fetchItemObjsPromises(itemIdsBack, outfit.layers.back)).then(function() {
				callback();
			});
		});
	};

	// composites avatar img from list of items
	wardrobeHelper.compAvatar = function(outfit, callback) {
		var pose = outfit.pose;
		var layers = outfit.layers;
		var compGroupAlias = function(equipDesc, groupAlias) {
			var itemObj = equipDesc.item;
			if (itemObj.subcategory === "base") {
				if (groupAlias === "above_c") {
					compGroup(equipDesc, "arm_behind");
				}
				else if (groupAlias === "above_b") {
					compGroup(equipDesc, "leg_behind");
					compGroup(equipDesc, "torso");
					compGroup(equipDesc, "leg_above");
					compGroup(equipDesc, "head");
				}
				else if (groupAlias === "above_a") {
					compGroup(equipDesc, "arm_above");
				}
			}
			else {
				compGroup(equipDesc, groupAlias);
			}
		};

		var compGroup = function(equipDesc, group) {
			var itemObj = equipDesc.item;
			var poseForGroup = pose[group];
			if (itemObj.poses[group]) {
				var poseName = itemObj.poses[group][poseForGroup] ? poseForGroup : "0";
				var offset = itemObj.poses[group][poseName]["offset"];
				var geometryArg = "+" + offset[0] + "+" + offset[1];
				var itemImgPath = mout.string.makePath(
					"public", 
					"images",
					"items",
					"clothing",
					itemObj.subcategory,
					mout.string.underscore(itemObj.name), 
					equipDesc.variety,
					group,
					poseName);
				buf = buf.in(itemImgPath + "_inner.png").in("-geometry", geometryArg).in("-compose", "over").in("-composite");
				buf = buf.in(itemImgPath + "_outline.png").in("-geometry", geometryArg).in("-compose", "multiply").in("-composite");
			}
		};

		// transparent + base
		var buf = im(60, 100, "#ffffff00").in("-alpha", "Set");
		// put item on
		var layerBack = layers.back;
		var layerFront = layers.front;

		for (var i = 0; i < layerBack.length; i++) {
			compGroupAlias(layerBack[i], "back");
		}
		for (var i = layerFront.length - 1; i >= 0; i--) {
			compGroupAlias(layerFront[i], "behind");
		}
		for (var i = 0; i < layerFront.length; i++) {
			compGroupAlias(layerFront[i], "above_c");
		}
		for (var i = 0; i < layerFront.length; i++) {
			compGroupAlias(layerFront[i], "above_b");
		}
		for (var i = 0; i < layerFront.length; i++) {
			compGroupAlias(layerFront[i], "above_a");
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

	wardrobeHelper.equipItemInOutfit = function(charObj, itemObj, outfitName, newEquipDesc, callback) {

		var outfit = charObj.outfits[outfitName];
		var itemId = itemObj._id;

		newEquipDesc["item_id"] = itemObj._id;
		
		var layerName = getEquipLayer(itemObj.subcategory);
		var layers = outfit.layers;
		var itemIndex = _.findIndex(layers[layerName], function(e) { return e.item_id.equals(itemId); });

		var query = { _id: charObj._id };
		var opts = { "new" : true };
		var updateSet = {};

		// TODO: maybe in the future, prevent duplicate adds ...
		// TODO: verify that newEquipDesc is valid

		// if not already equipped, add new object in outfit
		if (itemIndex === undefined) {
			layers[layerName].push(newEquipDesc);
		}
		// otherwise just updateSet attributes in existing object
		else {
			layers[layerName][itemIndex] = newEquipDesc;
		}

		var updateKey = "outfits." + outfitName + ".layers." + layerName;
		updateSet[updateKey] = layers[layerName];

		dbChars.findAndModify(query, { "$set" : updateSet }, opts, function(err, charObjNew) {
			if (err) { console.log(err); }
			else {
				var results;
				var newItemIndex = _.find(charObjNew.outfits[outfitName].layers[layerName], function(e) { return e.item_id.equals(itemId); })
				if (newItemIndex !== undefined) {
					results = {};
					results["equip_index"] = newItemIndex;
					results["equip_layer"] = layerName;
				}
				callback(charObjNew, results);
			}
		});
	};

	wardrobeHelper.shiftItemInOutfit = function(charObj, itemObj, outfitName, direction, callback) {
		var outfit = charObj.outfits[outfitName];
		var itemId = itemObj._id;
		
		var layers = outfit.layers;
		var layerName = getEquipLayer(itemObj.subcategory);
		var layer = layers[layerName];
		var itemIndex = _.findIndex(outfit.layers[layerName], function(e) { return e.item_id.equals(itemId); });
		
		// shouldn't happen
		if (itemIndex === undefined) {
			console.log("couldn't find item!");
			callback(charObj);
		}

		// shift down
		if (direction > 0 && itemIndex < layer.length - 1) {
			var tmp = layer[itemIndex+1];
			layer[itemIndex+1] = layer[itemIndex];
			layer[itemIndex] = tmp;
		}
		// shift up
		else if (direction < 0 && itemIndex > 0) {
			var tmp = layer[itemIndex-1];
			layer[itemIndex-1] = layer[itemIndex];
			layer[itemIndex] = tmp;	
		}

		var query = { _id: charObj._id };
		var opts = { "new" : true };
		var updateSet = {};
		var updateKey = "outfits." + outfitName + ".layers." + layerName;
		updateSet[updateKey] = layers[layerName];
		dbChars.findAndModify(query, { "$set" : updateSet }, opts, function(err, charObjNew) {
			if (err) { console.log(err); }
			else {
				var results = { "swapped_item_id" : tmp.item_id };
				callback(charObjNew, results);
			}
		});
	};

	wardrobeHelper.unequipItemInOutfit = function(charObj, itemObj, outfitName, callback) {
		var findAndModifyQuery = {};

		var query = { _id: charObj._id };
		var opts = { "new" : true };
		var pullKey = "outfits." + outfitName + ".layers." + getEquipLayer(itemObj.subcategory);
		var update = { "$pull" : {} };
		update["$pull"][pullKey] = { "item_id" : itemObj._id };

		dbChars.findAndModify(query, update, opts, function(err, charObjNew) {
			if (err) { console.log(err); }
			else {
				callback(charObjNew);
			}
		});
	};

	return wardrobeHelper;

};
