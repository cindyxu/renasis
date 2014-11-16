module.exports = function(utils) {
	
	var _ = utils._;
	var userHelper = utils.userHelper;
	var debug = utils.debug;
	var forumHelper = utils.forumHelper;

	var forumExport = {};
	var schemas = utils.schemas;
	var schemaDefaults = schemas.defaults;
	var eventHelper = utils.eventHelper;
	var battleHelper = utils.battleHelper;
	var app = utils.app;

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
		userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
			if (!userObj) return;
			var threadId = parseInt(req.params.thread_id);
			var lastPostId = parseInt(req.body["last-post-id"]);
			debug("creating post with message:", req.body["message-bb"]);
			forumHelper.createPost(req.body["message-bb"],
				threadId,
				userObj.primary_character_id,
				userObj.primary_character.entity_name,
				function(err, postObj) {
					eventHelper.resolve(
						userObj.primary_character_id, 
						threadId,
						postObj.post_id, 
						req.body.event, 
						function(err, resolved) {
							eventHelper.query(
								req.params.subforum,
								userObj.primary_character_id, 
								threadId,
								postObj.post_id,
								function(err, encountered) {
									forumHelper.findThreadWithPostsAfter(threadId, lastPostId, function(err, thread) {
										battleHelper.findUsableSkills(userObj.primary_character_id, function(err, skills) {
											var renderedHtml = "";
											var newPosts = thread.posts;
											var renderFunction = function(newPost, callback) {
												app.render("includes/post", { "post" : newPost }, function(err, html) {
													if (err) { console.log(err); return; }
													renderedHtml += html;
													callback();
												});
											};

											_.deferAll(newPosts, renderFunction, function() {
												res.send({ "postContent" : renderedHtml, "skills" : skills });
											});
										});
									});
								}
							);
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
				if (userObj) {
					battleHelper.findUsableSkills(userObj.primary_character_id, function(err, skills) {
						console.log(skills);
						res.render("thread", { "thread" : thread, "skills" : skills });
					});
				} else {
					res.render("thread", { "thread" : thread });
				}
			});
		});
	};

	return forumExport;
};