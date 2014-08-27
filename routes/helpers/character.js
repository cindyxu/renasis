module.exports = function(utils) {

	var db = utils.db;
	var gm = utils.gm;
	var im = gm.subClass({ imageMagick : true });
	var mout = utils.mout;
	var fs = utils.fs;
	var Q = utils.Q;

	var Q = utils.Q;
	var dbitems = db.get("items");
	var dbusers = db.get("users");
	var dbchars = db.get("characters");
	var charHelper = {};
	var itemHelper = utils.itemHelper;

	charHelper.fetchWardrobeSubcategoryItemObjs = function(charObj, cat, callback) {

		dbusers.findOne({ "_id" : charObj.user_id }, function(err, userObj) {
			var catItemIds = userObj.inventory.clothes[cat];

			var catItemObjs = {};
			var qcallArr = [];

			var i = 0;
			for (charId in catItemIds) {
				catItemObjs[charId] = [];
				qcallArr[i] = Q.all(itemHelper.fetchItemObjsPromises(catItemIds[charId], catItemObjs[charId]));
				i++;
			}

			Q.all(qcallArr).then(function() { callback(catItemObjs); });

		});
	};

	// using item ids from charObj, retrieves item objs
	// from database (in appropriate layers)
	// result is map from layers to arrays of item objs

	charHelper.fetchEquippedItemObjs = function(equippedIds, callback) {
		
		var itemObjs = {};
		var qcallArr = [];

		// array of Q.alls inside Q.all
		// each inner Q.all corresponds to a layer
		// and is called on an array of deferred promises
		// for fetching items in that layer

		var i = 0;
		for (var layer in equippedIds) {
			itemObjs[layer] = [];
			qcallArr[i] = Q.all(itemHelper.fetchItemObjsPromises(equippedIds[layer], itemObjs[layer]));
			i++;
		}

		Q.all(qcallArr).then(function() {
			callback(itemObjs) });
	};

	// composites avatar img from list of items
	charHelper.compAvatar = function(itemObjs, callback) {
		
		// transparent + base
		var buf = im().in("public/images/base.png");

		// put item on
		for (var layer in itemObjs) {
			for (var j = 0; j < itemObjs[layer].length; j++) {
				var layerItemObjs = itemObjs[layer];
				var itemImgPath = mout.string.makePath("public", "images", mout.string.underscore(layerItemObjs[j].name));
				 
				buf = buf.in(itemImgPath + "_inner.png").in("-compose", "over").in("-composite");
				buf = buf.in(itemImgPath + "_outline.png").in("-compose", "darken").in("-composite");
			}
		}

		// composite and write to img path
		buf.write("public/images/testout.png", function(err) {
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
	}

	charHelper.toggleEquipItem = function(charObj, itemId, forceRemove, callback) {
		// find character
		var equippedIds = charObj.equipped_ids;
		console.log("ITEM ID:" + itemId);
		dbitems.findOne({"_id" : itemId}, function(err, itemObj) {

			var layer = itemObj.layer;
			var layerItems = equippedIds[layer];
			var itemIdx = layerItems.indexOf(itemId);

			console.log(charObj);
			
			var removed = true;
			// item not equipped
			if (itemIdx < 0) {
				// add item
				if (!forceRemove) {
					layerItems.push(itemId);
					removed = false;
				} 
				// forceRemove == true
				// -> skip db update and go straight to callback
				else {
					callback(charObj);
					return;
				}
			}
			// item equipped -> remove item
			else {
				layerItems.splice(itemIdx, 1);
			}
			equippedIds[layer] = layerItems;
			
			// update
			dbchars.update({ _id: charObj._id }, { "$set" : { "equipped_ids" : equippedIds }}, function(err, docs) {
				if (err) {
					console.log(err);
				}
				callback(removed, docs);
			});
		});
	};

	return charHelper;

};
