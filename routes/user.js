
/*
 * GET users listing.
 */


module.exports = function(utils) {

	var db = utils.db;

	var dbchars = db.get("characters");
	var dbitems = db.get("items");

	var userHelper = {};

	var userExport = {};

	userExport.dressroom = function(req, res) {

		dbchars.findOne({}, function(err, charObj) {
			res.redirect("/character/" + charObj._id + "/dressroom");
		});
	};

	return userExport;
}
