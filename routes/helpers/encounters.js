module.exports = function(utils) {

	var encountersExport = {};
	var schemas = utils.schemas;
	var _ = utils._;

	enountersExport.query = function(characterId, subforumName, threadId, actions, callback) {
		db.get("SELECT * FROM characters " +
			"INNER JOIN battle_stats ON battle_stats.character_id = characters.character_id " +
			"INNER JOIN battle_statuses ON battle_status.character_id = characters.character_id " +
			"INNER JOIN battles ON battles.battle_id = characters.current_battle_id " +
			"WHERE character_id = ? AND thread_id = ?", [characterId, threadId], 
			function(err, rows) {
				if (rows.hp <= 0) return;
				/*
				if (rows.battle_id) {
					var battle = _.pick(rows, schemas.fields.battles);
					// just use rows as character
					enountersExport.continueBattle(rows, battle, actions, callback);
				}
				*/
				else {
					encountersExport.chooseEncounter(subforumName, function(err, encounter) {
						if (err) { console.log(err); callback(err); return; }
						if (!encounter) { callback(); return; }
						encountersExport.startNewEncounter(characterId, threadId, encounter, function(err, resObj) {
							if (err) { console.log(err); callback(err); return; }
							resObj.fields.character = rows;
							callback(undefined, resObj);
						});
					});
				}
			}
		);
	};

	encountersExport.chooseEncounter = function(subforumName, callback) {
		db.all("SELECT * FROM encounters WHERE subforum_name = ?", 
			subforum.subforum_name, function(err, encounters) {
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

	encountersExport.startNewEncounter = function(characterId, threadId, encounter, callback) {
		if (encounter.creature_id) {
			encountersExport.startBattleEncounter(args);
		}
	};

	encountersExport.startBattleEncounter = function(characterId, threadId, encounter, callback) {
		db.get('SELECT creature_name, creature_alias FROM creature_blueprints WHERE creature_blueprint_id = ?',
			encounter.creature_blueprint_id, function(err, creatureObj) {
				if (err) { console.log(err); callback(err); return; }
				var creatureName = creatureObj.creature_name;
				var creatureAlias = creatureObj.creature_alias;
				db.run('BEGIN TRANSACTION', function(err) {
					if (err) { console.log(err); callback(err); return; }
					db.run('INSERT INTO battles (thread_id) VALUES (?)', threadId, function(err) {
						if (err) { console.log(err); callback(err); return; }
						var battleId = this.lastID;
						db.run('INSERT INTO creatures (creature_blueprint_id, creature_alias, current_battle_id) VALUES (?, ?, ?)',
							[encounter.creature_blueprint_id, creatureAlias, battleId], function(err) {
								if (err) { console.log(err); callback(err); return; }
								var creatureId = this.lastID;
								db.run('UPDATE characters SET current_battle_id = ? WHERE character_id = ?',
									[battleId, characterId], function(err) {
										if (err) { console.log(err); callback(err); return; }
										db.run('COMMIT', function(err) {
											if (err) { console.log(err); callback(err); return; }
											callback(undefined, {
												"layout" : "encounter_battle_start",
												"fields" : {
													"creature" : creatureObj
												}
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
};