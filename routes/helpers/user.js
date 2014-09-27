module.exports = function(utils) {
	var userHelper = {};

	var constants = utils.constants;
	var bcrypt = utils.bcrypt;
	var crypto = utils.crypto;
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
		console.log(errors);
		return errors;
	};

	userHelper.createUser = function(username, password, callback) {
		bcrypt.hash(password, constants.PASSWORD_SALT_ROUNDS, function(err, hash) {
			// TODO: get writeresults somehow because this is stupid
			// basically we are making sure that the userObj returned
			// is the one we tried to create - and we are checking
			// by assigning it a creation id
			var creation_id = crypto.randomBytes(20).toString('hex');
			dbUsers.findAndModify({ "username" : username },
				{ "$setOnInsert" : { 
					"creation_id" : creation_id,
					"password_hash" : hash, 
					"inventory" : [], 
					"character_ids" : [] }},
				{ "new": true, "upsert": true },
				function(err, newUserObj) {
					if (newUserObj && (newUserObj.creation_id !== creation_id)) {
						callback();
					}
					else {
						callback(err, newUserObj);
					}
				});
		});
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

	return userHelper;
};