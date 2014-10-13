module.exports = function(utils) {
	var userHelper = {};
	var constants = utils.constants;
	var bcrypt = utils.bcrypt;
	var crypto = utils.crypto;
	var db = utils.sqlitedb;
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

	userHelper.getPrimaryOrFirstCharacter = function(userObj, callback) {
		if (userObj.primary_character_id) {
			db.get("SELECT * FROM characters WHERE character_id = ?",
				userObj.primary_character_id, callback);
		} else {
			db.get("SELECT * FROM characters WHERE user_id = ?",
				userObj.user_id, callback);
		}
	};

	userHelper.REQUIRES_PREFERENCES = 1;
	userHelper.REQUIRES_CHARACTER = 1 << 1;
	userHelper.CHECK_ONLY = 1 << 2;

	userHelper.authenticate = function(req, res, flags, callback) {
		if (!callback) {
			callback = flags;
			flags = 0;
		}

		var requiresCharacter = (flags & userHelper.REQUIRES_CHARACTER);
		var requiresPreferences = (flags & userHelper.REQUIRES_PREFERENCES);
		
		if (req.session && req.session.user_id) {

			var query = "SELECT * FROM users";
			var opts = " WHERE users.user_id = ?";
			var optArr = [req.session.user_id];

			if (requiresCharacter) {
				query += " INNER JOIN characters ON characters.user_id = users.user_id";
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
					if (requiresCharacter) {
						userObj.characters = rows;						
						if (userObj.primary_character_id) {
							userObj.primary_character = _.findWhere(userObj.characters, { "character_id" : userObj.primary_character_id });
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
			errors.push("Username must only consist of alphanumerical characters, _, and -");
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
		//create character
		db.run("INSERT INTO characters (character_name, user_id) VALUES (?, ?)", 
		[charName, userObj.user_id], function(err) {
			if (err) { console.log(err); callback(err); return; }
			else if (!userObj.primary_character_id) {
				db.run("UPDATE users SET primary_character_id = ? WHERE user_id = ?",
					[this.lastID, userObj.user_id], callback);
			}
			else {
				callback();
			}	
		});
	};

	return userHelper;
};