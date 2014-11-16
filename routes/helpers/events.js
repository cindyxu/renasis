module.exports = function(utils) {

	var eventHelper = {};
	var schemas = utils.schemas;
	var _ = utils._;
	var db = utils.db;
	var debug = utils.debug;
	var battleHelper = utils.battleHelper;

	eventHelper.resolve = function(actorId, threadId, postId, event, callback) {
		if (event.context === "battle") battleHelper.resolve(actorId, threadId, postId, event, callback);
	};

	eventHelper.query = function(subforumName, characterId, threadId, postId, callback) {
		console.log(postId);
		debug("rolling the dice for an encounter in " + threadId);
		db.get("SELECT * FROM entities " +
			"INNER JOIN battle_stats ON battle_stats.entity_id = entities.entity_id " +
			"INNER JOIN battle_statuses ON battle_status.entity_id = entities.entity_id " +
			"INNER JOIN battles ON battles.battle_id = entities.current_battle_id " +
			"WHERE entity_id = ? AND battles.thread_id = ?", [characterId, threadId], 
			function(err, charObj) {
				/*
				if (rows.battle_id) {
					var battle = _.pick(rows, schemas.fields.battles);
					// just use rows as entity
					eventHelper.continueBattle(rows, battle, actions, callback);
				}
				*/
				eventHelper.chooseEncounter(subforumName, function(err, encounter) {
					if (err) { console.log(err); callback(err); return; }
					console.log(encounter);
					if (!encounter) { callback(); return; }
					eventHelper.startNewEncounter(characterId, threadId, postId, encounter, function(err, resObj) {
						if (err) { console.log(err); callback(err); return; }
						callback(undefined, resObj);
					});
				});
			}
		);
	};

	eventHelper.chooseEncounter = function(subforumName, callback) {
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

	eventHelper.startNewEncounter = function(characterId, threadId, postId, encounter, callback) {
		if (encounter.species_id) {
			battleHelper.startBattleEncounter(characterId, threadId, postId, encounter, callback);
		}
	};

	return eventHelper;
};