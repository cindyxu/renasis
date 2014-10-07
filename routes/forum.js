module.exports = function(utils) {
	
	var _ = utils._;
	var db = utils.sqlitedb;
	var userHelper = utils.userHelper;
	var debug = utils.debug;
	var forumHelper = utils.forumHelper;

	var forumExport = {};
	var schemas = utils.schemas;
	var schemaDefaults = schemas.defaults;

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
			var threadAlias = req.body["thread-alias"];
			
			forumHelper.createThreadWithPost(
				threadAlias, 
				subforumName, 
				req.body["post-message-bb"], 
				userObj.primary_character_id,
				userObj.primary_character.character_name,
				function(err, results) {
					res.redirect("/forums/" + subforumName + "/" + results.thread_id);
				}
			);
		});
	};

	forumExport.newPost = function(req, res, threadId) {
		// userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
		// 	if (!userObj) return;
		// 	if (!userObj.curr_character) {
		// 		res.redirect("new_character");
		// 		return;
		// 	}
		// 	var message = req.body["post-message"];
		// 	threadId = threadId || req.body.thread_id;
		// 	var currPage = req.body.page || 1;
		// 	var firstThreadIdx = Math.floor(((currPage-1) * prefs.postsPerThread + 1) / prefs.postsPerThread);
		// 	var postObj = {
		// 		"message" : message,
		// 		"poster_id" : userObj.curr_character._id,
		// 		"poster_name" : userObj.curr_character.name,
		// 	};
		// 	dbThreads.update({ "_id" : threadId }, { 
		// 		"$push" : { "posts" : postObj },
		// 		"$inc" : { "post_count" : 1 },
		// 		"$set" : { 
		// 			"last_post_at" : new Date(), 
		// 			"last_poster_id" : userObj.curr_character._id, 
		// 			"last_poster_name" : userObj.curr_character.name }
		// 	}, function(err, docs) {
		// 		forumExport.getThreadWithPosts(threadId, firstThreadIdx, function(err, thread) {
		// 			res.render("thread", { "thread" : thread });
		// 		});
		// 	});
		// });
	};

	forumExport.showSubforum = function(req, res) {
		userHelper.authenticate(req, res, userHelper.CHECK_ONLY | userHelper.REQUIRES_PREFERENCES, function(userObj) {
			var prefs; 
			if (userObj) prefs = userObj.preferences;
			else prefs = schemaDefaults.preferences;
			var subforumName = req.params.subforum;
			var page = req.params.page || 1;
			forumHelper.findSubforum(subforumName, page, prefs.threads_per_page, function(err, subforumObj) {
				if (err) console.log(err); 
				res.render("subforum", { "subforum" : subforumObj });
			});
		});
	};

	forumExport.showThread = function(req, res) {
		var subforum = req.params.subforum;
		var threadId = req.params.thread_id;
		var page = req.body.page || 1;
		forumHelper.getThreadWithPosts(threadId, (page-1) * prefs.posts_per_page, function(err, thread) {
			res.render("thread", { "thread" : thread });
		});
	};

	forumExport.createPost = function(req, res) {
		res.render("");
	};

	return forumExport;
};