
/*
 * GET users listing.
 */


module.exports = function(utils) {

	var db = utils.db;
	var bcrypt = utils.bcrypt;
	var constants = utils.constants;

	var dbUsers = db.get("users");
	var dbChars = db.get("characters");
	var dbItems = db.get("items");

	var userHelper = utils.userHelper;

	var userExport = {
		login: function(req, res) {
			var username = req.body.username;
			var password = req.body.password;

			dbUsers.findOne({ "username" : username }, function(err, userObj) {
				if (!userObj) {
					res.render("login");
					return;
				}
				bcrypt.compare(password, userObj.password_hash, function(err, passed) {
					if (passed) {
						req.session.user_id = userObj._id;
						if (req.session.redirect_to) {
							var redirectTo = req.session.redirect_to;
							delete req.session.redirect_to;
							res.redirect(redirectTo);
						}
						else {
							res.redirect("index");
						}
					}
					else {
						res.render("login");
					}
				});
			});
		},

		signup: function(req, res) {
			var username = req.body.username;
			var password = req.body.password;
			var confirmPassword = req.body.confirm;

			var errors = userHelper.userSignupErrors(username, password, confirmPassword);
			if (errors.length > 0) {
				console.log(errors);
				res.render("signup", { "signup_errors" : errors });
				return;
			}

			userHelper.createUser(username, password, function(err, newUserObj) {
				if (!newUserObj) {
					res.render("signup", { "signup_errors" : [ "Username already taken." ] });
				}
				res.redirect("new_character");
			});
		},

		newCharacter: function(req, res) {
			userHelper.authenticate(req, res, function(userObj) {
				if (!userObj) return;
				res.render("new_character");
			});
		},

		createCharacter: function(req, res) {
			userHelper.authenticate(req, res, function(userObj) {
				if (!userObj) return;

				var charName = req.body["character-name"];
				userHelper.createCharacterForUser(charName, newUserObj, function(err) {
					req.session.user_id = newUserObj._id;
					res.redirect("dressroom");
				});
			});
		}
	};

	return userExport;
};
