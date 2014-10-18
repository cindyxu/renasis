module.exports = function(utils) {
	var taskExports = {};

	var schemas = utils.schemas;
	var db = utils.db;
	var _ = utils._;
	var _str = _.str;

	var equipGroups = ["back", "behind", "arm_behind", "leg_behind", "torso", "leg_above", "arm_above", "head"];
	var defaultPose = "";
	for (var i = 0; i < equipGroups.length; i++) {
		defaultPose += equipGroups[i] + ":0" + (i < equipGroups.length - 1 ? ";" : "");
	}

	var skillIds = {};

	var callbackIter = function(seqCmds, i, callback) {
		return function(err) {
			if(err) console.log(i, err);
			if (i < seqCmds.length) {
				db.run(seqCmds[i], callbackIter(seqCmds, i+1, callback));
			}
			else {
				if(callback) callback();
			}
		};
	};

	taskExports.clearTables = function(callback) {
		var deleteCmds = _.map(Object.keys(schemas.models), function(k) {
			return "DELETE FROM " + k;
		});
		callbackIter(deleteCmds, 0, callback)();
	};

	taskExports.dropTables = function(callback) {
		var dropCmds = _.map(Object.keys(schemas.models), function(k) {
			return "DROP TABLE " + k;
		});
		callbackIter(dropCmds, 0, callback)();
	};

	taskExports.createTables = function(callback) {
		var createCmds = [];
		var triggerModels = [];

		_.each(Object.keys(schemas.models), function(modelName) {
			var createCmd = [];
			var model = schemas.models[modelName];
			var foreignKeyAttrs, fieldAttrs;

			createCmd.push("CREATE TABLE " + modelName + " (");

			for (var field in model.fields) {
				fieldAttrs = model.fields[field];
				if (_.contains(fieldAttrs.constraints, "PRIMARY KEY")) {
					model.primaryKey = field;
				}
				createCmd.push(field + " " + fieldAttrs.type + 
					(fieldAttrs.constraints !== undefined ? " " + _str.join(" ", fieldAttrs.constraints) : "") +
					(fieldAttrs["default"] !== undefined ? " DEFAULT " + fieldAttrs["default"] : "") + ",");
			}

			for (var foreignKey in model.foreignKeys) {
				foreignKeyAttrs = model.foreignKeys[foreignKey];
				if (_.contains(foreignKeyAttrs.constraints, "PRIMARY KEY")) {
					model.primaryKey = field;
				}
				createCmd.push(foreignKey + " " + foreignKeyAttrs.type +
					(foreignKeyAttrs.constraints !== undefined ? " " + _str.join(" ", foreignKeyAttrs.constraints) : "") + 
					(foreignKeyAttrs["default"] !== undefined ? " DEFAULT " + foreignKeyAttrs["default"] : "") + ",");
			}

			if (model.timestamps) {
				createCmd.push("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ");
				createCmd.push("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ");
			}

			for (foreignKey in model.foreignKeys) {
				foreignKeyAttrs = model.foreignKeys[foreignKey];
				createCmd.push( "FOREIGN KEY (" + foreignKey + ") REFERENCES " + foreignKeyAttrs.table + "(" + foreignKeyAttrs.on + ")," );
			}

			if (model.triggers || model.timestamps) {
				triggerModels.push(modelName);
			}
			
			createCmd[createCmd.length - 1] = _str.rtrim(createCmd[createCmd.length-1], [' ', ',']);
			createCmd.push(")");
			createCmds.push(createCmd);
		});

		_.each(triggerModels, function(modelName) {
			var model = schemas.models[modelName];
			var triggers = model.triggers;
			if (model.timestamps) {
				triggers.INSERT.AFTER.push(
					"UPDATE " + modelName + " SET updated_at = CURRENT_TIMESTAMP " +
					"WHERE " + model.primaryKey + " = new." + model.primaryKey);
			}

			for (var action in model.triggers) {
				for (var prec in model.triggers[action]) {
					var triggerArr = model.triggers[action][prec];
					if (triggerArr.length === 0) { continue; }
					var triggerCmd = [];
					triggerCmd.push("CREATE TRIGGER " + 
						prec.toLowerCase() + "_" + action.toLowerCase() + "_" + modelName + " " +
						prec + " " + action + " ON " + modelName + " BEGIN");
					for (var tl in triggerArr) {
						triggerCmd.push(triggerArr[tl] + ";");
					}
					triggerCmd.push("END");
					createCmds.push(triggerCmd);
				}
			}
		});

		for (var c in createCmds) {
			createCmds[c] = _str.join("\n", createCmds[c]);
			// console.log(createCmds[c]);
			// console.log("");
		}

		callbackIter(createCmds, 0, callback)();
	};

	taskExports.recreateTables = function(callback) {
		taskExports.clearTables(function() {
			taskExports.dropTables(function() {
				taskExports.createTables(callback);
			});
		});
	};

	// todo: items will get alias set automatically, so no need to assign it manually
	taskExports.createItemInstances = function(count, callback) {
		db.all("SELECT * FROM item_blueprints", function(err, blueprints) {
			var query = "INSERT INTO items (item_blueprint_id, item_alias) VALUES ";
			for (var i = 0; i < blueprints.length; i++) {
				for (var j = 0; j < count; j++) {
					query += "(" + blueprints[i].item_blueprint_id + ", \"" + blueprints[i].item_alias + "\")";
					if (i < blueprints.length - 1 || j < count - 1) {
						query += ", ";
					}
				}
			}
			db.run(query, callback);
		});
	};

	taskExports.createGod = function(userHelper, callback) {
		userHelper.createUser("god", "1", function(err) {
			if (err) console.log(err);
			db.get("SELECT * FROM users WHERE username = ?", "god", function(err, userObj) {
				if (err) console.log(err);
				db.run("UPDATE items SET user_id = ?", userObj.user_id, function(err) {
					userHelper.createCharacterForUser("chis", userObj, function(err) {
						if (err) { console.log(err); return; }
						if (callback) callback();
					});
				});
			});
		});
	};

	taskExports.populateForums = function(callback) {

		var forumCatalogue = utils.forumCatalogue;

		var addEncounter = function(subforum, ei, callback) {
			var encounter = subforum.encounters[ei];
			if (!encounter) { return callback(); }
			db.get('SELECT species_id FROM species WHERE species_name = ?', encounter.species_name, function(err, speciesObj) {
				if (err) { console.log(err); return; }
				var speciesId = speciesObj.species_id;
				db.run('INSERT INTO encounters (subforum_name, species_id, chance) VALUES (?, ?, ?)', [subforum.subforum_name, speciesId, encounter.chance], function(err) {
					if (err) { console.log(err); return; }
					addEncounter(subforum, ei+1, callback);
				});
			});
		};

		var addSubforumChain = function(forum, si, callback) {
			var subforum = forum.subforums[si];
			if (!subforum) { return callback(); }
			db.run('INSERT INTO subforums (subforum_name, subforum_alias, forum_name, forum_alias) VALUES (?, ?, ?, ?)',
				[subforum.subforum_name, subforum.subforum_alias, forum.forum_name, forum.forum_alias], function(err) {
					if (err) { console.log(err); return; }
					addEncounter(subforum, 0, function(err) {
						addSubforumChain(forum, si+1, callback);
					});
				}
			);
		};

		var forumKeys = Object.keys(forumCatalogue);

		var addForumChain = function(fi, callback) {
			if (!forumKeys[fi]) { return callback(); }
			var forum = forumCatalogue[forumKeys[fi]];
			forum.forum_name = forumKeys[fi];
			db.run('INSERT INTO forums (forum_name, forum_alias) VALUES (?, ?)',
				[forum.forum_name, forum.forum_alias], function(err) {
					addSubforumChain(forum, 0, function(err) {
						addForumChain(fi+1, callback);
					});		
				}
			);
		};

		addForumChain(0, callback);
	};

	taskExports.populateSkills = function(callback) {
		var skills = utils.skillCatalogue;
		var addSkill = function(i) {
			if (!skills[i]) { callback(); return; }
			var skill = skills[i];
			db.run('INSERT INTO skills (skill_name, skill_alias, active) VALUES (?, ?, ?)',
				[skill.skill_name, skill.skill_alias, skill.active], function(err) {
					if (err) { console.log(err); return; }
					var skillId = this.lastID;
					var bg = skill.battle_stat_growths;
					db.run('INSERT INTO battle_stat_growths (skill_id, str, vit, dex, agi, mag, degrade) ' +
						'VALUES (?, ?, ?, ?, ?, ?, ?)', [skillId, bg.str, bg.vit, bg.dex, bg.agi, bg.mag, bg.degrade],
						function(err) {
							if (err) { console.log(err); return; }
							addSkill(i+1);
						}
					);
				}
			);
		};
		addSkill(0);
	};

	taskExports.populateSpecies = function(callback) {
		var speciesCatalogue = utils.speciesCatalogue;

		var addSpecies = function(i, callback) {
			var species = speciesCatalogue[i];
			if (!species) { return callback(); }
			db.run("INSERT INTO species (species_name, species_alias) VALUES (?, ?)",
				[species.species_name, species.species_alias], function(err) {
					var speciesId = this.lastID;
					if (species.skills) {
						insertCarrierSkills(speciesId, species.skills, 0, false, function(err) {
							addSpecies(i+1, callback);
						});
					}
				}
			);
		};

		var insertCarrierSkills = function(speciesId, skillNames, i, f, callback) {
			var skillsCached = true;
			var query;
			if (!f) {
				for (var si in skillNames) {
					if (!skillIds[skillNames[si]]) {
						skillsCached = false;
						break;
					}
				}
			}

			if (!skillsCached) {
				query = 'SELECT skill_id, skill_name FROM skills WHERE skill_name in ("' + _str.join('", "', skillNames) + '")';
				db.all(query, function(err, skillObjs) {
					if (err) { console.log("error getting skill", err); return; }
					for (var soi in skillObjs) {
						var skillObj = skillObjs[soi];
						skillIds[skillObj.skill_name] = skillObj.skill_id;
					}
					insertCarrierSkills(speciesId, skillNames, i, true, callback);
				});
				return;
			}

			query = "INSERT INTO carriers_skills (species_id, skill_id) VALUES " + 
				_str.join(', ', _.map(skillNames, function(sn) {
					return '(' + speciesId + ', ' + skillIds[sn] + ')';
			}));
			db.run(query, function(err) {
					if (err) { console.log("error adding carrier skill", err); return; }
					callback();
				}
			);
		};

		addSpecies(0, callback);
	};

	taskExports.populateItemBlueprints = function(callback) {
		var itemCatalogue = utils.itemCatalogue;
		
		var addItemBlueprint = function(category, subcategory, item, callback) {
			var isEquippable = schemas.definitions.item_blueprints.isEquippable(category);
			var query = 'INSERT INTO item_blueprints (item_alias, item_name, category, subcategory) VALUES ("' +
				item.item_alias + '", "' + item.item_name + '", "' + category + '", "' + subcategory + '")';
			db.run(query, function(err) {
					if (err) { console.log("error adding blueprint", err); return; }
					var itemBlueprintId = this.lastID;
					if (item.equip_options) {
						var query = 'INSERT INTO item_equip_options (item_blueprint_id, varieties, poses_str) VALUES (' +
							itemBlueprintId + ', "' + item.equip_options.varieties + '", "' + item.equip_options.poses_str + '")';
						db.run(query,
							function(err) {
								if (err) { console.log("error inserting item equip option", err); return; }
								if (item.battlegear) {
									addBattlegearBlueprint(item.battlegear, itemBlueprintId, callback);
								} else {
									callback();
								}
							}
						);
					} else {
						callback();
					}
				}
			);
		};

		var insertCarrierSkills = function(battlegear, battlegearId, f, callback) {
			var skillsCached = true;
			var skillNames = battlegear.skills;
			var query;
			if (!f) {
				for (var si in skillNames) {
					if (!skillIds[skillNames[si]]) {
						skillsCached = false;
						break;
					}
				}
			}

			if (!skillsCached) {
				query = 'SELECT skill_id, skill_name FROM skills WHERE skill_name in ("' + _str.join('", "', skillNames) + '")';
				db.all(query, function(err, skillObjs) {
					if (err) { console.log("error getting skill", err); return; }
					for (var soi in skillObjs) {
						var skillObj = skillObjs[soi];
						skillIds[skillObj.skill_name] = skillObj.skill_id;
					}
					insertCarrierSkills(battlegear, battlegearId, true, callback);
				});
				return;
			}

			query = "INSERT INTO carriers_skills (battlegear_blueprint_id, skill_id) VALUES " + 
				_str.join(', ', _.map(skillNames, function(sn) {
					return '(' + battlegearId + ', ' + skillIds[sn] + ')';
			}));
			db.run(query, function(err) {
					if (err) { console.log("error adding carrier skill", err); return; }
					callback();
				}
			);
		};

		var addBattlegearBlueprint = function(battlegear, itemBlueprintId, callback) {

			var query = 'INSERT INTO battlegear_blueprints (item_blueprint_id, ' +
				'str_base, vit_base, dex_base, agi_base, mag_base, ' +
				'str_mult, vit_mult, dex_mult, agi_mult, mag_mult) VALUES (' +
				itemBlueprintId + ', ' +
				battlegear.str_base + ', ' +
				battlegear.vit_base + ', ' +
				battlegear.dex_base + ', ' +
				battlegear.agi_base + ', ' +
				battlegear.mag_base + ', ' +

				battlegear.str_mult + ', ' +
				battlegear.vit_mult + ', ' +
				battlegear.dex_mult + ', ' +
				battlegear.agi_mult + ', ' +
				battlegear.mag_mult + ')';

			db.run(query, function(err) {
					if (err) { console.log("error inserting battlegear", err); return; }
					var battlegearId = this.lastID;
					insertCarrierSkills(battlegear, battlegearId, false, callback);
				}
			);
		};

		var ci = 0;
		var categoryKeys = Object.keys(itemCatalogue);
		var category = categoryKeys[ci];
		var citems = itemCatalogue[category];
		var sci = 0;
		var subcategoryKeys = Object.keys(citems);
		var subcategory = subcategoryKeys[sci];
		var scitems = citems[subcategoryKeys[sci]];
		var scii = 0;
		var item = scitems[scii];

		var iterBlueprints = function() {
			console.log(category, subcategory, item.item_name);
			addItemBlueprint(category, subcategory, item, function() {
				scii++;
				if (scii >= scitems.length) {
					sci++;
					scii = 0;
					if (sci >= subcategoryKeys.length) {
						sci = 0;
						ci++;
						if (ci >= categoryKeys.length) {
							callback();
							return;
						}
						category = categoryKeys[ci];
						citems = itemCatalogue[category];
						subcategoryKeys = Object.keys(citems);

					}
					subcategory = subcategoryKeys[sci];
					scitems = citems[subcategory];
				}

				item = scitems[scii];
				iterBlueprints();
			});
		};
		iterBlueprints();
	};

	return taskExports;
};