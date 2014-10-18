module.exports = function(utils) {

	var db = utils.db;
	var gm = utils.gm;
	var im = gm.subClass({ imageMagick : true });
	var mout = utils.mout;
	var fs = utils.fs;
	var Q = utils.Q;
	var _ = utils._;
	var schemas = utils.schemas;
	var schemaFields = schemas.fields;
	var itemEquipDefs = schemas.definitions.item_equips;
	var debug = utils.debug;

	var wardrobeHelper = {};

	var equipGroups = ["back", "behind", "arm_behind", "leg_behind", "torso", "head", "leg_above", "arm_above"];
	var equipLayers = ["back", "front"];

	var defaultPose = "";
	for (var i = 0; i < equipGroups.length; i++) {
		defaultPose += equipGroups[i] + ":0" + (i < equipGroups.length - 1 ? ";" : "");
	}

	wardrobeHelper.GET_ITEM_EQUIPS = 1;
	wardrobeHelper.GET_LAYERS = 1 << 1;
	wardrobeHelper.GET_ITEMS = 1 << 2;
	wardrobeHelper.GET_ITEM_BLUEPRINTS = 1 << 3;

	// converts pose_str into an object
	wardrobeHelper.parsePose = function(poseStr) {
		if (!poseStr || poseStr.length === 0) return wardrobeHelper.parsePose(defaultPose);
		var groupSegs = poseStr.split(';');
		var pose = {};
		_.each(groupSegs, function(seg) { 
			var poseOffsets = seg.split(':');
			pose[poseOffsets[0]] = poseOffsets[1];
		});
		return pose;
	};

	// converts poses_str into an object
	wardrobeHelper.parsePoseOptions = function(posesStr) {
		var groupSegs = posesStr.split(';');
		var groups = {};
		_.each(groupSegs, function(seg) {
			var group = {};
			var splitIdx = seg.indexOf(':');
			var groupName = seg.substring(0, splitIdx);
			var groupPosesStr = seg.substring(splitIdx+1, seg.length);

			if (groupPosesStr[0] === '(') groupPosesStr = groupPosesStr.substring(1, groupPosesStr.length);
			if (groupPosesStr[groupPosesStr.length-1] === ')') groupPosesStr = groupPosesStr.substring(0, groupPosesStr.length - 1);
			
			var groupPosesSegs = groupPosesStr.split('|');
			
			_.each(groupPosesSegs, function(poseSeg) {
				var poseOffsets = poseSeg.split(':');
				var offsetStrs = poseOffsets[1].split(',');
				group[poseOffsets[0]] = [parseInt(offsetStrs[0]), parseInt(offsetStrs[1])];
			});
			
			groups[groupName] = group;
		});
		return groups;
	};

	// set "in_outfit" for all items in itemObjsSorted that appear in itemEquipsSorted
	// sort is by item_id
	wardrobeHelper.markItemsInOutfit = function(itemObjsSorted, itemEquipsSorted) {
		if (!itemObjsSorted || !itemEquipsSorted) return;
		var i = 0; 
		var j = 0;
		while (i < itemObjsSorted.length && j < itemEquipsSorted.length) {
			var diff = itemObjsSorted[i].item_id - itemEquipsSorted[j].item_id;
			if (diff === 0) {
				itemObjsSorted[i].in_outfit = true;
				i++;
				j++;
			} else if (diff < 0) {
				i++;				
			} else {
				j++;
			}
		}
	};

	// format as { layer1: [ layer1 items ], layer2: [ layer2 items ] }
	// sorted by order within each layer
	wardrobeHelper.sortAsLayers = function(itemEquips) {
		var layers = _.groupBy(itemEquips, function(e) { return e.layer; });
		var getLayerOrder = function(e) { return e.layer_order; };
		for (var cat in layers) {
			layers[cat] = _.sortBy(layers[cat], getLayerOrder);
		}
		return layers;
	};

	// get clothes of this user with subcategory
	wardrobeHelper.fetchWardrobeSubcategoryItemObjs = function(userId, subcat, callback) {
		db.all("SELECT * FROM items " +
			"INNER JOIN item_blueprints ON item_blueprints.item_blueprint_id = items.item_blueprint_id " +
			"INNER JOIN item_equip_options ON item_equip_options.item_blueprint_id = item_blueprints.item_blueprint_id " +
			"WHERE items.user_id = ? AND item_blueprints.subcategory = ? ORDER BY items.item_id",
			[userId, subcat], callback);
	};

	// returns outfit with optional flags.
	// GET_ITEM_EQUIPS - will get item_equips in this outfit as outfit.itemEquips
	// GET_LAYERS - will sort item_equips into their layers as outfit.layers
	// GET_ITEMS - will get items attached to item_equips as outfit.itemEquips.item
	// GET_BLUEPRINT - will get items attached to item_equips as outfit.itemEquips.blueprint
	// blueprint will also include item_equip_option fields.
	wardrobeHelper.findOutfit = function(outfitId, flags, callback) {
		var selectQuery = "SELECT * FROM outfits";
		var optionsQuery = " WHERE outfits.outfit_id = ?";
		if (flags & wardrobeHelper.GET_ITEM_EQUIPS) {
			selectQuery += " LEFT JOIN item_equips ON item_equips.outfit_id = outfits.outfit_id";
			optionsQuery += " ORDER BY item_equips.item_id";
			if (flags & wardrobeHelper.GET_ITEMS) {
				selectQuery += " INNER JOIN items ON items.item_id = item_equips.item_id";
				//todo; maybe store the blueprint id ....
				if (flags & wardrobeHelper.GET_ITEM_BLUEPRINTS) {
					selectQuery += " INNER JOIN item_blueprints ON item_blueprints.item_blueprint_id = items.item_blueprint_id";
					selectQuery += " INNER JOIN item_equip_options ON item_equip_options.item_blueprint_id = item_blueprints.item_blueprint_id";
				}
			}
		}

		db.all(selectQuery + optionsQuery, outfitId, function(err, rows) {
			if (err) { console.log(err); callback(err); return; }
			if (rows && rows.length > 0) {
				var outfit;
				if (flags & wardrobeHelper.GET_ITEM_EQUIPS) {
					outfit = _.pick(rows[0], schemaFields.outfits);
					outfit.pose = wardrobeHelper.parsePose(outfit.pose_str);
					outfit.itemEquips = _.map(rows, function(r) {
						var itemEquip = _.pick(r, schemaFields.item_equips);
						if (flags & wardrobeHelper.GET_ITEMS) {
							itemEquip.item = _.pick(r, schemaFields.items);
							if (flags & wardrobeHelper.GET_ITEM_BLUEPRINTS) {
								itemEquip.blueprint = _.pick(r, schemaFields.item_blueprints.concat(schemaFields.item_equip_options));
							}
						}
						return itemEquip;
					});
					if (flags & wardrobeHelper.GET_LAYERS) {
						outfit.layers = wardrobeHelper.sortAsLayers(outfit.itemEquips);
					}
					callback(null, outfit);
				} else {
					outfit = rows[0];
					outfit.pose = wardrobeHelper.parsePose(outfit.pose_str);
					if (flags & wardrobeHelper.GET_ITEM_EQUIPS) {
						outfit.itemEquips = [];
					}
					callback(null, outfit);
				}
			}
			// there were no items in this outfit, so no results were returned
			// so default to just getting the outfit object
			else {
				debug("no items found for outfit", outfitId);
				wardrobeHelper.findOutfit(outfitId, 0, function(err, outfit) {
					if (err) { console.log(err); callback(err); return; }
					outfit.pose = wardrobeHelper.parsePose(outfit.pose_str);
					callback(null, outfit);
				});
			}
		});
	};

	wardrobeHelper.compGroup = function(equip, blueprint, pose, group, buf) {
		var poseForGroup = pose[group];
		if (blueprint.poses[group]) {
			var offset = blueprint.poses[group][poseForGroup];
			if (offset !== undefined) {
				var geometryArg = "+" + offset[0] + "+" + offset[1];
				var itemImgPath = mout.string.makePath(
					"public", 
					"images",
					"items",
					"equip",
					blueprint.subcategory,
					mout.string.underscore(blueprint.item_name), 
					equip.variety,
					group,
					poseForGroup);
				debug("compositing", itemImgPath);
				buf = buf.in(itemImgPath + "_inner.png").in("-geometry", geometryArg).in("-compose", "over").in("-composite");
				buf = buf.in(itemImgPath + "_outline.png").in("-geometry", geometryArg).in("-compose", "multiply").in("-composite");
			}
		}
	};

	/* 
	 * composes the avatar image for a given outfit.
	 * outfit must have layers as outfit.layers
	 * as well as item_blueprint(+item_equip_option)
	 * for each item in each layer.
	 */
	wardrobeHelper.compAvatar = function(outfit, callback) {

		// transparent + base
		var buf = im(80, 100, "#ffffff00").in("-alpha", "Set");

		if (!_.isEmpty(outfit.layers)) {
			debug("compositing outfit: ", outfit.outfitId);
			// put item on
			for (var k = 0; k < equipLayers.length; k++) {
				var layer = outfit.layers[equipLayers[k]];
				if (layer) {
					for (var j = 0; j < equipGroups.length; j++) {
						for (var i = 0; i < layer.length; i++) {
							var equip = layer[i];
							var blueprint = layer[i].blueprint;
							blueprint.poses = wardrobeHelper.parsePoseOptions(blueprint.poses_str);
							wardrobeHelper.compGroup(equip, blueprint, outfit.pose, equipGroups[j], buf);
						}
					}
				}
			}
		}

		// composite and write to img path
		buf.in("-filter", "point").in("-resize", "200%").write("public/images/testout.png", function(err) {
			if (err) { console.log(err); callback(err); return; }
			callback();
		});
	};

	wardrobeHelper.equipItemInOutfit = function(itemId, outfitId, newEquipDesc, callback) {
		// adds an item_equip object as the next highest layer order
		debug("equip item", itemId, "in outfit", outfitId);
		db.get("SELECT * FROM items INNER JOIN item_blueprints ON item_blueprints.item_blueprint_id = items.item_blueprint_id " +
			"WHERE item_id = ?", itemId, function(err, itemObj) {
				var layer = itemEquipDefs.layer(itemObj);
				db.run("BEGIN TRANSACTION").get(
					"SELECT layer_order FROM item_equips WHERE outfit_id = ? AND layer = ? ORDER BY layer_order DESC LIMIT 1",
					[outfitId, layer], function(err, layerOrderObj) {
						if (err) { console.log(err); callback(err); return; }
						var layerOrder = (layerOrderObj ? layerOrderObj.layer_order + 1 : 0);
						debug("next layer order:", layerOrder);
						db.run("INSERT INTO item_equips (item_id, item_alias, variety, outfit_id, layer, layer_order) VALUES " +
						"($item_id, $item_alias, $variety, $outfit_id, $layer, $layer_order)", {
						"$item_id" : itemId,
						"$item_alias" : itemObj.item_alias,
						"$outfit_id" : outfitId,
						"$variety" : newEquipDesc.variety,
						"$layer" : layer,
						"$layer_order" : layerOrder }, function(err) {
							if (err) { console.log(err); callback(err); return; }
							db.run("COMMIT", function(err) {
								if (err) { console.log(err); callback(err); return; }
								else {
									var results = { "inserted" : [
										{
											"item_id" : itemObj.item_id,
											"item_alias" : itemObj.item_alias,
											"variety" : newEquipDesc.variety,
											"layer": layer,
											"layer_order" : layerOrder
										}
									]};
									debug("equip results:", JSON.stringify(results, undefined, 2));
									callback(undefined, results);
								}
							});
						});
				});
		});
	};

	wardrobeHelper.shiftItemInOutfit = function(itemId, predItemId, outfitId, callback) {
		debug("move item", itemId, "on top of", predItemId);
		db.run("BEGIN TRANSACTION").all("SELECT * FROM items " +
			"INNER JOIN item_equips ON item_equips.item_id = items.item_id " +
			"WHERE item_equips.outfit_id = ? AND item_equips.item_id IN (?, ?)", 
			[outfitId, itemId, predItemId], function(err, switchItemObjs) {
				if (err) { console.log(err); callback(err); return; }
				var pred, curr;

				if (switchItemObjs[0].item_id === itemId) {
					curr = switchItemObjs[0];
					pred = switchItemObjs[1];
				}
				else {
					curr = switchItemObjs[1];
					pred = switchItemObjs[0];	
				}

				var prevLayerOrder = curr.layer_order;
				var newLayerOrder;
				var query, queryArr;

				if (!pred) {
					newLayerOrder = 0;
					query = "UPDATE item_equips SET layer_order = layer_order+1 " +
						"WHERE outfit_id = ? AND layer = ? AND item_id != ? AND layer_order >= ?";
					queryArr = [outfitId, curr.layer, itemId, newLayerOrder];
				}
				else if (pred.layer_order < prevLayerOrder) {
					newLayerOrder = pred.layer_order + 1;

					query = "UPDATE item_equips SET layer_order = layer_order+1 " +
						"WHERE outfit_id = ? AND layer = ? AND item_id != ? " +
						"AND layer_order < ? AND layer_order >= ?";
					queryArr = [outfitId, curr.layer, itemId, prevLayerOrder, newLayerOrder];
				}
				else {
					newLayerOrder = pred.layer_order;
					query = "UPDATE item_equips SET layer_order = layer_order-1 " +
						"WHERE outfit_id = ? AND layer = ? AND item_id != ? " +
						"AND layer_order > ? AND layer_order <= ?";
					queryArr = [outfitId, curr.layer, itemId, prevLayerOrder, newLayerOrder];
				}

				db.run("UPDATE item_equips SET layer_order = ? WHERE item_id = ?", newLayerOrder, itemId, function(err) {
					if (err) { console.log(err); callback(err); return; }
					db.run(query, queryArr, function(err) {
						if (err) { console.log(err); callback(err); return; }
						db.run("COMMIT", function(err) {
							if (err) { console.log(err); callback(err); return; }
							callback(err, {});
						});	
					});
				});
			}
		);
	};

	wardrobeHelper.unequipItemInOutfit = function(itemId, outfitId, callback) {
		// deletes the item_equip in question, then shifts layer_orders of all items above it
		// TODO: ERROR CHECKING
		debug("deequip item", itemId, "in outfit", outfitId);
		db.run("BEGIN TRANSACTION").get(
			"SELECT layer, layer_order FROM item_equips WHERE outfit_id = ? AND item_id = ?", 
			[outfitId, itemId], function(err, itemEquipObj) {
				if (err) console.log(err);
				db.run("DELETE FROM item_equips WHERE outfit_id = ? AND item_id = ?",
					[outfitId, itemId], function(err) {
						if (err) console.log(err);
						db.run("UPDATE item_equips SET layer_order = layer_order - 1 WHERE layer = ? AND layer_order > ?",
						[itemEquipObj.layer, itemEquipObj.layer_order], function(err) {
							if (err) console.log(err);
							db.run("COMMIT", function(err) {
								if (err) console.log(err);
								var results = { "removed" : [{ 
									"item_id" : itemId
								}]};
								callback(err, results);
							});	
						});
					}
				);
			}
		);
	};

	return wardrobeHelper;

};
