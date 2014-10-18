module.exports = function(utils) {
	
	var _ = utils._;
	var userHelper = utils.userHelper;
	var debug = utils.debug;
	var forumHelper = utils.forumHelper;

	var forumExport = {};
	var schemas = utils.schemas;
	var schemaDefaults = schemas.defaults;
	var encountersHelper = utils.encountersHelper;

	forumExport.newThread = function(req, res) {
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			res.render("new_thread", { "subforum" : req.params.subforum });
		});
	};

	forumExport.createThread = function(req, res) {
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			var subforumName = req.params.subforum;
			forumHelper.createThreadWithPost(
				req.body["thread-alias"], 
				req.body["message-bb"],
				subforumName, 
				userObj.primary_character_id,
				userObj.primary_character.entity_name,
				function(err, results) {
					if (err) { console.log(""); res.send(""); }
					res.redirect("/forums/" + subforumName + "/" + results.thread_id);
				}
			);
		});
	};

	forumExport.createPost = function(req, res) {
		console.log("WHAT?");
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			var threadId = req.params.thread_id;
			forumHelper.createPost(req.body["message-bb"], 
				threadId,
				userObj.primary_character_id,
				userObj.primary_character.entity_name,
				function(err, results) {
					encountersHelper.query(
						req.params.subforum,
						userObj.primary_character_id, 
						threadId,
						results.post_id,
						function(err, resObj) {
							app.render("includes/post", req.body, function(err, html) {
								app.render("includes/encounter_battle_start", resObj, function(err, ehtml) {
									res.send(html + ehtml);
								});
							});
						}
					);
				}
			);
		});
	};

	forumExport.showSubforum = function(req, res) {
		userHelper.authenticate(req, res, userHelper.CHECK_ONLY | userHelper.REQUIRES_PREFERENCES, function(userObj) {
			var prefs; 
			if (userObj) prefs = userObj.preferences;
			else prefs = schemaDefaults.preferences;
			var subforumName = req.params.subforum;
			var page = req.params.page || 1;
			forumHelper.findSubforumWithThreads(subforumName, page, prefs.threads_per_page, function(err, subforumObj) {
				if (err) console.log(err);
				res.render("subforum", { "subforum" : subforumObj });
			});
		});
	};

	forumExport.showThread = function(req, res) {
		userHelper.authenticate(req, res, userHelper.CHECK_ONLY | userHelper.REQUIRES_PREFERENCES, function(userObj) {
			var prefs; 
			if (userObj) prefs = userObj.preferences;
			else prefs = schemaDefaults.preferences;
			var subforum = req.params.subforum;
			var threadId = req.params.thread_id;
			var page = req.body.page || 1;
			forumHelper.findThreadWithPosts(threadId, (page-1) * prefs.posts_per_page, prefs.posts_per_page, function(err, thread) {
				res.render("thread", { "thread" : thread });
			});
		});
	};

	return forumExport;
};