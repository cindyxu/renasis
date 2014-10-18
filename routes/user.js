/*
 * GET users listing.
 */
module.exports = function(utils) {

	var db = utils.db;
	var bcrypt = utils.bcrypt;
	var constants = utils.constants;

	var userHelper = utils.userHelper;

	var userExport = {
		login: function(req, res) {
			var username = req.body.username;
			var password = req.body.password;

			userHelper.findByUsername(username, function(err, userObj) {
				if (!userObj) {
					debug.log("User not found");
					res.render("login");
					return;
				}
				bcrypt.compare(password, userObj.password_hash, function(err, passed) {
					if (passed) {
						req.session.user_id = userObj.user_id;
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
						debug.log("Bad password");
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
				res.render("signup", { "signup_errors" : errors });
				return;
			}
			userHelper.createUser(username, password, function(err) {
				if (err) {
					console.log(err);
					//HMMMM ...
					res.render("signup", { "signup_errors" : [ "Username already taken." ] });
				}
				else {
					req.session.user_id = this.lastID;
					res.redirect("new_entity");
				}
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
				if (!userObj) res.send({});
				var charName = req.body["character-name"];
				userHelper.createCharacterForUser(charName, userObj, function(err) {
					if (err) {
						console.log(err);
						res.send(err);
					} else {
						res.redirect("/dressroom");
					}
				});
			});
		}
	};

	return userExport;
};
