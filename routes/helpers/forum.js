module.exports = function(utils) {
	
	var _ = utils._;
	var db = utils.sqlitedb;
	var userHelper = utils.userHelper;
	var debug = utils.debug;
	var schemas = utils.schemas;

	var forumHelper = {};

	forumHelper.findSubforum = function(subforumTag, page, prefs, callback) {

		debug("fetching subforum", subforumTag);
		var tagStr;
		if (isNaN(subforumTag)) tagStr = " WHERE subforums.subforum_name = ?";
		else tagStr = " WHERE subforum_id = ?";

		db.all("SELECT * FROM subforums " +
			"INNER JOIN threads ON threads.subforum_id = subforums.subforum_id" +
			tagStr +
			" ORDER BY threads.updated_at DESC LIMIT ?, ?",
			[subforumTag, ((page-1) * prefs.threads_per_page), prefs.threads_per_page], 
			function(err, rows) {
				if (err) { console.log(err); callback(err); return; }
				if (rows && rows.length > 0) {
					var subforum = _.pick(rows[0], schemas.fields.subforums);
					subforum.threads = rows;
					callback(undefined, subforum);
				}
				else {
					db.get("SELECT * FROM subforums " + tagStr, subforumTag, callback);
				}
			}
		);
	};

	return forumHelper;
};