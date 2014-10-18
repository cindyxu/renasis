module.exports = function(utils) {

	var encountersHelper = {};
	var schemas = utils.schemas;
	var _ = utils._;
	var db = utils.db;
	var debug = utils.debug;

	encountersHelper.query = function(subforumName, characterId, threadId, postId, callback) {
		console.log(postId);
		debug("rolling the dice for an encounter in " + threadId);
		db.get("SELECT * FROM entities " +
			"INNER JOIN battle_stats ON battle_stats.entity_id = entities.entity_id " +
			"INNER JOIN battle_statuses ON battle_status.entity_id = entities.entity_id " +
			"INNER JOIN battles ON battles.battle_id = entities.current_battle_id " +
			"WHERE entity_id = ? AND battles.thread_id = ?", [characterId, threadId], 
			function(err, charObj) {
				if (charObj && charObj.hp <= 0) return;
				/*
				if (rows.battle_id) {
					var battle = _.pick(rows, schemas.fields.battles);
					// just use rows as entity
					encountersHelper.continueBattle(rows, battle, actions, callback);
				}
				*/
				else {
					encountersHelper.chooseEncounter(subforumName, function(err, encounter) {
						if (err) { console.log(err); callback(err); return; }
						console.log(encounter);
						if (!encounter) { callback(); return; }
						encountersHelper.startNewEncounter(characterId, threadId, postId, encounter, function(err, resObj) {
							if (err) { console.log(err); callback(err); return; }
							resObj.fields.entity = charObj;
							callback(undefined, resObj);
						});
					});
				}
			}
		);
	};

	encountersHelper.chooseEncounter = function(subforumName, callback) {
		db.all("SELECT * FROM encounters WHERE subforum_name = ?", 
			subforumName, function(err, encounters) {
				if (err) { console.log(err); callback(err); return; }
				for (var ei in encounters) {
					var chance = encounters[ei].chance;
					if (Math.random() <= chance) {
						callback(undefined, encounters[ei]);
						return;
					}
				}
				callback();
		});
	};

	encountersHelper.startNewEncounter = function(characterId, threadId, postId, encounter, callback) {
		if (encounter.species_id) {
			encountersHelper.startBattleEncounter(characterId, threadId, postId, encounter, callback);
		}
	};

	encountersHelper.startBattleEncounter = function(characterId, threadId, postId, encounter, callback) {
		db.get('SELECT species_name, species_alias FROM species WHERE species_id = ?',
			encounter.species_id, function(err, speciesObj) {
				if (err) { console.log(err); callback(err); return; }
				var speciesName = speciesObj.species_name;
				var speciesAlias = speciesObj.species_alias;
				db.run('BEGIN TRANSACTION', function(err) {
					if (err) { console.log(err); callback(err); return; }
					// first create the battle object
					console.log(postId);
					db.run('INSERT INTO battles (thread_id, first_post_id, last_post_id) VALUES (?, ?, ?)', [threadId, postId, postId], function(err) {
						if (err) { console.log(err); callback(err); return; }
						var battleId = this.lastID;
						// then create a new instance of the enemy species
						db.run('INSERT INTO entities (species_id, species_alias, current_battle_id) VALUES (?, ?, ?)',
							[encounter.species_id, speciesAlias, battleId], function(err) {
								if (err) { console.log(err); callback(err); return; }
								var enemyId = this.lastID;
								// assign it to this battle
								db.run('UPDATE entities SET current_battle_id = ? WHERE entity_id IN (?, ?)',
									[battleId, characterId, enemyId], function(err) {
										if (err) { console.log(err); callback(err); return; }
										// first turn
										db.run('INSERT INTO battle_steps (turn, step_order, action, actor_id, target_id) VALUES (1, 1, ?)', 
											["CHALLENGE", enemyId, characterId], function(err) {
											db.run('COMMIT', function(err) {
												if (err) { console.log(err); callback(err); return; }
												callback(undefined, {
													"event" : "BATTLE",
													"challenger" : enemyId,
													"species_name" : speciesName,
													"species_alias" : speciesAlias
												});
											});
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

	return encountersHelper;
};