module.exports = function(utils) {
	var userHelper = {};
	var constants = utils.constants;
	var bcrypt = utils.bcrypt;
	var crypto = utils.crypto;
	var db = utils.db;
	var _ = utils._;
	var schemas = utils.schemas;
	var schemaFields = schemas.fields;
	var debug = utils.debug;
	
	var creationHelper = utils.creationHelper;

	userHelper.findByUsername = function(username, callback) {
		db.get("SELECT * FROM users WHERE username = ?", username, callback);
	};

	userHelper.findById = function(userId, callback) {
		db.get("SELECT * FROM users WHERE user_id = ?", userId, callback);
	};

	userHelper.REQUIRES_PREFERENCES = 1;
	userHelper.REQUIRES_CHARACTER = 1 << 1;
	userHelper.CHECK_ONLY = 1 << 2;

	userHelper.authenticate = function(req, res, flags, callback) {
		if (!callback) {
			callback = flags;
			flags = 0;
		}

		var requiresEntity = (flags & userHelper.REQUIRES_CHARACTER);
		var requiresPreferences = (flags & userHelper.REQUIRES_PREFERENCES);
		
		if (req.session && req.session.user_id) {

			var query = "SELECT * FROM users";
			var opts = " WHERE users.user_id = ?";
			var optArr = [req.session.user_id];

			if (requiresEntity) {
				query += " LEFT JOIN entities ON entities.user_id = users.user_id";
			}
			if (requiresPreferences) {
				query += " INNER JOIN preferences ON preferences.user_id = users.user_id";
			}

			db.all(query + opts, optArr, function(err, rows) {
				if (!rows) {
					userHelper.authFailure(req, res, flags, callback);
				}
				else {
					// 2 lazy 2 take out user fields
					var userObj = rows[0];
					if (requiresEntity) {
						userObj.entities = rows;						
						if (userObj.primary_character_id) {
							userObj.primary_character = _.findWhere(userObj.entities, { "entity_id" : userObj.primary_character_id });
						}
					}
					if (requiresPreferences) {
						// lol
						userObj.preferences = rows[0];
					}
					callback(userObj);
				}
			});
		}

		else {
			userHelper.authFailure(req, res, flags, callback);
		}
	};

	userHelper.authFailure = function(req, res, flags, callback) {
		debug("Not logged in");
		if (!(flags & userHelper.CHECK_ONLY)) {
			req.session.redirect_to = req.url;
			res.redirect("/login");
		}
		callback();
	};

	userHelper.userSignupErrors = function(username, password, confirmPassword) {
		var errors = [];
		if (!username) {
			errors.push("Username cannot be blank");
		}
		else if (!(/^[0-9a-zA-Z_.-]+$/.test(username))) {
			errors.push("Username must only consist of alphanumerical entities, _, and -");
		}
		if (confirmPassword !== password) {
			errors.push("Password and confirmation did not match");
		}
		return errors;
	};

	userHelper.createUser = function(username, password, callback) {
		bcrypt.hash(password, constants.PASSWORD_SALT_ROUNDS, function(err, hash) {
			if (err) console.log(err);
			else {
				db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
					[username, hash], function(err) {
						if (err) console.log(err);
						else {
							callback(err);
						}
					});
			}
		});
	};

	userHelper.createCharacterForUser = function(charName, userObj, callback) {
		//create entity
		db.all('SELECT * FROM species ' +
			'LEFT JOIN carriers_skills ON carriers_skills.species_id = species.species_id ' +
			'WHERE species_name = ?', "human", function(err, rows) {
				var speciesObj = rows[0];
				db.run('BEGIN TRANSACTION', function(err) {
					db.run('INSERT INTO entities (entity_name, user_id, species_id, species_alias) VALUES (?, ?, ?, ?)', 
					[charName, userObj.user_id, speciesObj.species_id, speciesObj.species_alias], function(err) {
						if (err) { console.log(err); callback(err); return; }
						else if (!userObj.primary_character_id) {
							var characterId = this.lastID;
							db.run("UPDATE users SET primary_character_id = ? WHERE user_id = ?",
								[characterId, userObj.user_id], function(err) {
									db.run('INSERT INTO outfits (user_id, entity_id, outfit_name) VALUES (?, ?, "wip")',
										[userObj.user_id, characterId], function(err) {
											var outfitId = this.lastID;
											db.run('UPDATE entities SET wip_outfit_id = ? WHERE entity_id = ?', 
												[outfitId, characterId], function(err) {
													var skillsQuery = 'INSERT INTO entities_skills (entity_id, skill_id) VALUES ';
													var skillsArgs = [];
													for (var i = 0; i < rows.length; i++) {
														if (rows[i].skill_id) {
															skillsQuery += '(?, ?) ';
															skillsArgs.push(characterId, rows[i].skill_id);
														}
													}
													db.run(skillsQuery, skillsArgs, function(err) {
														db.run("COMMIT", function(err) {
															callback();
														});	
													});
												}
											);
										}
									);
								}
							);
						}
						else {
							callback();
						}	
					});
				}
			);
		});
	};

	return userHelper;
};