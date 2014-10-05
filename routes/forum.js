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
		// userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
		// 	if (!userObj) return;
		// 	res.render("new_thread", { "subforum" : req.params.subforum });
		// });
	};

	forumExport.createThread = function(req, res) {
		// userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
		// 	if (!userObj) return;

		// 	var subforum = req.params.subforum;
		// 	var title = req.body.title;

		// 	db.run("INSERT INTO threads (title, subforum, character_id) VALUES (?, ?, ?)",
		// 		[title, subforum, userObj.primary_character_id], function(err) {
		// 			if (err) { console.log(err); res.send(""); return; }
		// 			forumExport.newPost(req, res, this.lastID);
		// 		}
		// 	);
		// });
	};

	forumExport.getThreadWithPosts = function(threadId, firstThreadIdx, callback) {
		// // get all posts on this page
		// dbThreads.col.aggregate(
		// 	{ "$match" : { "_id" : dbThreads.id(threadId) }},
		// 	{ "$unwind" : "$posts" },
		// 	{ "$skip" : firstThreadIdx },
		// 	{ "$limit" : prefs.threads_per_page },
		// function(err, postsContainer) {
		// 	// search for characters who posted. this might be excessive ...
		// 	// TODO: since character IDs are permanent, if we can relent on 
		// 	// character name changes, it should be fine to just store it
		// 	var posts = _.pluck(postsContainer, "posts");
		// 	var posterIds = _.pluck(posts, "poster_id");
		// 	var thread = postsContainer[0];
		// 	delete thread.posts;
		// 	dbUsers.find({ "_id" : { "$in" : posterIds }}, { "sort" : { "_id" : 1 }}, function(err, userObjs) {
		// 		// assign each user to its post
		// 		for (var i in posts) {
		// 			var post = posts[i];
		// 			var posterIdStr = post.poster_id.toString();
		// 			post.user = _.find(userObjs, function(u) { return u._id.toString() === posterIdStr; });
		// 		}
		// 		thread.posts = posts;
		// 		callback(err, thread);
		// 	});
		// });	
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
		userHelper.authenticate(req, res, userHelper.CHECK_ONLY, function(userObj) {
			var prefs; 
			if (userObj) prefs = userObj.preferences;
			else prefs = schemaDefaults.preferences;
			var subforumName = req.params.subforum;
			var page = req.params.page || 1;
			forumHelper.findSubforum(subforumName, page, prefs, function(err, subforumObj) {
				if (err) console.log(err); 
				res.render("subforum", { "subforum" : subforumObj });
			});
		});
	};

	forumExport.showThread = function(req, res) {
		// var subforum = req.params.subforum;
		// var threadId = req.params.thread_id;
		// var page = req.body.page || 1;
		// forumExport.getThreadWithPosts(threadId, (page-1) * prefs.postsPerThread, function(err, thread) {
		// 	res.render("thread", { "thread" : thread });
		// });
	};

	forumExport.createThread = function(req, res) {
		// userHelper.authenticate(req, res, userHelper.REQUIRES_CHARACTER, function(userObj) {
		// 	if (!userObj) return;
		// 	if (!userObj.curr_character) {
		// 		res.redirect("new_character");
		// 		return;
		// 	}
		// });
	};

	forumExport.createPost = function(req, res) {
		res.render("");
	};

	return forumExport;
};