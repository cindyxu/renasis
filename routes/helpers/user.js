module.exports = function(utils) {
	var userHelper = {};

	var constants = utils.constants;
	var bcrypt = utils.bcrypt;
	var db = utils.db;
	var dbUsers = db.get("users");
	var dbChars = db.get("characters");
	
	var creationHelper = utils.creationHelper;
	
	userHelper.authenticate = function(req, res, callback) {
		if (req.session && req.session.user_id) {
			dbUsers.findOne({ "_id" : req.session.user_id }, function(err, userObj) {
				if (!userObj) {
					req.session.redirect_to = req.url;
					res.redirect("/login");
				}
				callback(userObj);
			});
		}
		else {
			req.session.redirect_to = req.url;
			res.redirect("/login");
			callback();
		}
	};

	userHelper.userSignupErrors = function(username, password, confirmPassword, charName) {
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
		if (!charName) {
			errors.push("Character name cannot be blank");
		}
		console.log(errors);
		return errors;
	};

	userHelper.createCharacterForUser = function(charName, userObj, callback) {
		var charObj = creationHelper.blankCharacter();
		charObj.user_id = userObj._id;
		charObj.name = charName;

		dbChars.insert(charObj, function(err, newCharObj) {
			dbUsers.update(
				{ "username" : userObj.username }, 
				{ 
					"$push" : { "character_ids" : newCharObj._id },
					"$set" : { "curr_character" : {
						"_id" : newCharObj._id,
						"name" : newCharObj.name
					}}
				}, 
				{ "new" : true }, 
				callback
			);
		});
	};

	userHelper.createUser = function(username, password, callback) {
		bcrypt.hash(password, constants.PASSWORD_SALT_ROUNDS, function(err, hash) {
			dbUsers.findAndModify({ "username" : username },
				{ "$setOnInsert" : { 
					"password_hash" : hash, 
					"inventory" : [], 
					"character_ids" : [] }},
				{ "new": true, "upsert": true },
				callback);
		});
	};

	return userHelper;
};