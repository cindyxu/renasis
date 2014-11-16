module.exports = function(utils) {

	var battleHelper = {};
	var db = utils.db;
	var debug = utils.debug;
	var _ = utils._;

	battleHelper.resolveBattleAction = function(actorId, threadId, postId, event, callback) {
		if (event.action === "SKILL") {
			var skillId = event.selection;
		}
		else if (event.action === "ITEM") {
			var itemId = event.selection;
		}
		else if (event.action === "RUN") {

		}
	};

	battleHelper.startBattleEncounter = function(characterId, threadId, postId, encounter, callback) {
		db.get('SELECT species_name, species_alias FROM species WHERE species_id = ?',
			encounter.species_id, function(err, speciesObj) {
				if (err) { console.log(err); callback(err); return; }
				var speciesName = speciesObj.species_name;
				var speciesAlias = speciesObj.species_alias;
				debug("new battle with", speciesAlias);
				var action = "CHALLENGE";
				db.run('BEGIN TRANSACTION', function(err) {
					if (err) { console.log(err); callback(err); return; }
					// create the enemy
					db.run('INSERT INTO entities (species_id, species_alias) VALUES (?, ?)',
						[encounter.species_id, speciesAlias], function(err) {
							if (err) { console.log(err); callback(err); return; }
							var enemyId = this.lastID;
							// create empty post
							forumHelper.createPost(undefined, threadId, enemyId, speciesAlias, function(err, post) {
								// attach "challenge" battle step to post
								db.run('INSERT INTO battle_steps (action, post_id, actor_id) VALUES (?, ?, ?, ?)', 
									[action, postId, enemyId], function(err) {
										if (err) { console.log(err); callback(err); return; }
										var battleStepId = this.lastID;
										db.run('COMMIT', function(err) {
											if (err) { console.log(err); callback(err); return; }
												callback(undefined, {
													"battle_step_id" : battleStepId,
													"action" : action,
													"actor_id" : enemyId,
													"actor_species_name" : speciesName,
													"actor_species_alias" : speciesAlias
												}
											);
										});
									}
								);
							}
						);
					});
				}
			);
		});
	};

	/* TODO: TEST THIS */
	battleHelper.findUsableSkills = function(entityId, callback) {
		db.all('SELECT carriers_skills.*, skills.skill_alias, entities_skills.* FROM entities ' + 
			'LEFT JOIN items ON items.entity_id = entities.entity_id ' +
			'INNER JOIN carriers_skills ON (carriers_skills.species_id = entities.species_id OR carriers_skills.item_blueprint_id = items.item_blueprint_id) ' +
			'INNER JOIN skills ON skills.skill_id = carriers_skills.skill_id ' +
			'LEFT JOIN entities_skills ON entities_skills.entity_id = entities.entity_id ' +
			'WHERE entities.entity_id = ?', entityId, function(err, skillObjs) {
				
				var skillLevels = {};
				var skillObj;
				
				// BAD. determining if object is entities_skills or carriers_skills
				// depending on entity_id field
				for (var i = 0; i < skillObjs.length; i++) {
					skillObj = skillObjs[i];
					if (skillObj.entity_id) {
						skillLevels[skillObj.skill_alias] = skillObj.level;
					}
				}

				skillObjs = _.filter(skillObjs, function(skillObj) {
					var canUse = false;
					if (skillObj.item_blueprint_id || skillObj.species_id) {
						canUse = true;
						if (skillObj.ancestors) {
							var ancestorsSegs = skillObj.ancestors.split(",");
							for (var j = 0; j < ancestorsSegs.length; j++) {
								
								var ancestorSegs = ancestorsSegs[j].split(":");
								var alias = ancestorsSegs[0];
								var reqLevel = ancestorsSegs[1];
								var currLevel = skillLevels[alias];
								
								if (!currLevel || currLevel <= reqLevel) {
									canUse = false;
									break;
								}
							}
						}
					}
					return canUse;
				});

				if (err) { console.log(err); }
				callback(err, skillObjs);
			}
		);
	};

	return battleHelper;
};