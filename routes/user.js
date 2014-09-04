
/*
 * GET users listing.
 */


module.exports = function(utils) {

	var db = utils.db;

	var dbChars = db.get("characters");
	var dbItems = db.get("items");

	var userHelper = {};

	var userExport = {};

	userExport.dressroom = function(req, res) {

		dbChars.findOne({}, function(err, charObj) {
			res.redirect("/character/" + charObj._id + "/dressroom");
		});
	};

	return userExport;
}
