
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
					console.log("FAIL");
					res.send({});
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
						console.log("FAIL");
						res.send({});
					}
				});
			});
		},

		signup: function(req, res) {
			var username = req.body.username;
			var password = req.body.password;
			var confirmPassword = req.body.confirm;
			var charName = req.body["character-name"];

			var errors = userHelper.userSignupErrors(username, password, confirmPassword, charName);
			if (errors.length > 0) {
				console.log(errors);
				res.render("signup", { "signup_errors" : errors });
				return;
			}

			userHelper.createUser(username, password, function(err, newUserObj) {
				if (newUserObj.character_ids.length === 0) {
					userHelper.createCharacterForUser(charName, newUserObj, function(err) {
						req.session.user_id = newUserObj._id;
						res.redirect("dressroom");
					});
				}
				else {
					res.render("signup", { "signup_errors" : [ "Username already taken." ] });
				}
			});
		}
	};

	return userExport;
};
